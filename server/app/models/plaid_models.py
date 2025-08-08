# app/services/plaid_service.py
"""
Business logic for Plaid operations.
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
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
from plaid.exceptions import ApiException
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class PlaidService:
    """Service class for Plaid operations."""
    
    def __init__(self):
        # Plaid configuration
        self.client_id = os.getenv('PLAID_CLIENT_ID')
        self.secret = os.getenv('PLAID_SECRET')
        self.env = os.getenv('PLAID_ENV', 'production')
        
        # Supabase configuration
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_PUBLISHABLE_KEY")
        
        # Initialize clients
        self._setup_plaid_client()
        self._setup_supabase_client()
    
    def _setup_plaid_client(self):
        """Setup Plaid API client."""
        environments = {
            'sandbox': 'https://sandbox.plaid.com',
            'development': 'https://development.plaid.com',
            'production': 'https://production.plaid.com'
        }
        
        if self.env not in environments:
            raise ValueError(f"Invalid PLAID_ENV: {self.env}")
        
        configuration = Configuration(
            host=environments[self.env],
            api_key={
                'clientId': self.client_id,
                'secret': self.secret
            }
        )
        
        api_client = ApiClient(configuration)
        self.plaid_client = plaid_api.PlaidApi(api_client)
    
    def _setup_supabase_client(self):
        """Setup Supabase client."""
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
    
    async def create_link_token(self, user_id: str, client_name: str = "Plaid Integration App") -> Dict[str, Any]:
        """Create a link token for Plaid Link initialization."""
        try:
            request = LinkTokenCreateRequest(
                products=[Products('transactions'), Products('auth')],
                client_name=client_name,
                country_codes=[CountryCode('US')],
                language='en',
                user=LinkTokenCreateRequestUser(client_user_id=user_id)
            )
            
            response = self.plaid_client.link_token_create(request)
            
            return {
                "link_token": response.link_token,
                "expiration": response.expiration.isoformat()
            }
        except Exception as e:
            logger.error(f"Error creating link token: {str(e)}")
            raise
    
    async def exchange_public_token(self, public_token: str, user_id: str, metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """Exchange public token for access token and store bank item."""
        try:
            # Exchange token with Plaid
            exchange_request = ItemPublicTokenExchangeRequest(public_token=public_token)
            response = self.plaid_client.item_public_token_exchange(exchange_request)
            
            # Extract institution info from metadata
            institution_info = metadata.get('institution', {}) if metadata else {}
            institution_id = institution_info.get('institution_id')
            institution_name = institution_info.get('name', 'Unknown Bank')
            
            # Store bank item
            bank_item_data = {
                "user_id": user_id,
                "access_token": response.access_token,
                "item_id": response.item_id,
                "institution_id": institution_id,
                "institution_name": institution_name,
                "status": "good",
                "created_at": datetime.utcnow().isoformat(),
                "last_synced_at": datetime.utcnow().isoformat()
            }
            
            result = self.supabase.table("bank_items").insert(bank_item_data).execute()
            
            if not result.data:
                raise Exception("Failed to store bank item in database")
            
            # Store accounts
            await self._store_accounts(response.access_token, response.item_id, user_id)
            
            # Store initial transactions
            await self._sync_transactions(response.item_id, response.access_token, user_id)
            
            return {
                "access_token": response.access_token,
                "item_id": response.item_id,
                "institution_name": institution_name,
                "message": "Successfully exchanged public token"
            }
            
        except Exception as e:
            logger.error(f"Error exchanging public token: {str(e)}")
            raise
    
    async def _store_accounts(self, access_token: str, item_id: str, user_id: str):
        """Store accounts for an item."""
        try:
            accounts_request = AccountsGetRequest(access_token=access_token)
            response = self.plaid_client.accounts_get(accounts_request)
            
            for account in response.accounts:
                account_data = {
                    "account_id": account.account_id,
                    "item_id": item_id,
                    "user_id": user_id,
                    "name": account.name,
                    "type": str(account.type),
                    "subtype": str(account.subtype) if account.subtype else None,
                    "balance_current": float(account.balances.current) if account.balances.current else None,
                    "balance_available": float(account.balances.available) if account.balances.available else None,
                    "currency_code": account.balances.iso_currency_code or 'USD',
                    "created_at": datetime.utcnow().isoformat()
                }
                
                self.supabase.table("accounts").insert(account_data).execute()
                
        except Exception as e:
            logger.warning(f"Could not store accounts: {str(e)}")
    
    async def _sync_transactions(self, item_id: str, access_token: str, user_id: str, days: int = 30) -> int:
        """Sync transactions for an item."""
        try:
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=days)
            
            transactions_request = TransactionsGetRequest(
                access_token=access_token,
                start_date=start_date,
                end_date=end_date
            )
            
            response = self.plaid_client.transactions_get(transactions_request)
            
            transaction_count = 0
            for txn in response.transactions:
                transaction_data = {
                    "transaction_id": txn.transaction_id,
                    "account_id": txn.account_id,
                    "item_id": item_id,
                    "user_id": user_id,
                    "amount": float(txn.amount),
                    "date": txn.date.isoformat(),
                    "name": txn.name,
                    "merchant_name": txn.merchant_name,
                    "category": txn.category or [],
                    "category_id": txn.category_id,
                    "payment_channel": txn.payment_channel,
                    "pending": txn.pending,
                    "currency_code": txn.iso_currency_code or 'USD',
                    "created_at": datetime.utcnow().isoformat()
                }
                
                # Use upsert to handle duplicates
                result = self.supabase.table("transactions").upsert(
                    transaction_data, 
                    on_conflict="transaction_id"
                ).execute()
                
                if result.data:
                    transaction_count += 1
            
            # Update last synced timestamp
            self.supabase.table("bank_items").update({
                "last_synced_at": datetime.utcnow().isoformat(),
                "status": "good"
            }).eq("item_id", item_id).eq("user_id", user_id).execute()
            
            return transaction_count
            
        except Exception as e:
            logger.error(f"Error syncing transactions: {str(e)}")
            
            # Update error status
            self.supabase.table("bank_items").update({
                "status": "error",
                "error_message": str(e)
            }).eq("item_id", item_id).eq("user_id", user_id).execute()
            
            raise
    
    async def get_user_bank_accounts(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all bank accounts for a user."""
        try:
            result = self.supabase.table("bank_items").select("*").eq("user_id", user_id).execute()
            items = result.data or []
            
            all_accounts = []
            for item in items:
                try:
                    access_token = item["access_token"]
                    accounts_request = AccountsGetRequest(access_token=access_token)
                    response = self.plaid_client.accounts_get(accounts_request)
                    
                    for account in response.accounts:
                        all_accounts.append({
                            "account_id": account.account_id,
                            "item_id": item["item_id"],
                            "institution_name": item.get("institution_name", "Unknown"),
                            "name": account.name,
                            "type": str(account.type),
                            "subtype": str(account.subtype) if account.subtype else None,
                            "balance": float(account.balances.current or 0),
                            "last_synced_at": item.get("last_synced_at"),
                            "status": item.get("status", "unknown")
                        })
                except Exception as e:
                    logger.warning(f"Could not fetch accounts for item {item['item_id']}: {str(e)}")
                    continue
            
            return all_accounts
            
        except Exception as e:
            logger.error(f"Error fetching user bank accounts: {str(e)}")
            raise
    
    async def get_user_transactions(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        """Get all transactions for a user."""
        try:
            result = self.supabase.table("bank_items").select("*").eq("user_id", user_id).execute()
            items = result.data or []
            
            all_transactions = []
            for item in items:
                try:
                    access_token = item["access_token"]
                    start_date = (datetime.now() - timedelta(days=days)).date()
                    end_date = datetime.now().date()
                    
                    transactions_request = TransactionsGetRequest(
                        access_token=access_token,
                        start_date=start_date,
                        end_date=end_date
                    )
                    
                    response = self.plaid_client.transactions_get(transactions_request)
                    
                    for txn in response.transactions:
                        all_transactions.append({
                            "transaction_id": txn.transaction_id,
                            "account_id": txn.account_id,
                            "amount": float(txn.amount),
                            "date": txn.date.isoformat(),
                            "name": txn.name,
                            "category": txn.category or [],
                            "merchant_name": txn.merchant_name,
                            "pending": txn.pending,
                            "payment_channel": txn.payment_channel,
                            "iso_currency_code": txn.iso_currency_code,
                        })
                        
                except ApiException as e:
                    if "PRODUCT_NOT_READY" in str(e.body):
                        logger.warning(f"Transactions not ready for item {item['item_id']}")
                        continue
                    logger.error(f"Error fetching transactions for item {item['item_id']}: {e}")
                    continue
                except Exception as e:
                    logger.error(f"Unexpected error for item {item['item_id']}: {e}")
                    continue
            
            return {
                "transactions": all_transactions,
                "total_transactions": len(all_transactions)
            }
            
        except Exception as e:
            logger.error(f"Error fetching user transactions: {str(e)}")
            raise
    
    async def sync_item_transactions(self, user_id: str, item_id: str) -> Dict[str, Any]:
        """Manually sync transactions for a specific item."""
        try:
            # Get the bank item
            result = self.supabase.table("bank_items").select("access_token").eq("item_id", item_id).eq("user_id", user_id).execute()
            
            if not result.data:
                raise Exception("Item not found or access denied")
            
            access_token = result.data[0]["access_token"]
            
            # Sync transactions
            transaction_count = await self._sync_transactions(item_id, access_token, user_id)
            
            return {
                "message": f"Successfully synced {transaction_count} transactions",
                "transaction_count": transaction_count
            }
            
        except Exception as e:
            logger.error(f"Error syncing item {item_id}: {str(e)}")
            raise
    
    async def remove_bank_item(self, user_id: str, item_id: str) -> Dict[str, str]:
        """Remove a bank item and all associated data."""
        try:
            # Verify ownership
            result = self.supabase.table("bank_items").select("item_id").eq("item_id", item_id).eq("user_id", user_id).execute()
            
            if not result.data:
                raise Exception("Item not found or access denied")
            
            # Delete related data (order matters due to foreign keys)
            self.supabase.table("transactions").delete().eq("item_id", item_id).eq("user_id", user_id).execute()
            self.supabase.table("accounts").delete().eq("item_id", item_id).eq("user_id", user_id).execute()
            self.supabase.table("bank_items").delete().eq("item_id", item_id).eq("user_id", user_id).execute()
            
            return {"message": "Bank item removed successfully"}
            
        except Exception as e:
            logger.error(f"Error removing item {item_id}: {str(e)}")
            raise


# app/core/auth.py
"""
Authentication utilities.
"""

import jwt
import logging
from typing import Dict, Any
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os

logger = logging.getLogger(__name__)
security = HTTPBearer()


def verify_jwt_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """Verify JWT token and extract user information."""
    try:
        token = credentials.credentials
        
        # Decode JWT token
        payload = jwt.decode(
            token, 
            os.getenv("SUPABASE_JWT_SECRET"), 
            algorithms=["HS256"],
            audience="authenticated"
        )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user ID"
            )
            
        return {
            "user_id": user_id,
            "email": payload.get("email"),
            "role": payload.get("role", "authenticated")
        }
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )


async def get_current_user(user_info: Dict[str, Any] = Depends(verify_jwt_token)) -> Dict[str, Any]:
    """Get current authenticated user."""
    return user_info


def verify_user_access(current_user_id: str, requested_user_id: str):
    """Verify that user can only access their own data."""
    if current_user_id != requested_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Can only access your own data"
        )


# app/models/plaid_models.py
"""
Pydantic models for Plaid API.
"""

from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from enum import Enum


class LinkTokenRequest(BaseModel):
    user_id: str
    client_name: str = "Plaid Integration App"


class PublicTokenExchangeRequest(BaseModel):
    public_token: str
    metadata: Optional[Dict[str, Any]] = None


class ItemInfo(BaseModel):
    access_token: str
    item_id: str
    institution_id: Optional[str] = None
    institution_name: Optional[str] = None


class AccountInfo(BaseModel):
    account_id: str
    name: str
    type: str
    subtype: Optional[str] = None
    balance: float
    item_id: Optional[str] = None
    institution_name: Optional[str] = None
    last_synced_at: Optional[str] = None
    status: Optional[str] = None


class TransactionInfo(BaseModel):
    transaction_id: str
    account_id: str
    amount: float
    date: str
    name: str
    category: List[str] = []
    merchant_name: Optional[str] = None
    pending: bool = False
    payment_channel: Optional[str] = None
    iso_currency_code: Optional[str] = None


class AccountType(str, Enum):
    depository = "depository"
    credit = "credit"
    loan = "loan"
    investment = "investment"
    brokerage = "brokerage"
    other = "other"


class AccountSubtype(str, Enum):
    checking = "checking"
    savings = "savings"
    credit_card = "credit card"