import requests
from app.core.config import settings

PLAID_BASE_URL = {
    "sandbox": "https://sandbox.plaid.com",
    "development": "https://development.plaid.com",
    "production": "https://production.plaid.com"
}[settings.PLAID_ENV]

def create_link_token(user_id: str) -> dict:
    url = f"{PLAID_BASE_URL}/link/token/create"
    payload = {
        "client_id": settings.PLAID_CLIENT_ID,
        "secret": settings.PLAID_SECRET,
        "client_name": "Wise Wallet",
        "user": {"client_user_id": user_id},
        "products": ["transactions"],
        "country_codes": ["US"],
        "language": "en"
    }
    response = requests.post(url, json=payload)
    return response.json()

def exchange_public_token(public_token: str) -> dict:
    url = f"{PLAID_BASE_URL}/item/public_token/exchange"
    payload = {
        "client_id": settings.PLAID_CLIENT_ID,
        "secret": settings.PLAID_SECRET,
        "public_token": public_token
    }
    response = requests.post(url, json=payload)
    return response.json()
