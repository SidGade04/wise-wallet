"""
Pydantic models for Stripe API with enhanced fields.
"""

from pydantic import BaseModel
from typing import Optional, Dict, Any
from enum import Enum


class SubscriptionPlan(str, Enum):
    pro_monthly = "pro_monthly"
    pro_yearly = "pro_yearly"


class CheckoutSessionRequest(BaseModel):
    plan: SubscriptionPlan


class SubscriptionStatus(BaseModel):
    is_pro: bool
    subscription_status: Optional[str] = None
    current_period_end: Optional[str] = None


class WebhookEvent(BaseModel):
    event_type: str
    data: Dict[str, Any]


class CheckoutSessionResponse(BaseModel):
    sessionId: str


class SubscriptionUpdateData(BaseModel):
    is_pro: bool
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    subscription_status: Optional[str] = None
    subscription_current_period_end: Optional[str] = None


class DebugWebhookRequest(BaseModel):
    event_type: str
    event_data: Dict[str, Any]


class DebugResponse(BaseModel):
    user_id: str
    email: Optional[str] = None
    subscription_data: Dict[str, Any]
    timestamp: str
    current_user_keys: Optional[list] = None


class ProfileDebugResponse(BaseModel):
    user_id: str
    profile_data: Dict[str, Any]
    current_user_data: Dict[str, Any]