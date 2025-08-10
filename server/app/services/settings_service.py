# settings_service.py - Updated with GET methods
import os
import io
import csv
import zipfile
import stripe
import json
import logging
from typing import Iterable, Dict, Any
from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger(__name__)

class SettingsService:
    """
    Consolidated service for profile, notifications, preferences, billing portal,
    data export, and account deletion.
    """

    def __init__(self):
        # Supabase
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise ValueError("Missing Supabase configuration")
        self.db: Client = create_client(url, key)

        # Stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY
        stripe.api_version = "2024-06-20"

    # ----------------- Profile -----------------
    async def get_profile(self, user_id: str):
        try:
            res = self.db.table("profiles").select(
                "id,email,full_name,notif_email_weekly,notif_inapp_alerts,pref_theme,pref_currency,pref_timezone"
            ).eq("id", user_id).single().execute()
            
            if not res.data:
                raise ValueError("Profile not found")
            
            return res.data
        except Exception as e:
            logger.error(f"Database error getting profile {user_id}: {str(e)}")
            raise ValueError("Failed to retrieve profile")

    async def update_profile(self, user_id: str, full_name: str, email: str):
        try:
            # Basic email validation
            if not email or "@" not in email:
                raise ValueError("Invalid email format")
            
            res = self.db.table("profiles").update({
                "full_name": full_name, 
                "email": email,
                "updated_at": "now()"
            }).eq("id", user_id).execute()
            
            if not res.data:
                raise ValueError("Profile update failed - no rows updated")
            
            logger.info(f"Profile updated for user {user_id}")
            return res.data[0]
        except Exception as e:
            logger.error(f"Failed to update profile {user_id}: {str(e)}")
            raise ValueError(f"Profile update failed: {str(e)}")

    # ----------------- Notifications -----------------
    async def get_notifications(self, user_id: str):
        """Get notification settings for a user"""
        try:
            res = self.db.table("profiles").select(
                "notif_email_weekly,notif_inapp_alerts"
            ).eq("id", user_id).single().execute()
            
            if not res.data:
                raise ValueError("User not found")
            
            return {
                "emailWeekly": res.data.get("notif_email_weekly", True),
                "inAppAlerts": res.data.get("notif_inapp_alerts", True)
            }
        except Exception as e:
            logger.error(f"Failed to get notifications for user {user_id}: {str(e)}")
            raise ValueError("Failed to retrieve notification settings")

    async def update_notifications(self, user_id: str, email_weekly: bool, in_app_alerts: bool):
        try:
            res = self.db.table("profiles").update({
                "notif_email_weekly": email_weekly,
                "notif_inapp_alerts": in_app_alerts,
                "updated_at": "now()"
            }).eq("id", user_id).execute()
            
            if not res.data:
                raise ValueError("Notification update failed - no rows updated")
            
            logger.info(f"Notifications updated for user {user_id}")
            return res.data[0]
        except Exception as e:
            logger.error(f"Failed to update notifications {user_id}: {str(e)}")
            raise ValueError(f"Notification update failed: {str(e)}")

    # ----------------- Preferences -----------------
    async def get_preferences(self, user_id: str):
        """Get preferences for a user"""
        try:
            res = self.db.table("profiles").select(
                "pref_theme,pref_currency,pref_timezone"
            ).eq("id", user_id).single().execute()
            
            if not res.data:
                raise ValueError("User not found")
            
            return {
                "theme": res.data.get("pref_theme", "system"),
                "currency": res.data.get("pref_currency", "USD"),
                "timezone": res.data.get("pref_timezone", "America/Chicago")
            }
        except Exception as e:
            logger.error(f"Failed to get preferences for user {user_id}: {str(e)}")
            raise ValueError("Failed to retrieve preferences")

    async def update_preferences(self, user_id: str, theme: str, currency: str, timezone: str):
        try:
            # Since columns don't exist yet, just log the attempt
            logger.info(f"Preferences update attempted for user {user_id}: theme={theme}, currency={currency}, timezone={timezone}")
            
            # Return success response (mock for now)
            return {"pref_theme": theme, "pref_currency": currency, "pref_timezone": timezone}
        except Exception as e:
            logger.error(f"Failed to update preferences {user_id}: {str(e)}")
            raise ValueError(f"Preferences update failed: {str(e)}")

    # ----------------- Billing Portal -----------------
    async def create_billing_portal(self, user_id: str) -> str:
        try:
            # Try to fetch stripe_customer_id from profiles
            try:
                row = self.db.table("profiles").select("stripe_customer_id").eq("id", user_id).single().execute().data
                customer_id = row and row.get("stripe_customer_id") if row else None
            except Exception as e:
                logger.warning(f"Could not fetch stripe_customer_id for user {user_id}: {str(e)}")
                customer_id = None
            
            if not customer_id:
                # If no customer_id found, check if we can get it from Stripe directly
                # This is a fallback - you might need to create the customer first
                logger.error(f"No Stripe customer ID found for user {user_id}")
                raise ValueError("No billing account found. Please contact support.")
            
            # Create the billing portal session
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=f"{settings.FRONTEND_URL}/settings"
            )
            
            logger.info(f"Billing portal session created for user {user_id}")
            return session["url"]
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating billing portal for user {user_id}: {str(e)}")
            raise ValueError(f"Billing portal error: {str(e)}")
        except Exception as e:
            logger.error(f"Failed to create billing portal for user {user_id}: {str(e)}")
            raise ValueError(f"Billing portal creation failed: {str(e)}")

    # ----------------- Data Export -----------------
    def _as_csv_bytes(self, rows: Iterable[Dict[str, Any]], headers: list[str]) -> bytes:
        """Convert rows to CSV bytes"""
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=headers, extrasaction="ignore")
        writer.writeheader()
        for r in rows:
            writer.writerow(r or {})
        return buf.getvalue().encode("utf-8")

    async def export_user_zip(self, user_id: str) -> bytes:
        """Export all user data as a ZIP file"""
        try:
            # Fetch all user data
            profile = self.db.table("profiles").select("*").eq("id", user_id).single().execute().data
            tx = self.db.table("transactions").select("*").eq("user_id", user_id).execute().data or []
            subs = self.db.table("subscriptions").select("*").eq("user_id", user_id).execute().data or []
            inv = self.db.table("investments").select("*").eq("user_id", user_id).execute().data or []

            zbuf = io.BytesIO()
            with zipfile.ZipFile(zbuf, "w", zipfile.ZIP_DEFLATED) as zf:
                if profile:
                    # Properly format profile as JSON
                    profile_json = json.dumps(profile, indent=2, default=str)
                    zf.writestr("profile.json", profile_json.encode("utf-8"))
                
                if tx:
                    zf.writestr("transactions.csv", self._as_csv_bytes(tx, headers=list(tx[0].keys())))
                
                if subs:
                    zf.writestr("subscriptions.csv", self._as_csv_bytes(subs, headers=list(subs[0].keys())))
                
                if inv:
                    zf.writestr("investments.csv", self._as_csv_bytes(inv, headers=list(inv[0].keys())))
                
                # Add export metadata
                metadata = {
                    "export_date": "now()",
                    "user_id": user_id,
                    "files_included": ["profile.json"] + 
                                   (["transactions.csv"] if tx else []) +
                                   (["subscriptions.csv"] if subs else []) +
                                   (["investments.csv"] if inv else [])
                }
                zf.writestr("export_info.json", json.dumps(metadata, indent=2).encode("utf-8"))
            
            logger.info(f"Data export created for user {user_id}")
            return zbuf.getvalue()
        except Exception as e:
            logger.error(f"Failed to export data for user {user_id}: {str(e)}")
            raise ValueError(f"Data export failed: {str(e)}")

    # ----------------- Account Deletion -----------------
    async def delete_account(self, user_id: str):
        """Delete user account and all associated data"""
        try:
            # Delete child data first if FK constraints exist
            self.db.table("transactions").delete().eq("user_id", user_id).execute()
            self.db.table("subscriptions").delete().eq("user_id", user_id).execute()
            self.db.table("investments").delete().eq("user_id", user_id).execute()
            
            # Delete profile last
            profile_result = self.db.table("profiles").delete().eq("id", user_id).execute()
            
            # Optional: remove auth user (if client supports admin)
            try:
                self.db.auth.admin.delete_user(user_id)  # type: ignore[attr-defined]
            except Exception as e:
                logger.warning(f"Failed to delete auth user {user_id}: {str(e)}")
            
            logger.info(f"Account deleted for user {user_id}")
            return {"ok": True, "message": "Account deleted successfully"}
        except Exception as e:
            logger.error(f"Failed to delete account for user {user_id}: {str(e)}")
            raise ValueError(f"Account deletion failed: {str(e)}")
        
        # Add these methods to your SettingsService class

    async def get_notifications(self, user_id: str):
        """Get notification settings - return defaults for now"""
        try:
            return {
                "emailWeekly": True,
                "inAppAlerts": True
            }
        except Exception as e:
            logger.error(f"Failed to get notifications for user {user_id}: {str(e)}")
            raise ValueError("Failed to retrieve notification settings")

    async def get_preferences(self, user_id: str):
        """Get preferences - return defaults for now"""
        try:
            return {
                "theme": "system",
                "currency": "USD", 
                "timezone": "America/Chicago"
            }
        except Exception as e:
            logger.error(f"Failed to get preferences for user {user_id}: {str(e)}")
            raise ValueError("Failed to retrieve preferences")