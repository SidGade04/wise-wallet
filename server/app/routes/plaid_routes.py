from fastapi import APIRouter, Depends, HTTPException, status
import logging
from typing import Dict, Any

from plaid.model.investments_holdings_get_request import InvestmentsHoldingsGetRequest
from plaid.model.investments_transactions_get_request import InvestmentsTransactionsGetRequest
from ..services.plaid_service import PlaidService
from ..core.auth import get_current_user, verify_user_access
from ..models.plaid_models import LinkTokenRequest, PublicTokenExchangeRequest

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize service
plaid_service = PlaidService()


@router.post("/create_link_token")
async def create_link_token(
    request: LinkTokenRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a link token for Plaid Link initialization."""
    try:
        user_id = current_user["user_id"]
        result = await plaid_service.create_link_token(user_id, request.client_name)
        return result
    except Exception as e:
        logger.error(f"Error creating link token: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create link token: {str(e)}")


@router.post("/exchange_public_token")
async def exchange_public_token(
    payload: PublicTokenExchangeRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Exchange public token for access token and store bank item."""
    try:
        user_id = current_user["user_id"]
        result = await plaid_service.exchange_public_token(
            payload.public_token, 
            user_id, 
            payload.metadata
        )
        return result
    except Exception as e:
        logger.error(f"Error exchanging public token: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to exchange public token: {str(e)}")


@router.get("/accounts/user/{user_id}")
async def get_accounts_by_user(
    user_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get all accounts for a user."""
    try:
        verify_user_access(current_user["user_id"], user_id)
        accounts = await plaid_service.get_user_bank_accounts(user_id)
        return {"accounts": accounts}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user accounts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch accounts: {str(e)}")


@router.get("/user_transactions/{user_id}")
async def get_user_transactions(
    user_id: str,
    days: int = 30,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get all transactions for a user."""
    try:
        verify_user_access(current_user["user_id"], user_id)
        result = await plaid_service.get_user_transactions(user_id, days)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user transactions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch transactions: {str(e)}")


@router.post("/sync/{item_id}")
async def sync_item_transactions(
    item_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Manually sync transactions for a specific item."""
    try:
        user_id = current_user["user_id"]
        result = await plaid_service.sync_item_transactions(user_id, item_id)
        return result
    except Exception as e:
        logger.error(f"Error syncing item {item_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to sync transactions: {str(e)}")


@router.delete("/remove/{item_id}")
async def remove_bank_item(
    item_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Remove a bank item and all associated data."""
    try:
        user_id = current_user["user_id"]
        result = await plaid_service.remove_bank_item(user_id, item_id)
        return result
    except Exception as e:
        logger.error(f"Error removing item {item_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to remove bank item: {str(e)}")


@router.get("/debug/auth")
async def debug_auth(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Debug endpoint to check authentication."""
    from datetime import datetime
    return {
        "user_id": current_user["user_id"],
        "email": current_user.get("email"),
        "role": current_user.get("role"),
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/investments/{item_id}/holdings")
async def get_investment_holdings(item_id: str):
    """Get investment holdings for a specific item"""
    try:
        if item_id not in user_items:
            raise HTTPException(status_code=404, detail="Item not found")

        access_token = user_items[item_id]["access_token"]

        holdings_request = InvestmentsHoldingsGetRequest(access_token=access_token)
        response = client.investments_holdings_get(holdings_request)

        securities = {s.security_id: s for s in response.securities}

        holdings = []
        total_value = 0.0
        for h in response.holdings:
            security = securities.get(h.security_id)
            price = float(h.institution_price) if h.institution_price else None
            value = float(h.institution_value) if h.institution_value else (
                (price or 0) * float(h.quantity)
            )
            holdings.append(
                HoldingInfo(
                    security_id=h.security_id,
                    account_id=h.account_id,
                    ticker=getattr(security, "ticker", None),
                    name=getattr(security, "name", None),
                    quantity=float(h.quantity),
                    price=price,
                    value=value,
                )
            )
            total_value += value or 0.0

        return {"holdings": holdings, "total_value": total_value}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching investment holdings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch holdings: {str(e)}")


@router.get("/investments/{item_id}/transactions")
async def get_investment_transactions(item_id: str, days: int = 30):
    """Get investment transactions for a specific item"""
    try:
        if item_id not in user_items:
            raise HTTPException(status_code=404, detail="Item not found")

        access_token = user_items[item_id]["access_token"]

        start_date = (datetime.now() - timedelta(days=days)).date()
        end_date = datetime.now().date()

        transactions_request = InvestmentsTransactionsGetRequest(
            access_token=access_token,
            start_date=start_date,
            end_date=end_date,
        )

        response = client.investments_transactions_get(transactions_request)

        securities = {s.security_id: s for s in response.securities}

        transactions = []
        for t in response.investment_transactions:
            security = securities.get(t.security_id) if t.security_id else None
            transactions.append(
                InvestmentTransactionInfo(
                    investment_transaction_id=t.investment_transaction_id,
                    account_id=t.account_id,
                    security_id=t.security_id,
                    ticker=getattr(security, "ticker", None),
                    name=getattr(security, "name", None),
                    type=t.type,
                    date=t.date.isoformat(),
                    quantity=float(t.quantity) if t.quantity else None,
                    price=float(t.price) if t.price else None,
                    amount=float(t.amount),
                    fees=float(t.fees) if t.fees else None,
                )
            )

        return {"transactions": transactions}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching investment transactions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch investment transactions: {str(e)}")