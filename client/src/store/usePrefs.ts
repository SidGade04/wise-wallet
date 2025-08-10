import { create } from "zustand";

type PrefsState = {
  theme: "light" | "dark" | "system";
  currency: string;
  timezone: string;
  setTheme: (t: PrefsState["theme"]) => void;
  setCurrency: (c: string) => void;
  setTimezone: (tz: string) => void;
  loadFromBackend: (prefs: { theme: string; currency: string; timezone: string }) => void;
};

// Function to apply theme to document
const applyTheme = (theme: "light" | "dark" | "system") => {
  const root = document.documentElement;
  
  if (theme === "system") {
    // Use system preference
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    root.classList.toggle("dark", systemTheme === "dark");
  } else {
    // Use explicit theme
    root.classList.toggle("dark", theme === "dark");
  }
  
  // Store in localStorage for immediate persistence
  localStorage.setItem("theme", theme);
};

// Get initial theme from localStorage or default to system
const getInitialTheme = (): "light" | "dark" | "system" => {
  if (typeof window === "undefined") return "system";
  
  const stored = localStorage.getItem("theme") as "light" | "dark" | "system" | null;
  return stored || "system";
};

export const usePrefs = create<PrefsState>((set, get) => {
  // Apply initial theme
  const initialTheme = getInitialTheme();
  if (typeof window !== "undefined") {
    applyTheme(initialTheme);
  }

  return {
    theme: initialTheme,
    currency: "USD",
    timezone: "America/Chicago",
    
    setTheme: (theme) => {
      set({ theme });
      applyTheme(theme);
    },
    
    setCurrency: (currency) => set({ currency }),
    setTimezone: (timezone) => set({ timezone }),
    
    // Load preferences from backend and apply them
    loadFromBackend: (prefs) => {
      const theme = prefs.theme as "light" | "dark" | "system";
      set({ 
        theme,
        currency: prefs.currency,
        timezone: prefs.timezone 
      });
      applyTheme(theme);
    },
  };
});

// Listen for system theme changes when using "system" mode
if (typeof window !== "undefined") {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", () => {
    const currentTheme = usePrefs.getState().theme;
    if (currentTheme === "system") {
      applyTheme("system");
    }
  });
}