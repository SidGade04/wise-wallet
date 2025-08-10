# settings_routes.py - Updated with additional endpoints
import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from app.core.auth import get_current_user

from app.models.settings_models import (
    ProfileOut, ProfileUpdate,
    NotificationSettingsUpdate, PreferencesUpdate,
    PortalSessionResponse, SuccessMessage,
)
from app.services.settings_service import SettingsService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["settings"])

svc = SettingsService()

# ---------- Profile ----------
@router.put("/profile", response_model=ProfileOut)
async def update_profile(body: ProfileUpdate, current_user=Depends(get_current_user)):
    try:
        data = await svc.update_profile(current_user["user_id"], body.full_name, body.email)
        return ProfileOut(**data)
    except Exception as e:
        logger.error(f"Failed to update profile for user {current_user.get('user_id')}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ---------- Notifications ----------
@router.get("/settings/notifications")
async def get_notifications(current_user=Depends(get_current_user)):
    """Get current notification settings"""
    try:
        data = await svc.get_notifications(current_user["user_id"])
        return data
    except Exception as e:
        logger.error(f"Failed to get notifications for user {current_user.get('user_id')}: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))

@router.put("/settings/notifications", response_model=SuccessMessage)
async def update_notifications(body: NotificationSettingsUpdate, current_user=Depends(get_current_user)):
    try:
        await svc.update_notifications(current_user["user_id"], body.emailWeekly, body.inAppAlerts)
        return SuccessMessage(message="Notification settings updated")
    except Exception as e:
        logger.error(f"Failed to update notifications for user {current_user.get('user_id')}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ---------- Preferences ----------
@router.get("/settings/preferences")
async def get_preferences(current_user=Depends(get_current_user)):
    """Get current preferences"""
    try:
        data = await svc.get_preferences(current_user["user_id"])
        return data
    except Exception as e:
        logger.error(f"Failed to get preferences for user {current_user.get('user_id')}: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))

@router.put("/settings/preferences", response_model=SuccessMessage)
async def update_preferences(body: PreferencesUpdate, current_user=Depends(get_current_user)):
    try:
        await svc.update_preferences(current_user["user_id"], body.theme, body.currency, body.timezone)
        return SuccessMessage(message="Preferences updated")
    except Exception as e:
        logger.error(f"Failed to update preferences for user {current_user.get('user_id')}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ---------- Billing Portal ----------
@router.post("/billing/portal", response_model=PortalSessionResponse)
async def create_billing_portal(current_user=Depends(get_current_user)):
    try:
        url = await svc.create_billing_portal(current_user["user_id"])
        return PortalSessionResponse(url=url)
    except Exception as e:
        logger.error(f"Failed to create billing portal for user {current_user.get('user_id')}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ---------- Data Export ----------
@router.post("/data/export")
async def export_data(current_user=Depends(get_current_user)):
    try:
        content = await svc.export_user_zip(current_user["user_id"])
        headers = {"Content-Disposition": 'attachment; filename="wise-wallet-export.zip"'}
        return StreamingResponse(iter([content]), media_type="application/zip", headers=headers)
    except Exception as e:
        logger.error(f"Failed to export data for user {current_user.get('user_id')}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ---------- Account Deletion ----------
@router.delete("/account", response_model=SuccessMessage)
async def delete_account(current_user=Depends(get_current_user)):
    try:
        await svc.delete_account(current_user["user_id"])
        return SuccessMessage(message="Account deleted successfully")
    except Exception as e:
        logger.error(f"Failed to delete account for user {current_user.get('user_id')}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
    # Add these GET endpoints to your settings_routes.py
