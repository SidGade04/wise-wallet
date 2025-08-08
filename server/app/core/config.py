# app/core/config.py
import os
from dataclasses import dataclass
from dotenv import load_dotenv, find_dotenv

# Load .env from the closest location (project root / server/.env, etc.)
load_dotenv(find_dotenv())

@dataclass
class Settings:
    # Plaid
    PLAID_CLIENT_ID: str | None = os.getenv("PLAID_CLIENT_ID")
    PLAID_SECRET: str | None = os.getenv("PLAID_SECRET")
    PLAID_ENV: str = os.getenv("PLAID_ENV", "sandbox")

    # Stripe (SECRET key must be sk_... and live on the server only)
    STRIPE_SECRET_KEY: str | None = os.getenv("STRIPE_SECRET_KEY")

    # Frontend URL for success/cancel redirects
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:8080")

settings = Settings()

# Fail fast if critical secrets are missing
if not settings.STRIPE_SECRET_KEY:
    raise RuntimeError(
        "STRIPE_SECRET_KEY is not set. Put it in your server .env (sk_test_...) "
        "and restart the FastAPI server."
    )
