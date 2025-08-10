"""
Stripe payment routes with enhanced debugging.
"""

import logging
import json
from fastapi import APIRouter, HTTPException, status, Request, Depends
from typing import Dict, Any

from app.core.auth import get_current_user
from app.services.stripe_service import StripeService
from app.models.stripe_models import (
    CheckoutSessionRequest, 
    CheckoutSessionResponse, 
    SubscriptionStatus
)

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize service
stripe_service = StripeService()


@router.post("/create-checkout-session", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    request: CheckoutSessionRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a Stripe checkout session."""
    try:
        user_id = current_user["user_id"]
        logger.info(f"Creating checkout session for user: {user_id}, plan: {request.plan}")
        
        # Get user's profile to get email
        profile = await stripe_service.get_user_profile(user_id)
        user_email = profile['email']
        
        logger.info(f"User profile retrieved: email={user_email}")
        
        # Create checkout session
        result = await stripe_service.create_checkout_session(
            request.plan, user_id, user_email
        )
        
        logger.info(f"Checkout session created: {result}")
        return CheckoutSessionResponse(**result)
        
    except ValueError as e:
        logger.error(f"ValueError creating checkout session: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating checkout session: {str(e)}")
        import traceback
        logger.error(f"Checkout session traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Simple webhook: payment success = user becomes pro."""
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    
    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")

    try:
        event = stripe_service.verify_webhook_signature(payload, sig_header)
        
        success = False
        if event['type'] == 'checkout.session.completed':
            logger.info(f"Payment completed for session: {event['data']['object']['id']}")
            success = await stripe_service.handle_checkout_completed(event['data']['object'])
        else:
            logger.info(f"Unhandled event type: {event['type']}")
            success = True
        
        if not success:
            raise HTTPException(status_code=500, detail="Error processing webhook")
            
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        raise HTTPException(status_code=500, detail="Error processing webhook")


@router.get("/subscription/status", response_model=SubscriptionStatus)
async def get_subscription_status(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Simple check: is user pro?"""
    try:
        user_id = current_user["user_id"]
        result = await stripe_service.get_subscription_status(user_id)
        return SubscriptionStatus(**result)
        
    except Exception as e:
        logger.error(f"Error fetching subscription status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/debug/subscription")
async def debug_subscription(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Debug endpoint to check subscription status."""
    from datetime import datetime
    
    try:
        user_id = current_user["user_id"]
        logger.info(f"Debug endpoint called for user: {user_id}")
        
        subscription_data = await stripe_service.get_subscription_status(user_id)
        
        debug_info = {
            "user_id": user_id,
            "email": current_user.get("email"),
            "subscription_data": subscription_data,
            "timestamp": datetime.utcnow().isoformat(),
            "current_user_keys": list(current_user.keys())
        }
        
        logger.info(f"Debug info: {debug_info}")
        return debug_info
        
    except Exception as e:
        logger.error(f"Error in debug endpoint: {str(e)}")
        import traceback
        logger.error(f"Debug endpoint traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/debug/test-webhook")
async def test_webhook_processing(
    request: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Test webhook processing with mock data (for debugging purposes)."""
    try:
        logger.info("Testing webhook processing with mock data")
        
        event_type = request.get("event_type")
        event_data = request.get("event_data")
        
        if not event_type or not event_data:
            raise HTTPException(status_code=400, detail="event_type and event_data required")
        
        result = await stripe_service.debug_webhook_processing(event_type, event_data)
        return result
        
    except Exception as e:
        logger.error(f"Error in test webhook: {str(e)}")
        import traceback
        logger.error(f"Test webhook traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/debug/profile")
async def debug_profile(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Debug endpoint to check user profile."""
    try:
        user_id = current_user["user_id"]
        logger.info(f"Debug profile endpoint called for user: {user_id}")
        
        profile_data = await stripe_service.get_user_profile(user_id)
        
        debug_info = {
            "user_id": user_id,
            "profile_data": profile_data,
            "current_user_data": current_user
        }
        
        logger.info(f"Profile debug info: {debug_info}")
        return debug_info
        
    except Exception as e:
        logger.error(f"Error in debug profile endpoint: {str(e)}")
        import traceback
        logger.error(f"Debug profile traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))