"""
Tests for security utilities (bcrypt hashing, JWT tokens).
"""
from datetime import timedelta
import pytest
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)


def test_password_hashing_and_verification():
    password = "SuperSecretPassword123!"
    hashed = hash_password(password)

    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_jwt_token_creation_and_decoding():
    payload = {"sub": "user_123", "role": "admin"}
    token = create_access_token(payload, expires_delta=timedelta(minutes=15))

    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "user_123"
    assert decoded["role"] == "admin"
    assert "exp" in decoded


def test_expired_jwt_token():
    payload = {"sub": "user_expired"}
    # Token expired 10 minutes ago
    token = create_access_token(payload, expires_delta=timedelta(minutes=-10))

    decoded = decode_access_token(token)
    assert decoded is None


def test_invalid_jwt_token():
    decoded = decode_access_token("not.a.valid.jwt.token")
    assert decoded is None
