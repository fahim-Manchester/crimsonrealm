import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { THEMES, ThemeId, ThemeConfig } from "@/lib/themes";

interface ThemeContextValue {
  theme: ThemeId;
  themeConfig: ThemeConfig;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "realm-theme";

function getStoredTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in THEMES) return stored as ThemeId;
  } catch {}
  return "gothic";
}

function applyTheme(config: ThemeConfig) {
  const root = document.documentElement;

  // Reset to gothic defaults first (clear previous overrides)
  if (config.id === "gothic") {
    // Remove all overrides so CSS :root defaults apply
    Object.keys(THEMES.neon.cssVariables).forEach((key) => {
      root.style.removeProperty(key);
    });
  } else {
    Object.entries(config.cssVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }

  // Apply font overrides
  root.style.setProperty("--font-heading", config.fonts.heading);
  root.style.setProperty("--font-body", config.fonts.body);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(getStoredTheme);

  const setTheme = (id: ThemeId) => {
    setThemeState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {}
  };

  useEffect(() => {
    applyTheme(THEMES[theme]);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, themeConfig: THEMES[theme], setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
