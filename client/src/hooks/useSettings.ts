import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import { useAuth } from "@/store/useAuth";

// --- Types shared with backend ---
export type ProfileOut = { id: string; email: string; full_name?: string | null };
export type ProfileUpdate = { full_name: string; email: string };
export type PreferencesUpdate = { theme: string; currency: string; timezone: string };
export type NotificationSettingsUpdate = { emailWeekly: boolean; inAppAlerts: boolean };
export type NotificationSettings = { emailWeekly: boolean; inAppAlerts: boolean };
export type PortalSessionResponse = { url: string };

// Query keys
const qk = {
  profile: (uid?: string) => ["profile", uid] as const,
  subscription: (uid?: string) => ["subscription", uid] as const,
  notifications: (uid?: string) => ["notifications", uid] as const,
  preferences: (uid?: string) => ["preferences", uid] as const,
};

// -------- Profile --------
export function useProfile() {
  const { session, user } = useAuth();
  const token = session?.access_token;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: qk.profile(user?.id),
    enabled: !!token && !!user?.id,
    queryFn: () => apiFetch<ProfileOut>("/profile", { token }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      if (error?.status === 401) return false;
      return failureCount < 3;
    }
  });

  const update = useMutation({
    mutationFn: (body: ProfileUpdate) => 
      apiFetch<ProfileOut>("/profile", { method: "PUT", body, token }),
    onSuccess: (data) => {
      qc.setQueryData(qk.profile(user?.id), data);
      // Also update auth profile if it exists
      qc.invalidateQueries({ queryKey: ["auth"] });
    },
    onError: (error: any) => {
      console.error("Profile update failed:", error);
    }
  });

  return { ...query, update };
}

// -------- Subscription Status --------
export function useSubscriptionStatus() {
  const { session, user } = useAuth();
  const token = session?.access_token;
  
  return useQuery({
    queryKey: qk.subscription(user?.id),
    enabled: !!token && !!user?.id,
    queryFn: async () => {
      try {
        const result = await apiFetch<{ 
          is_pro: boolean; 
          status?: string; 
          current_period_end?: string;
          plan_name?: string;
          cancel_at_period_end?: boolean;
        }>("/stripe/subscription/status", { token });
        console.log("Subscription status:", result); // Debug log
        return result;
      } catch (error) {
        console.error("Failed to fetch subscription status:", error);
        // Return default free status if API fails
        return { is_pro: false };
      }
    },
    staleTime: 30_000, // 30 seconds
    retry: (failureCount, error: any) => {
      if (error?.status === 401) return false;
      return failureCount < 2;
    }
  });
}

// -------- Notifications --------
export function useNotifications() {
  const { session, user } = useAuth();
  const token = session?.access_token;
  const qc = useQueryClient();

  // Fetch current notification settings
  const query = useQuery({
    queryKey: qk.notifications(user?.id),
    enabled: !!token && !!user?.id,
    queryFn: () => apiFetch<NotificationSettings>("/settings/notifications", { token }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      if (error?.status === 401) return false;
      return failureCount < 2;
    }
  });

  const save = useMutation({
    mutationFn: (body: NotificationSettingsUpdate) =>
      apiFetch<{ ok: boolean; message: string }>("/settings/notifications", { 
        method: "PUT", 
        body, 
        token 
      }),
    onSuccess: (_, variables) => {
      // Update the cache with the new values
      qc.setQueryData(qk.notifications(user?.id), variables);
    },
    onError: (error: any) => {
      console.error("Failed to save notification settings:", error);
    }
  });

  return { ...query, save };
}

// -------- Preferences --------
export function usePreferences() {
  const { session, user } = useAuth();
  const token = session?.access_token;
  const qc = useQueryClient();

  // Fetch current preferences
  const query = useQuery({
    queryKey: qk.preferences(user?.id),
    enabled: !!token && !!user?.id,
    queryFn: async () => {
      const result = await apiFetch<PreferencesUpdate>("/settings/preferences", { token });
      console.log("🎨 Preferences from backend:", result); // Debug log
      return result;
    },
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.status === 401) return false;
      return failureCount < 2;
    }
  });

  const save = useMutation({
    mutationFn: (body: PreferencesUpdate) =>
      apiFetch<{ ok: boolean; message: string }>("/settings/preferences", { 
        method: "PUT", 
        body, 
        token 
      }),
    onSuccess: (_, variables) => {
      console.log("💾 Saved preferences:", variables); // Debug log
      qc.setQueryData(qk.preferences(user?.id), variables);
    }
  });

  return { ...query, save };
}

// -------- Billing Portal --------
export function useBillingPortal() {
  const { session } = useAuth();
  const token = session?.access_token;

  const open = useMutation({
    mutationFn: async () => {
      const { url } = await apiFetch<PortalSessionResponse>("/billing/portal", { 
        method: "POST", 
        token 
      });
      return url;
    },
    onError: (error: any) => {
      console.error("Failed to create billing portal session:", error);
    }
  });

  return { open };
}

// -------- Data Export --------
export function useDataExport() {
  const { session } = useAuth();
  const token = session?.access_token;

  const exportZip = useMutation({
    mutationFn: async () => {
      const apiBase = import.meta.env.VITE_API_URL ?? "";
      const res = await fetch(`${apiBase}/data/export`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Export failed: ${errorText}`);
      }
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "wise-wallet-export.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    onError: (error: any) => {
      console.error("Data export failed:", error);
    }
  });

  return { exportZip };
}

// -------- Account Deletion --------
export function useDeleteAccount() {
  const { session } = useAuth();
  const token = session?.access_token;
  const qc = useQueryClient();

  const del = useMutation({
    mutationFn: () => apiFetch<{ ok: boolean; message: string }>("/account", { 
      method: "DELETE", 
      token 
    }),
    onSuccess: () => {
      // Clear all cached data
      qc.clear();
      // Clear auth state
      // You might want to call your auth logout function here
    },
    onError: (error: any) => {
      console.error("Account deletion failed:", error);
    }
  });

  return { del };
}