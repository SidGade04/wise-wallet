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
from plaid.model.investments_holdings_get_request import InvestmentsHoldingsGetRequest
from plaid.model.investments_transactions_get_request import InvestmentsTransactionsGetRequest
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

    async def get_investment_holdings(self, user_id: str, item_id: str) -> Dict[str, Any]:
        """Fetch investment holdings for a specific item and store them."""
        try:
            result = self.supabase.table("bank_items").select("access_token").eq("item_id", item_id).eq("user_id", user_id).execute()
            if not result.data:
                raise Exception("Item not found or access denied")

            access_token = result.data[0]["access_token"]
            request = InvestmentsHoldingsGetRequest(access_token=access_token)
            response = self.plaid_client.investments_holdings_get(request)

            securities = {s.security_id: s for s in response.securities}
            holdings = []
            total_value = 0.0

            for h in response.holdings:
                sec = securities.get(h.security_id)
                price = float(h.institution_price) if h.institution_price else None
                value = float(h.institution_value) if h.institution_value else (
                    (price or 0) * float(h.quantity)
                )
                holding_data = {
                    "user_id": user_id,
                    "account_id": h.account_id,
                    "security_id": h.security_id,
                    "ticker": getattr(sec, "ticker", None),
                    "quantity": float(h.quantity),
                    "price": price,
                    "value": value,
                    "cost_basis": float(h.cost_basis) if h.cost_basis else None,
                }
                self.supabase.table("investment_holdings").upsert(
                    holding_data,
                    on_conflict="security_id,account_id"
                ).execute()

                holdings.append({
                    "security_id": h.security_id,
                    "account_id": h.account_id,
                    "ticker": getattr(sec, "ticker", None),
                    "name": getattr(sec, "name", None),
                    "quantity": float(h.quantity),
                    "price": price,
                    "value": value,
                })
                total_value += value or 0

            return {"holdings": holdings, "total_value": total_value}

        except Exception as e:
            logger.error(f"Error fetching investment holdings: {str(e)}")
            raise

    async def get_investment_transactions(self, user_id: str, item_id: str, days: int = 30) -> Dict[str, Any]:
        """Fetch investment transactions for a specific item and store them."""
        try:
            result = self.supabase.table("bank_items").select("access_token").eq("item_id", item_id).eq("user_id", user_id).execute()
            if not result.data:
                raise Exception("Item not found or access denied")

            access_token = result.data[0]["access_token"]
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=days)

            request = InvestmentsTransactionsGetRequest(
                access_token=access_token,
                start_date=start_date,
                end_date=end_date,
            )
            response = self.plaid_client.investments_transactions_get(request)

            securities = {s.security_id: s for s in response.securities}
            transactions = []
            for t in response.investment_transactions:
                sec = securities.get(t.security_id) if t.security_id else None
                txn_data = {
                    "user_id": user_id,
                    "account_id": t.account_id,
                    "security_id": t.security_id,
                    "investment_transaction_id": t.investment_transaction_id,
                    "ticker": getattr(sec, "ticker", None),
                    "date": t.date.isoformat(),
                    "type": t.type,
                    "quantity": float(t.quantity) if t.quantity else None,
                    "price": float(t.price) if t.price else None,
                    "amount": float(t.amount),
                    "fees": float(t.fees) if t.fees else None,
                }
                self.supabase.table("investment_transactions").upsert(
                    txn_data,
                    on_conflict="investment_transaction_id"
                ).execute()

                transactions.append({
                    "investment_transaction_id": t.investment_transaction_id,
                    "account_id": t.account_id,
                    "security_id": t.security_id,
                    "ticker": getattr(sec, "ticker", None),
                    "name": getattr(sec, "name", None),
                    "type": t.type,
                    "date": t.date.isoformat(),
                    "quantity": float(t.quantity) if t.quantity else None,
                    "price": float(t.price) if t.price else None,
                    "amount": float(t.amount),
                    "fees": float(t.fees) if t.fees else None,
                })

            return {"transactions": transactions}

        except Exception as e:
            logger.error(f"Error fetching investment transactions: {str(e)}")
            raise

