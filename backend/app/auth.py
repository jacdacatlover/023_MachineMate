"""
JWT Authentication and Authorization for Supabase.

This module provides middleware and dependencies for validating Supabase JWTs
in FastAPI endpoints. It uses JWKS (JSON Web Key Set) for token verification
with caching to minimize network requests.

Usage in FastAPI endpoints:
    @app.get("/protected")
    async def protected_route(user: User = Depends(get_current_user)):
        return {"user_id": user.id, "email": user.email}

For optional authentication:
    @app.get("/optional")
    async def optional_route(user: Optional[User] = Depends(get_current_user_optional)):
        if user:
            return {"authenticated": True, "user_id": user.id}
        return {"authenticated": False}
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Optional
from functools import lru_cache

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, jwk
from jose.utils import base64url_decode
import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# HTTP Bearer token scheme
security = HTTPBearer()

# Global cache for JWKS (refreshed periodically)
_jwks_cache: Optional[dict] = None
_jwks_cache_expires: Optional[datetime] = None
JWKS_CACHE_TTL = timedelta(minutes=15)  # Cache JWKS for 15 minutes


class User:
    """
    Represents an authenticated user from Supabase.

    Attributes:
        id: Supabase user UUID
        email: User email address
        aud: JWT audience (usually 'authenticated')
        role: User role (e.g., 'authenticated', 'anon')
        metadata: Additional user metadata from JWT claims
    """

    def __init__(
        self,
        id: str,
        email: str,
        aud: str,
        role: str = "authenticated",
        metadata: Optional[dict] = None,
    ):
        self.id = id
        self.email = email
        self.aud = aud
        self.role = role
        self.metadata = metadata or {}

    def __repr__(self) -> str:
        return f"User(id={self.id}, email={self.email}, role={self.role})"


async def get_jwks() -> dict:
    """
    Fetch JWKS (JSON Web Key Set) from Supabase with caching.

    The JWKS contains the public keys used to verify JWT signatures.
    Results are cached for JWKS_CACHE_TTL to minimize network requests.

    Returns:
        dict: JWKS data with keys array

    Raises:
        HTTPException: If JWKS cannot be fetched or is invalid
    """
    global _jwks_cache, _jwks_cache_expires

    # Return cached JWKS if still valid
    if _jwks_cache and _jwks_cache_expires and datetime.utcnow() < _jwks_cache_expires:
        logger.debug("Using cached JWKS")
        return _jwks_cache

    jwks_url = settings.SUPABASE_JWT_JWKS_URL
    if not jwks_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_JWT_JWKS_URL not configured",
        )

    try:
        # Supabase JWKS endpoint requires an API key in headers
        headers = {}
        if settings.SUPABASE_SERVICE_ROLE_KEY:
            headers["apikey"] = settings.SUPABASE_SERVICE_ROLE_KEY

        async with httpx.AsyncClient() as client:
            response = await client.get(jwks_url, headers=headers, timeout=10.0)
            response.raise_for_status()
            jwks_data = response.json()

            # Validate JWKS structure
            if "keys" not in jwks_data or not jwks_data["keys"]:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Invalid JWKS payload received from Supabase",
                )

            # Update cache
            _jwks_cache = jwks_data
            _jwks_cache_expires = datetime.utcnow() + JWKS_CACHE_TTL

            logger.info(
                "JWKS fetched successfully",
                extra={"keys_count": len(jwks_data["keys"]), "cache_ttl_seconds": JWKS_CACHE_TTL.total_seconds()},
            )

            return jwks_data

    except httpx.HTTPError as exc:
        logger.error(f"Failed to fetch JWKS from {jwks_url}: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unable to fetch JWKS for token verification: {str(exc)}",
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Unexpected error fetching JWKS: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"JWKS fetch failed: {str(exc)}",
        )


def get_signing_key(token: str, jwks_data: dict) -> Optional[str]:
    """
    Extract the signing key from JWKS matching the token's kid (key ID).

    Args:
        token: JWT token string
        jwks_data: JWKS data containing public keys

    Returns:
        str: PEM-encoded signing key, or None if not found

    Raises:
        JWTError: If token header is invalid
    """
    try:
        # Decode token header to get key ID (kid)
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        if not kid:
            logger.warning("Token missing 'kid' in header")
            return None

        # Find matching key in JWKS
        for key in jwks_data.get("keys", []):
            if key.get("kid") == kid:
                # Convert JWK to PEM
                return jwk.construct(key).to_pem().decode("utf-8")

        logger.warning(f"No matching key found for kid: {kid}")
        return None

    except JWTError as exc:
        logger.error(f"Failed to get signing key: {exc}")
        return None


async def verify_token(token: str) -> dict:
    """
    Verify and decode a Supabase JWT token.

    Validates:
    - Token signature using JWKS (RS256) or JWT secret (HS256)
    - Token expiration
    - Issuer (iss) matches Supabase project
    - Audience (aud) is 'authenticated'

    Args:
        token: JWT token string

    Returns:
        dict: Decoded token payload with user claims

    Raises:
        HTTPException: If token is invalid, expired, or verification fails
    """
    try:
        # Inspect the JWT header to determine the algorithm
        try:
            unverified_header = jwt.get_unverified_header(token)
            algorithm = unverified_header.get("alg", "").upper()

            logger.debug(
                "JWT header inspection",
                extra={
                    "algorithm": algorithm,
                    "kid": unverified_header.get("kid"),
                    "typ": unverified_header.get("typ"),
                },
            )
        except JWTError as exc:
            logger.error(f"Failed to decode JWT header: {exc}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token format",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Handle RS256 algorithm with JWKS
        if algorithm == "RS256":
            if not settings.SUPABASE_JWT_JWKS_URL:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Token requires RS256 verification but JWKS URL not configured",
                )

            # Fetch JWKS for signature verification
            jwks_data = await get_jwks()

            # Get signing key matching token's kid
            signing_key = get_signing_key(token, jwks_data)
            if not signing_key:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="No matching key found in JWKS for token verification",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            # Verify and decode token using RS256
            payload = jwt.decode(
                token,
                signing_key,
                algorithms=["RS256"],
                audience=settings.SUPABASE_JWT_AUDIENCE,
                issuer=settings.SUPABASE_JWT_ISSUER,
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_aud": True,
                    "verify_iss": True,
                    "require_exp": True,
                    "require_aud": True,
                    "require_iss": True,
                },
            )

            logger.debug(
                "Token verified successfully using RS256",
                extra={"user_id": payload.get("sub"), "email": payload.get("email")},
            )

            return payload

        # Handle HS256 algorithm with JWT secret
        elif algorithm == "HS256":
            if not settings.SUPABASE_JWT_SECRET:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Token requires HS256 verification but JWT secret not configured",
                )

            # Log verification attempt details
            logger.info(
                "Attempting HS256 JWT verification",
                extra={
                    "audience_expected": settings.SUPABASE_JWT_AUDIENCE,
                    "issuer_expected": settings.SUPABASE_JWT_ISSUER,
                    "has_secret": bool(settings.SUPABASE_JWT_SECRET),
                },
            )

            # Verify and decode token using HS256
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience=settings.SUPABASE_JWT_AUDIENCE,
                issuer=settings.SUPABASE_JWT_ISSUER,
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_aud": True,
                    "verify_iss": True,
                    "require_exp": True,
                    "require_aud": True,
                    "require_iss": True,
                },
            )

            logger.debug(
                "Token verified successfully using HS256",
                extra={"user_id": payload.get("sub"), "email": payload.get("email")},
            )

            return payload

        # Unsupported algorithm
        else:
            logger.error(f"Unsupported JWT algorithm: {algorithm}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Unsupported JWT algorithm: {algorithm}",
                headers={"WWW-Authenticate": "Bearer"},
            )

    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )

    except jwt.JWTClaimsError as exc:
        logger.error(f"JWT claims verification failed: {exc}", exc_info=True)
        logger.error(
            "Token verification failed with JWTClaimsError",
            extra={
                "error_type": type(exc).__name__,
                "error_message": str(exc),
                "audience_expected": settings.SUPABASE_JWT_AUDIENCE,
                "issuer_expected": settings.SUPABASE_JWT_ISSUER,
            },
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token claims: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    except JWTError as exc:
        logger.error(f"JWT verification failed with JWTError: {exc}", exc_info=True)
        logger.error(
            "Token verification failed with generic JWTError",
            extra={
                "error_type": type(exc).__name__,
                "error_message": str(exc),
            },
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    except HTTPException:
        raise

    except Exception as exc:
        logger.error(f"Unexpected error during token verification: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token verification failed: {str(exc)}",
        )


def reset_jwks_cache() -> None:
    """
    Clear cached JWKS data (primarily for test isolation).
    """
    global _jwks_cache, _jwks_cache_expires
    _jwks_cache = None
    _jwks_cache_expires = None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    """
    FastAPI dependency to get the current authenticated user.

    Extracts and verifies the JWT token from the Authorization header,
    then returns a User object with the authenticated user's information.

    Usage:
        @app.get("/protected")
        async def protected_route(user: User = Depends(get_current_user)):
            return {"user_id": user.id, "email": user.email}

    Args:
        credentials: HTTP Bearer token from Authorization header

    Returns:
        User: Authenticated user object

    Raises:
        HTTPException: If authentication fails
    """
    token = credentials.credentials
    payload = await verify_token(token)

    # Extract user information from token payload
    user_id = payload.get("sub")
    email = payload.get("email")
    aud = payload.get("aud")
    role = payload.get("role", "authenticated")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user ID (sub claim)",
        )

    # Create User object
    user = User(
        id=user_id,
        email=email or "",
        aud=aud or settings.SUPABASE_JWT_AUDIENCE,
        role=role,
        metadata=payload,
    )

    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
) -> Optional[User]:
    """
    FastAPI dependency for optional authentication.

    Similar to get_current_user but returns None instead of raising
    an exception if no token is provided. Still validates the token
    if one is present.

    Usage:
        @app.get("/optional")
        async def optional_route(user: Optional[User] = Depends(get_current_user_optional)):
            if user:
                return {"authenticated": True, "user_id": user.id}
            return {"authenticated": False}

    Args:
        credentials: Optional HTTP Bearer token from Authorization header

    Returns:
        User | None: Authenticated user object or None if no token provided

    Raises:
        HTTPException: If token is provided but invalid
    """
    if not credentials:
        return None

    return await get_current_user(credentials)


def require_role(*allowed_roles: str):
    """
    Dependency factory for role-based access control.

    Creates a dependency that checks if the authenticated user has
    one of the allowed roles.

    Usage:
        @app.get("/admin")
        async def admin_route(user: User = Depends(require_role("admin", "moderator"))):
            return {"message": "Admin access granted"}

    Args:
        *allowed_roles: Variable number of allowed role names

    Returns:
        Callable: FastAPI dependency function
    """

    async def check_role(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role}' not authorized. Required: {allowed_roles}",
            )
        return user

    return check_role
