import os
import stripe
from uuid import uuid4
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from app.core.config import settings

stripe.api_key = settings.STRIPE_SECRET_KEY
stripe.api_version = "2024-06-20"  # pin for stability

router = APIRouter()

# Whitelist prices you actually sell (server trust boundary)
ALLOWED_PRICES = {
    "pro_monthly": os.getenv("STRIPE_PRICE_PRO_MONTHLY"),
    "pro_yearly":  os.getenv("STRIPE_PRICE_PRO_YEARLY"),
}
ENABLE_AUTOMATIC_TAX = os.getenv("STRIPE_ENABLE_AUTOMATIC_TAX", "false").lower() == "true"

class CheckoutSessionRequest(BaseModel):
    # accept a logical plan key, not the raw Stripe price
    plan: str

@router.post("/create-checkout-session")
async def create_checkout_session(req: CheckoutSessionRequest):
    price_id = ALLOWED_PRICES.get(req.plan)
    if not price_id:
        raise HTTPException(status_code=400, detail="Invalid plan")

    try:
        def create_session():
            return stripe.checkout.Session.create(
                mode="subscription",
                line_items=[{"price": price_id, "quantity": 1}],
                success_url=f"{settings.FRONTEND_URL}/upgrade?success=true&session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{settings.FRONTEND_URL}/upgrade?canceled=true",
                allow_promotion_codes=True,
                **({"automatic_tax": {"enabled": True}} if ENABLE_AUTOMATIC_TAX else {}),
                idempotency_key=str(uuid4()),
            )

        session = await run_in_threadpool(create_session)
        return {"sessionId": session["id"]}  # for redirectToCheckout
        # Or: return {"url": session["url"]} for server-redirect style
    except stripe.error.StripeError as e:
        # Surface Stripe’s message but hide internals
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=e.user_message or str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create checkout session")
