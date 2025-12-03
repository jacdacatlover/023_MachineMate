#!/usr/bin/env python3
"""
Diagnostic script to analyze JWT tokens from the mobile app.

Usage:
1. Copy a JWT token from the mobile app's Authorization header
2. Run: python debug_jwt.py "<paste_token_here>"
"""

import sys
import json
from datetime import datetime
from jose import jwt
import base64

def decode_token_parts(token):
    """Decode and display JWT parts without verification."""
    parts = token.split('.')
    if len(parts) != 3:
        print(f"❌ Invalid JWT format: Expected 3 parts, got {len(parts)}")
        return None

    # Decode header
    try:
        header = json.loads(base64.urlsafe_b64decode(parts[0] + '=='))
        print("\n📋 TOKEN HEADER:")
        print(json.dumps(header, indent=2))
    except Exception as e:
        print(f"❌ Failed to decode header: {e}")
        return None

    # Decode payload
    try:
        payload = json.loads(base64.urlsafe_b64decode(parts[1] + '=='))
        print("\n📋 TOKEN PAYLOAD (Claims):")
        print(json.dumps(payload, indent=2, default=str))

        # Highlight key fields
        print("\n🔍 KEY FIELDS:")
        print(f"  - Algorithm: {header.get('alg', 'NOT FOUND')}")
        print(f"  - Key ID (kid): {header.get('kid', 'NOT FOUND - using HS256')}")
        print(f"  - Audience (aud): {payload.get('aud', 'NOT FOUND')}")
        print(f"  - Issuer (iss): {payload.get('iss', 'NOT FOUND')}")
        print(f"  - Subject (sub): {payload.get('sub', 'NOT FOUND')}")
        print(f"  - Email: {payload.get('email', 'NOT FOUND')}")

        # Check expiration
        if 'exp' in payload:
            exp_time = datetime.fromtimestamp(payload['exp'])
            now = datetime.now()
            if exp_time > now:
                print(f"  - Token expires: {exp_time} (valid for {exp_time - now})")
            else:
                print(f"  - Token expired: {exp_time} (expired {now - exp_time} ago)")

        return payload
    except Exception as e:
        print(f"❌ Failed to decode payload: {e}")
        return None

def verify_with_secret(token, secret, audience, issuer):
    """Attempt to verify token with provided secret."""
    print(f"\n🔐 ATTEMPTING HS256 VERIFICATION:")
    print(f"  - Expected audience: {audience}")
    print(f"  - Expected issuer: {issuer}")
    print(f"  - Secret length: {len(secret)} chars")

    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience=audience,
            issuer=issuer,
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_aud": True,
                "verify_iss": True,
            }
        )
        print("✅ TOKEN VERIFICATION SUCCESSFUL!")
        return payload
    except jwt.ExpiredSignatureError as e:
        print(f"❌ Token expired: {e}")
    except jwt.JWTClaimsError as e:
        print(f"❌ Invalid claims: {e}")
        print("    This is likely the issue causing 'Token verification failed'")
    except jwt.JWTError as e:
        print(f"❌ JWT verification failed: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

    return None

def main():
    # Load settings from .env
    import os
    from pathlib import Path
    from dotenv import load_dotenv

    env_path = Path(__file__).parent / '.env'
    load_dotenv(env_path)

    # Get configuration
    JWT_SECRET = os.getenv('SUPABASE_JWT_SECRET')
    JWT_AUDIENCE = os.getenv('SUPABASE_JWT_AUDIENCE', 'authenticated')
    JWT_ISSUER = os.getenv('SUPABASE_JWT_ISSUER')

    print("=" * 60)
    print("JWT TOKEN DIAGNOSTIC TOOL")
    print("=" * 60)

    if len(sys.argv) > 1:
        token = sys.argv[1].strip()
        if token.startswith('Bearer '):
            token = token[7:]
    else:
        print("\n📝 Paste the JWT token (or 'Bearer <token>') and press Enter:")
        token = input().strip()
        if token.startswith('Bearer '):
            token = token[7:]

    if not token:
        print("❌ No token provided")
        return

    print(f"\n📊 Token length: {len(token)} chars")

    # Decode without verification
    payload = decode_token_parts(token)

    if payload and JWT_SECRET:
        # Try to verify with backend settings
        print("\n" + "=" * 60)
        print("BACKEND VERIFICATION TEST")
        print("=" * 60)
        verify_with_secret(token, JWT_SECRET, JWT_AUDIENCE, JWT_ISSUER)

    # Compare with expected values
    if payload:
        print("\n" + "=" * 60)
        print("CONFIGURATION CHECK")
        print("=" * 60)
        print(f"Token audience: '{payload.get('aud')}' | Backend expects: '{JWT_AUDIENCE}'")
        if payload.get('aud') != JWT_AUDIENCE:
            print("  ❌ MISMATCH - This will cause verification to fail!")
        else:
            print("  ✅ Match")

        print(f"Token issuer: '{payload.get('iss')}' | Backend expects: '{JWT_ISSUER}'")
        if payload.get('iss') != JWT_ISSUER:
            print("  ❌ MISMATCH - This will cause verification to fail!")
        else:
            print("  ✅ Match")

if __name__ == "__main__":
    main()