import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import ProfileSection from "@/components/settings/ProfileSection";
import SecuritySection from "@/components/settings/SecuritySection";
import SubscriptionSection from "@/components/settings/SubscriptionSection";
import PreferencesSection from "@/components/settings/PreferencesSection";
import NotificationsSection from "@/components/settings/NotificationsSection";
import PrivacySection from "@/components/settings/PrivacySection";
import { useAuth } from "@/store/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  useProfile,
  useSubscriptionStatus,
  usePreferences,
  useNotifications,
  useBillingPortal,
  useDataExport,
  useDeleteAccount,
} from "@/hooks/useSettings";
import { usePrefs } from "@/store/usePrefs";

const profileSchema = z.object({
  full_name: z.string().min(2, "Name is too short"),
  email: z.string().email(),
});
type ProfileForm = z.infer<typeof profileSchema>;

export default function Settings() {
  const { profile: authProfile } = useAuth();

  // Hooks for data fetching - remove profile fetching since we have it from auth
  const { data: subscription, isLoading: subscriptionLoading } = useSubscriptionStatus();
  const { data: preferences, save: savePrefs, isLoading: preferencesLoading } = usePreferences();
  const { data: notifications, save: saveNotifs, isLoading: notificationsLoading } = useNotifications();
  const { open: billingPortal } = useBillingPortal();
  const { exportZip } = useDataExport();
  const { del: deleteAccount } = useDeleteAccount();

  // UI store for instant feedback (sync with fetched data)
  const { theme, currency, timezone, setTheme, setCurrency, setTimezone, loadFromBackend } = usePrefs();

  // Profile form - use authProfile data
  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: authProfile?.full_name || "",
      email: authProfile?.email || "",
    },
  });

  // Update form when auth profile changes
  useEffect(() => {
    if (authProfile) {
      form.reset({
        full_name: authProfile.full_name || "",
        email: authProfile.email,
      });
    }
  }, [authProfile, form]);

  // Sync preferences store with fetched data
  useEffect(() => {
    if (preferences) {
      console.log("🔄 Loading preferences from backend:", preferences);
      console.log("🎯 Current theme in store:", theme);
      
      // Load preferences from backend and apply them
      loadFromBackend(preferences);
      
      console.log("✅ Applied preferences, new theme should be:", preferences.theme);
    }
  }, [preferences, loadFromBackend]);

  // Show loading if auth profile is not available
  if (!authProfile) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Loading your settings...</p>
        </div>
        <Skeleton className="w-full h-96" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account, billing, preferences, and privacy.</p>
        </div>
        <div className="text-xs text-muted-foreground">
          Theme: {theme} {theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "🖥️"}
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-6 w-full">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Data & Privacy</TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile" className="space-y-6">
          <ProfileSection
            form={form}
            onSave={(values) => {
              // For now, just show a toast since profile updates aren't working
              // You can implement this later when the database issue is fixed
              console.log("Profile update attempted:", values);
              toast.success("Profile updated (simulated)");
            }}
            saving={false}
          />
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-6">
          <SecuritySection
            onToggle2FA={(v) => toast.info(v ? "2FA enabled (mock)" : "2FA disabled (mock)")}
            onChangePassword={() => toast.success("Password updated (mock)")}
          />
        </TabsContent>

        {/* Subscription - Now properly connected to backend */}
        <TabsContent value="subscription" className="space-y-6">
          {subscriptionLoading ? (
            <Skeleton className="w-full h-48" />
          ) : (
            <SubscriptionSection
              isPro={subscription?.is_pro}
              status={subscription?.status}
              currentPeriodEnd={subscription?.current_period_end}
              planName={subscription?.plan_name}
              cancelAtPeriodEnd={subscription?.cancel_at_period_end}
              onManageBilling={() =>
                billingPortal.mutate(undefined, {
                  onSuccess: (url) => (window.location.href = url),
                  onError: (e: any) => toast.error(e?.message ?? "Failed to open billing portal"),
                })
              }
              manageLoading={billingPortal.isPending}
            />
          )}
        </TabsContent>

        {/* Preferences - Connected to fetched data */}
        <TabsContent value="preferences" className="space-y-6">
          {preferencesLoading ? (
            <Skeleton className="w-full h-48" />
          ) : (
            <PreferencesSection
              theme={theme}
              currency={currency}
              timezone={timezone}
              onTheme={(v) => {
                setTheme(v as any);
                savePrefs.mutate({ theme: v, currency, timezone }, { 
                  onSuccess: () => toast.success(`Theme updated to ${v}`),
                  onError: (e: any) => toast.error(e?.message ?? "Failed to save theme preference"),
                });
              }}
              onCurrency={(v) => {
                setCurrency(v);
                savePrefs.mutate({ theme, currency: v, timezone }, { 
                  onSuccess: () => toast.success(`Currency updated to ${v}`),
                  onError: (e: any) => toast.error(e?.message ?? "Failed to save currency preference"),
                });
              }}
              onTimezone={(v) => {
                setTimezone(v);
                savePrefs.mutate({ theme, currency, timezone: v }, { 
                  onSuccess: () => toast.success(`Timezone updated to ${v}`),
                  onError: (e: any) => toast.error(e?.message ?? "Failed to save timezone preference"),
                });
              }}
            />
          )}
        </TabsContent>

        {/* Notifications - Connected to fetched data */}
        <TabsContent value="notifications" className="space-y-6">
          {notificationsLoading ? (
            <Skeleton className="w-full h-48" />
          ) : (
            <NotificationsSection
              emailWeekly={notifications?.emailWeekly ?? true}
              inAppAlerts={notifications?.inAppAlerts ?? true}
              onChange={(vals) => {
                saveNotifs.mutate(vals, { 
                  onSuccess: () => toast.success("Notification preferences saved"),
                  onError: (e: any) => toast.error(e?.message ?? "Failed to save notification preferences"),
                });
              }}
            />
          )}
        </TabsContent>

        {/* Data & Privacy */}
        <TabsContent value="privacy" className="space-y-6">
          <PrivacySection
            exporting={exportZip.isPending}
            deleting={deleteAccount.isPending}
            onExport={() => exportZip.mutate(undefined, { 
              onSuccess: () => toast.success("Export ready"),
              onError: (e: any) => toast.error(e?.message ?? "Export failed"),
            })}
            onDelete={() => {
              if (confirm("This will permanently delete your account and data. Continue?")) {
                deleteAccount.mutate(undefined, {
                  onSuccess: () => {
                    toast.success("Account deleted");
                    window.location.href = "/login";
                  },
                  onError: (e: any) => toast.error(e?.message ?? "Delete failed"),
                });
              }
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}