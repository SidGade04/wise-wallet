from pydantic import BaseModel, EmailStr, Field, HttpUrl

# --- Profile ---
class ProfileOut(BaseModel):
    id: str
    email: EmailStr
    full_name: str | None = None

class ProfileUpdate(BaseModel):
    full_name: str
    email: EmailStr

# --- Notifications / Preferences ---
class NotificationSettingsUpdate(BaseModel):
    emailWeekly: bool = Field(..., description="Weekly email summary")
    inAppAlerts: bool = Field(..., description="In-app notifications")

class PreferencesUpdate(BaseModel):
    theme: str          # "light" | "dark" | "system"
    currency: str       # "USD" | "EUR" | ...
    timezone: str       # e.g., "America/Chicago"

# --- Billing ---
class PortalSessionResponse(BaseModel):
    url: HttpUrl

# --- Generic ---
class SuccessMessage(BaseModel):
    ok: bool = True
    message: str = "ok"
