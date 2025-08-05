from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from plaid.api import plaid_api
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.country_code import CountryCode
from plaid.model.products import Products
from plaid.configuration import Configuration
from plaid.api_client import ApiClient
import os
from datetime import datetime, timedelta
from typing import List, Optional
import logging
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

router = APIRouter()

# Plaid configuration
PLAID_CLIENT_ID = os.getenv('PLAID_CLIENT_ID')
PLAID_SECRET = os.getenv('PLAID_SECRET')
PLAID_ENV = os.getenv('PLAID_ENV', 'production')

# Debug: Print environment variables (remove in production)
print(f"PLAID_CLIENT_ID: {PLAID_CLIENT_ID}")
print(f"PLAID_SECRET: {'*' * len(PLAID_SECRET) if PLAID_SECRET else None}")
print(f"PLAID_ENV: {PLAID_ENV}")

if not PLAID_CLIENT_ID or not PLAID_SECRET:
    raise ValueError("PLAID_CLIENT_ID and PLAID_SECRET environment variables are required")

# Map environment names to Plaid host URLs
PLAID_ENVIRONMENTS = {
    'sandbox': 'https://sandbox.plaid.com',
    'development': 'https://development.plaid.com',
    'production': 'https://production.plaid.com'
}

# Get the host URL for the environment
if PLAID_ENV not in PLAID_ENVIRONMENTS:
    raise ValueError(f"Invalid PLAID_ENV: {PLAID_ENV}. Must be one of: {list(PLAID_ENVIRONMENTS.keys())}")

host_url = PLAID_ENVIRONMENTS[PLAID_ENV]

# Configure Plaid client
configuration = Configuration(
    host=host_url,
    api_key={
        'clientId': PLAID_CLIENT_ID,
        'secret': PLAID_SECRET
    }
)

api_client = ApiClient(configuration)
client = plaid_api.PlaidApi(api_client)

# Pydantic models
class LinkTokenRequest(BaseModel):
    user_id: str
    client_name: str = "Plaid Integration App"

class PublicTokenExchangeRequest(BaseModel):
    public_token: str

class ItemInfo(BaseModel):
    access_token: str
    item_id: str

class AccountInfo(BaseModel):
    account_id: str
    name: str
    type: str
    subtype: Optional[str]
    balance: float

class TransactionInfo(BaseModel):
    transaction_id: str
    account_id: str
    amount: float
    date: str
    name: str
    category: List[str]

# In-memory storage (replace with database in production)
user_items = {}

@router.post("/create_link_token")
async def create_link_token(request: LinkTokenRequest):
    """Create a link token for Plaid Link initialization"""
    try:
        link_request = LinkTokenCreateRequest(
            products=[Products('transactions'), Products('auth')],
            client_name=request.client_name,
            country_codes=[CountryCode('US')],
            language='en',
            user=LinkTokenCreateRequestUser(client_user_id=request.user_id)
        )
        
        response = client.link_token_create(link_request)
        
        return {
            "link_token": response.link_token,
            "expiration": response.expiration.isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error creating link token: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create link token: {str(e)}")

@router.post("/exchange_public_token")
async def exchange_public_token(request: PublicTokenExchangeRequest):
    """Exchange public token for access token"""
    try:
        exchange_request = ItemPublicTokenExchangeRequest(
            public_token=request.public_token
        )
        
        response = client.item_public_token_exchange(exchange_request)
        
        # Store the access token and item ID (in production, store in database)
        item_info = {
            "access_token": response.access_token,
            "item_id": response.item_id
        }
        
        # For demo purposes, we'll use item_id as key
        user_items[response.item_id] = item_info
        
        return {
            "access_token": response.access_token,
            "item_id": response.item_id,
            "message": "Successfully exchanged public token"
        }
    
    except Exception as e:
        logger.error(f"Error exchanging public token: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to exchange public token: {str(e)}")

@router.get("/accounts/{item_id}")
async def get_accounts(item_id: str):
    """Get accounts for a specific item"""
    try:
        if item_id not in user_items:
            raise HTTPException(status_code=404, detail="Item not found")
        
        access_token = user_items[item_id]["access_token"]
        
        accounts_request = AccountsGetRequest(access_token=access_token)
        response = client.accounts_get(accounts_request)
        
        accounts = []
        for account in response.accounts:
            accounts.append(AccountInfo(
                account_id=account.account_id,
                name=account.name,
                type=account.type,
                subtype=account.subtype,
                balance=float(account.balances.current or 0)
            ))
        
        return {"accounts": accounts}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching accounts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch accounts: {str(e)}")

@router.get("/transactions/{item_id}")
async def get_transactions(item_id: str, days: int = 30):
    """Get transactions for a specific item"""
    try:
        if item_id not in user_items:
            raise HTTPException(status_code=404, detail="Item not found")
        
        access_token = user_items[item_id]["access_token"]
        
        # Get transactions for the last 30 days
        start_date = (datetime.now() - timedelta(days=days)).date()
        end_date = datetime.now().date()
        
        transactions_request = TransactionsGetRequest(
            access_token=access_token,
            start_date=start_date,
            end_date=end_date
        )
        
        response = client.transactions_get(transactions_request)
        
        transactions = []
        for transaction in response.transactions:
            transactions.append(TransactionInfo(
                transaction_id=transaction.transaction_id,
                account_id=transaction.account_id,
                amount=float(transaction.amount),
                date=transaction.date.isoformat(),
                name=transaction.name,
                category=transaction.category or []
            ))
        
        return {
            "transactions": transactions,
            "total_transactions": response.total_transactions
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching transactions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch transactions: {str(e)}")

@router.get("/items")
async def get_all_items():
    """Get all stored items (for demo purposes)"""
    return {"items": list(user_items.keys())}

@router.delete("/items/{item_id}")
async def delete_item(item_id: str):
    """Delete an item from storage"""
    if item_id in user_items:
        del user_items[item_id]
        return {"message": f"Item {item_id} deleted successfully"}
    else:
        raise HTTPException(status_code=404, detail="Item not found")