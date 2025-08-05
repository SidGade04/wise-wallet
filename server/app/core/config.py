import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PLAID_CLIENT_ID: str = os.getenv("PLAID_CLIENT_ID")
    PLAID_SECRET: str = os.getenv("PLAID_SECRET")
    PLAID_ENV: str = os.getenv("PLAID_ENV", "sandbox")

settings = Settings()
