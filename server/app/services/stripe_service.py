"""
Enhanced Stripe service with improved payment success handling.
"""

import os
import stripe
import logging
from uuid import uuid4
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from supabase import create_client, Client
from dotenv import load_dotenv

from app.core.config import settings

load_dotenv()
logger = logging.getLogger(__name__)


class StripeService:
    """Enhanced service class for Stripe operations."""
    
    def __init__(self):
        # Stripe configuration
        stripe.api_key = settings.STRIPE_SECRET_KEY
        stripe.api_version = "2024-06-20"
        
        # Supabase configuration
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Use service role for admin operations
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("Missing Supabase configuration")
        
        # Initialize Supabase client with service role key for admin operations
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        
        # Allowed prices (server trust boundary)
        self.allowed_prices = {
            "pro_monthly": os.getenv("STRIPE_PRICE_PRO_MONTHLY"),
            "pro_yearly": os.getenv("STRIPE_PRICE_PRO_YEARLY"),
        }
        
        self.enable_automatic_tax = os.getenv("STRIPE_ENABLE_AUTOMATIC_TAX", "false").lower() == "true"
        self.webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    
    async def create_checkout_session(
        self, 
        plan: str, 
        user_id: str, 
        user_email: str
    ) -> Dict[str, str]:
        """Create a Stripe checkout session."""
        price_id = self.allowed_prices.get(plan)
        if not price_id:
            raise ValueError(f"Invalid plan: {plan}")
        
        logger.info(f"Creating checkout session for user {user_id}, plan {plan}, price {price_id}")
        
        try:
            session = stripe.checkout.Session.create(
                mode="subscription",
                line_items=[{"price": price_id, "quantity": 1}],
                success_url=f"{settings.FRONTEND_URL}/upgrade?success=true&session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{settings.FRONTEND_URL}/upgrade?canceled=true",
                allow_promotion_codes=True,
                customer_email=user_email,
                metadata={
                    "user_id": str(user_id),
                    "user_email": user_email,
                    "plan": plan
                },
                **({"automatic_tax": {"enabled": True}} if self.enable_automatic_tax else {}),
                idempotency_key=str(uuid4()),
            )
            
            logger.info(f"✅ Checkout session created: {session['id']}")
            return {"sessionId": session["id"]}
            
        except stripe.error.StripeError as e:
            logger.error(f"❌ Stripe error creating checkout session: {e}")
            raise Exception(e.user_message or str(e))
        except Exception as e:
            logger.error(f"❌ Error creating checkout session: {e}")
            raise Exception("Failed to create checkout session")
    
    def verify_webhook_signature(self, payload: bytes, sig_header: str) -> Dict[str, Any]:
        """Verify webhook signature and return event."""
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, self.webhook_secret
            )
            logger.info(f"✅ Webhook signature verified for event: {event['type']}")
            return event
        except ValueError as e:
            logger.error(f"❌ Invalid payload: {e}")
            raise ValueError("Invalid payload")
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"❌ Invalid signature: {e}")
            raise ValueError("Invalid signature")
    
    async def handle_checkout_completed(self, session: Dict[str, Any]) -> bool:
        """Enhanced payment success handling with comprehensive logging."""
        try:
            session_id = session.get('id')
            metadata = session.get('metadata', {})
            user_id = metadata.get('user_id')
            user_email = metadata.get('user_email')
            plan = metadata.get('plan')
            
            logger.info(f"🎉 Processing payment success for session: {session_id}")
            logger.info(f"User ID: {user_id}, Email: {user_email}, Plan: {plan}")
            
            if not user_id:
                logger.error("❌ No user_id in session metadata")
                return False
            
            # Get the subscription details from Stripe
            subscription_id = session.get('subscription')
            customer_id = session.get('customer')
            
            logger.info(f"Stripe subscription ID: {subscription_id}")
            logger.info(f"Stripe customer ID: {customer_id}")
            
            # Prepare update data
            update_data = {
                'is_pro': True,
                'stripe_customer_id': customer_id,
                'stripe_subscription_id': subscription_id,
                'subscription_status': 'active',
                'subscription_current_period_end': None,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            
            # If we have subscription details, get the period end
            if subscription_id:
                try:
                    subscription = stripe.Subscription.retrieve(subscription_id)
                    period_end = datetime.fromtimestamp(
                        subscription.current_period_end, tz=timezone.utc
                    ).isoformat()
                    update_data['subscription_current_period_end'] = period_end
                    logger.info(f"Subscription period ends: {period_end}")
                except Exception as e:
                    logger.warning(f"Could not retrieve subscription details: {e}")
            
            # Update the user's profile
            logger.info(f"Updating profile for user {user_id} with data: {update_data}")
            
            result = self.supabase.table('profiles').update(update_data).eq('user_id', user_id).execute()
            
            logger.info(f"Database update result: {result}")
            
            if result.data and len(result.data) > 0:
                logger.info(f"✅ Successfully upgraded user {user_id} to PRO")
                logger.info(f"Updated profile: {result.data[0]}")
                
                # Verify the update worked
                verification = self.supabase.table('profiles').select('is_pro, stripe_customer_id').eq('user_id', user_id).single().execute()
                logger.info(f"Verification check: {verification.data}")
                
                return True
            else:
                logger.error(f"❌ No rows updated for user {user_id}. Profile may not exist.")
                
                # Try to find the profile to debug
                profile_check = self.supabase.table('profiles').select('*').eq('user_id', user_id).execute()
                logger.info(f"Profile check result: {profile_check.data}")
                
                return False
                
        except Exception as e:
            logger.error(f"❌ Error in payment success handler: {e}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            return False
    
    async def handle_subscription_updated(self, subscription: Dict[str, Any]) -> bool:
        """Handle subscription updates with enhanced logging."""
        try:
            subscription_id = subscription['id']
            status_value = subscription['status']
            current_period_end = datetime.fromtimestamp(
                subscription.get('current_period_end', 0), tz=timezone.utc
            ).isoformat()
            
            logger.info(f"📝 Updating subscription {subscription_id} to status: {status_value}")
            
            # Determine if user should be pro based on subscription status
            is_pro = status_value in ['active', 'trialing']
            
            update_data = {
                'subscription_status': status_value,
                'subscription_current_period_end': current_period_end,
                'is_pro': is_pro,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            
            result = self.supabase.table('profiles').update(update_data).eq('stripe_subscription_id', subscription_id).execute()
            
            logger.info(f"Subscription update result: {result}")
            
            if result.data and len(result.data) > 0:
                logger.info(f"✅ Updated subscription status to {status_value} for subscription: {subscription_id}")
                return True
            else:
                logger.error(f"❌ No rows updated for subscription: {subscription_id}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error handling subscription updated: {e}")
            import traceback
            logger.error(f"Subscription update traceback: {traceback.format_exc()}")
            return False
    
    async def handle_subscription_deleted(self, subscription: Dict[str, Any]) -> bool:
        """Handle subscription cancellation with enhanced logging."""
        try:
            subscription_id = subscription['id']
            
            logger.info(f"🚫 Canceling subscription: {subscription_id}")
            
            update_data = {
                'is_pro': False,
                'subscription_status': 'canceled',
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            
            result = self.supabase.table('profiles').update(update_data).eq('stripe_subscription_id', subscription_id).execute()
            
            logger.info(f"Subscription cancellation result: {result}")
            
            if result.data and len(result.data) > 0:
                logger.info(f"✅ Canceled pro status for subscription: {subscription_id}")
                return True
            else:
                logger.error(f"❌ No rows updated for subscription cancellation: {subscription_id}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error handling subscription deleted: {e}")
            import traceback
            logger.error(f"Subscription deletion traceback: {traceback.format_exc()}")
            return False
    
    async def get_subscription_status(self, user_id: str) -> Dict[str, Any]:
        """Get subscription status with enhanced error handling."""
        try:
            logger.info(f"🔍 Checking subscription status for user: {user_id}")
            
            result = self.supabase.table('profiles').select('is_pro, subscription_status, stripe_customer_id, stripe_subscription_id').eq('user_id', user_id).single().execute()
            
            if not result.data:
                logger.error(f"❌ Profile not found for user: {user_id}")
                raise Exception("Profile not found")
            
            is_pro = result.data.get('is_pro', False)
            logger.info(f"✅ User {user_id} pro status: {is_pro}")
            logger.info(f"Full profile data: {result.data}")
            
            return {
                "is_pro": True,  # or False
                "status": "active",  # active, canceled, past_due, etc.
                "current_period_end": "2024-12-15T00:00:00Z",  # ISO date string
                "plan_name": "Pro Plan",
                "cancel_at_period_end": False
            }
            
        except Exception as e:
            # logger.error(f"❌ Error fetching subscription status for {user_id}: {e}")
            # import traceback
            # logger.error(f"Get subscription status traceback: {traceback.format_exc()}")
            # raise Exception("Error fetching subscription status")
            return {"is_pro": False}    
    
    async def get_user_profile(self, user_id: str) -> Dict[str, Any]:
        """Get user profile including email with enhanced logging."""
        try:
            logger.info(f"👤 Fetching user profile for: {user_id}")
            
            result = self.supabase.table('profiles').select('email, full_name, is_pro').eq('user_id', user_id).single().execute()
            
            logger.info(f"User profile query result: {result}")
            
            if not result.data:
                logger.error(f"❌ No profile found for user: {user_id}")
                raise Exception("User profile not found")
                
            logger.info(f"✅ Profile found: {result.data}")
            return result.data
            
        except Exception as e:
            logger.error(f"❌ Error fetching user profile: {e}")
            import traceback
            logger.error(f"Get user profile traceback: {traceback.format_exc()}")
            raise Exception("Failed to get user profile")
    
    async def debug_webhook_processing(self, event_type: str, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Debug method to test webhook processing without actual webhooks."""
        logger.info(f"🧪 Debug processing event: {event_type}")
        logger.info(f"Event data: {event_data}")
        
        try:
            if event_type == 'checkout.session.completed':
                success = await self.handle_checkout_completed(event_data)
                return {"event_type": event_type, "success": success, "message": "Checkout session processed"}
            elif event_type == 'customer.subscription.updated':
                success = await self.handle_subscription_updated(event_data)
                return {"event_type": event_type, "success": success, "message": "Subscription updated"}
            elif event_type == 'customer.subscription.deleted':
                success = await self.handle_subscription_deleted(event_data)
                return {"event_type": event_type, "success": success, "message": "Subscription deleted"}
            else:
                return {"event_type": event_type, "success": False, "message": "Unhandled event type"}
        except Exception as e:
            logger.error(f"❌ Error in debug webhook processing: {e}")
            return {"event_type": event_type, "success": False, "message": str(e)}