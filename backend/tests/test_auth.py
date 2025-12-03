"""
Tests for JWT authentication and authorization.

This module tests the Supabase JWT validation middleware including:
- Valid token verification
- Expired token rejection
- Invalid signature rejection
- Missing/malformed tokens
- Audience/issuer validation
- JWKS caching
- Role-based access control
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, Mock, patch
import httpx
from fastapi import HTTPException, status
from jose import jwt

from app.auth import (
    get_jwks,
    verify_token,
    get_current_user,
    get_current_user_optional,
    require_role,
    User,
    JWKS_CACHE_TTL,
    reset_jwks_cache,
)
from app.config import settings


# ============================================================================
# Test Fixtures
# ============================================================================


@pytest.fixture
def mock_jwks():
    """Mock JWKS (JSON Web Key Set) data."""
    return {
        "keys": [
            {
                "kid": "test-key-id",
                "kty": "RSA",
                "alg": "RS256",
                "use": "sig",
                "n": "test-modulus",
                "e": "AQAB",
            }
        ]
    }


@pytest.fixture
def valid_token_payload():
    """Valid JWT payload matching Supabase format."""
    return {
        "sub": "550e8400-e29b-41d4-a716-446655440000",  # user UUID
        "email": "test@example.com",
        "aud": "authenticated",
        "role": "authenticated",
        "iss": settings.SUPABASE_JWT_ISSUER,
        "exp": int((datetime.utcnow() + timedelta(hours=1)).timestamp()),
        "iat": int(datetime.utcnow().timestamp()),
    }


@pytest.fixture
def expired_token_payload(valid_token_payload):
    """Expired JWT payload."""
    payload = valid_token_payload.copy()
    payload["exp"] = int((datetime.utcnow() - timedelta(hours=1)).timestamp())
    return payload


@pytest.fixture
def wrong_audience_payload(valid_token_payload):
    """JWT payload with wrong audience."""
    payload = valid_token_payload.copy()
    payload["aud"] = "wrong-audience"
    return payload


@pytest.fixture
def wrong_issuer_payload(valid_token_payload):
    """JWT payload with wrong issuer."""
    payload = valid_token_payload.copy()
    payload["iss"] = "https://wrong-issuer.com"
    return payload


# ============================================================================
# Test: JWKS Fetching and Caching
# ============================================================================


@pytest.mark.asyncio
async def test_get_jwks_success(mock_jwks):
    """Test successful JWKS fetch."""
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_response = Mock()
        mock_response.json.return_value = mock_jwks
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        jwks = await get_jwks()

        assert jwks == mock_jwks
        assert "keys" in jwks
        assert len(jwks["keys"]) == 1
        mock_get.assert_called_once()


@pytest.mark.asyncio
async def test_get_jwks_caching(mock_jwks):
    """Test that JWKS is cached and not refetched within TTL."""
    # Clear cache
    import app.auth as auth_module
    auth_module._jwks_cache = None
    auth_module._jwks_cache_expires = None

    with patch("httpx.AsyncClient.get") as mock_get:
        mock_response = Mock()
        mock_response.json.return_value = mock_jwks
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        # First call should fetch from network
        jwks1 = await get_jwks()
        assert mock_get.call_count == 1

        # Second call should use cache
        jwks2 = await get_jwks()
        assert mock_get.call_count == 1  # Still 1, not 2
        assert jwks1 == jwks2


@pytest.mark.asyncio
async def test_get_jwks_network_error():
    """Test JWKS fetch failure due to network error."""
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_get.side_effect = Exception("Network error")

        with pytest.raises(HTTPException) as exc_info:
            await get_jwks()

        assert exc_info.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


@pytest.mark.asyncio
async def test_get_jwks_invalid_response():
    """Test JWKS fetch with invalid response (missing keys)."""
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_response = Mock()
        mock_response.json.return_value = {"invalid": "data"}
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        with pytest.raises(HTTPException) as exc_info:
            await get_jwks()

        assert exc_info.value.status_code == status.HTTP_503_SERVICE_UNAVAILABLE


@pytest.mark.asyncio
async def test_get_jwks_missing_configuration(monkeypatch):
    """JWKS fetch should fail fast when URL is not configured."""
    reset_jwks_cache()
    monkeypatch.setattr(settings, "SUPABASE_JWT_JWKS_URL", None)

    with pytest.raises(HTTPException) as exc_info:
        await get_jwks()

    assert exc_info.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert "not configured" in exc_info.value.detail


@pytest.mark.asyncio
async def test_get_jwks_http_error():
    """httpx.HTTPError should map to 503."""
    reset_jwks_cache()
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_get.side_effect = httpx.HTTPError("boom")
        with pytest.raises(HTTPException) as exc_info:
            await get_jwks()

    assert exc_info.value.status_code == status.HTTP_503_SERVICE_UNAVAILABLE


# ============================================================================
# Test: Token Verification
# ============================================================================


@pytest.mark.asyncio
async def test_verify_token_success(valid_token_payload, mock_jwks):
    """Test successful token verification."""
    mock_header = {"alg": "RS256", "kid": "test-key-id", "typ": "JWT"}
    with patch("app.auth.jwt.get_unverified_header", return_value=mock_header):
        with patch("app.auth.get_jwks", return_value=mock_jwks):
            with patch("app.auth.jwt.decode", return_value=valid_token_payload):
                with patch("app.auth.get_signing_key", return_value="mock-key"):
                    payload = await verify_token("valid-token")

                    assert payload == valid_token_payload
                    assert payload["sub"] == "550e8400-e29b-41d4-a716-446655440000"
                    assert payload["email"] == "test@example.com"


@pytest.mark.asyncio
async def test_verify_token_expired(mock_jwks):
    """Test token verification with expired token."""
    mock_header = {"alg": "RS256", "kid": "test-key-id", "typ": "JWT"}
    with patch("app.auth.jwt.get_unverified_header", return_value=mock_header):
        with patch("app.auth.get_jwks", return_value=mock_jwks):
            with patch("app.auth.get_signing_key", return_value="mock-key"):
                with patch("app.auth.jwt.decode", side_effect=jwt.ExpiredSignatureError("Token expired")):
                    with pytest.raises(HTTPException) as exc_info:
                        await verify_token("expired-token")

                    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
                    assert "expired" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_verify_token_wrong_audience(mock_jwks):
    """Test token verification with wrong audience."""
    mock_header = {"alg": "RS256", "kid": "test-key-id", "typ": "JWT"}
    with patch("app.auth.jwt.get_unverified_header", return_value=mock_header):
        with patch("app.auth.get_jwks", return_value=mock_jwks):
            with patch("app.auth.get_signing_key", return_value="mock-key"):
                with patch("app.auth.jwt.decode", side_effect=jwt.JWTClaimsError("Invalid audience")):
                    with pytest.raises(HTTPException) as exc_info:
                        await verify_token("wrong-audience-token")

                    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.asyncio
async def test_verify_token_no_signing_key(mock_jwks):
    """Test token verification when signing key cannot be found."""
    mock_header = {"alg": "RS256", "kid": "test-key-id", "typ": "JWT"}
    with patch("app.auth.jwt.get_unverified_header", return_value=mock_header):
        with patch("app.auth.get_jwks", return_value=mock_jwks):
            with patch("app.auth.get_signing_key", return_value=None):
                with pytest.raises(HTTPException) as exc_info:
                    await verify_token("no-key-token")

                assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
                assert "matching key" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_verify_token_jwt_error(mock_jwks):
    """Generic JWT failures should return 401."""
    mock_header = {"alg": "RS256", "kid": "test-key-id", "typ": "JWT"}
    with patch("app.auth.jwt.get_unverified_header", return_value=mock_header):
        with patch("app.auth.get_jwks", return_value=mock_jwks):
            with patch("app.auth.get_signing_key", return_value="mock-key"):
                with patch("app.auth.jwt.decode", side_effect=jwt.JWTError("boom")):
                    with pytest.raises(HTTPException) as exc_info:
                        await verify_token("invalid-token")

    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Could not validate" in exc_info.value.detail


@pytest.mark.asyncio
async def test_verify_token_unexpected_error(mock_jwks):
    """Unexpected decode errors bubble up as 500."""
    mock_header = {"alg": "RS256", "kid": "test-key-id", "typ": "JWT"}
    with patch("app.auth.jwt.get_unverified_header", return_value=mock_header):
        with patch("app.auth.get_jwks", return_value=mock_jwks):
            with patch("app.auth.get_signing_key", return_value="mock-key"):
                with patch("app.auth.jwt.decode", side_effect=RuntimeError("boom")):
                    with pytest.raises(HTTPException) as exc_info:
                        await verify_token("token")

    assert exc_info.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


# ============================================================================
# Test: get_current_user Dependency
# ============================================================================


@pytest.mark.asyncio
async def test_get_current_user_success(valid_token_payload):
    """Test successful user extraction from valid token."""
    mock_credentials = Mock()
    mock_credentials.credentials = "valid-token"

    with patch("app.auth.verify_token", return_value=valid_token_payload):
        user = await get_current_user(mock_credentials)

        assert isinstance(user, User)
        assert user.id == "550e8400-e29b-41d4-a716-446655440000"
        assert user.email == "test@example.com"
        assert user.role == "authenticated"
        assert user.aud == "authenticated"


@pytest.mark.asyncio
async def test_get_current_user_missing_sub():
    """Test user extraction when token is missing 'sub' claim."""
    mock_credentials = Mock()
    mock_credentials.credentials = "invalid-token"

    invalid_payload = {
        "email": "test@example.com",
        "aud": "authenticated",
        # Missing 'sub'
    }

    with patch("app.auth.verify_token", return_value=invalid_payload):
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(mock_credentials)

    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert "sub" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_get_current_user_invalid_token():
    """Test user extraction with invalid token."""
    mock_credentials = Mock()
    mock_credentials.credentials = "invalid-token"

    with patch("app.auth.verify_token", side_effect=HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid token"
    )):
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(mock_credentials)

        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED


# ============================================================================
# Test: get_current_user_optional Dependency
# ============================================================================


@pytest.mark.asyncio
async def test_get_current_user_optional_with_token(valid_token_payload):
    """Test optional auth with valid token."""
    mock_credentials = Mock()
    mock_credentials.credentials = "valid-token"

    with patch("app.auth.verify_token", return_value=valid_token_payload):
        user = await get_current_user_optional(mock_credentials)

        assert user is not None
        assert isinstance(user, User)
        assert user.email == "test@example.com"


@pytest.mark.asyncio
async def test_get_current_user_optional_without_token():
    """Test optional auth without token (returns None)."""
    user = await get_current_user_optional(None)
    assert user is None


@pytest.mark.asyncio
async def test_get_current_user_optional_invalid_token():
    """Test optional auth with invalid token (raises error)."""
    mock_credentials = Mock()
    mock_credentials.credentials = "invalid-token"

    with patch("app.auth.verify_token", side_effect=HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid token"
    )):
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user_optional(mock_credentials)

        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED


# ============================================================================
# Test: Role-Based Access Control
# ============================================================================


@pytest.mark.asyncio
async def test_require_role_success():
    """Test role requirement when user has correct role."""
    admin_user = User(
        id="test-id",
        email="admin@example.com",
        aud="authenticated",
        role="admin",
    )

    check_admin = require_role("admin", "moderator")

    # Mock get_current_user to return admin user
    with patch("app.auth.get_current_user", return_value=admin_user):
        result = await check_admin(admin_user)
        assert result == admin_user


@pytest.mark.asyncio
async def test_require_role_forbidden():
    """Test role requirement when user lacks required role."""
    regular_user = User(
        id="test-id",
        email="user@example.com",
        aud="authenticated",
        role="authenticated",
    )

    check_admin = require_role("admin")

    with pytest.raises(HTTPException) as exc_info:
        await check_admin(regular_user)

    assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
    assert "not authorized" in exc_info.value.detail.lower()


# ============================================================================
# Test: User Model
# ============================================================================


def test_user_creation():
    """Test User model creation."""
    user = User(
        id="test-id",
        email="test@example.com",
        aud="authenticated",
        role="authenticated",
        metadata={"custom": "data"},
    )

    assert user.id == "test-id"
    assert user.email == "test@example.com"
    assert user.aud == "authenticated"
    assert user.role == "authenticated"
    assert user.metadata == {"custom": "data"}


def test_user_repr():
    """Test User string representation."""
    user = User(
        id="test-id",
        email="test@example.com",
        aud="authenticated",
    )

    assert "test-id" in repr(user)
    assert "test@example.com" in repr(user)
    assert "authenticated" in repr(user)
@pytest.fixture(autouse=True)
def _reset_jwks_cache():
    """Ensure JWKS cache is cleared between tests to avoid cross-test leakage."""
    reset_jwks_cache()
