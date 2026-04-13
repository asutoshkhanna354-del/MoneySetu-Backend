import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

interface ThemeCtx {
  theme: Theme;
  isDark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeCtx>({
  theme: "dark",
  isDark: true,
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem("ms_theme") as Theme) || "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    const html = document.documentElement;
    if (theme === "light") {
      html.classList.add("light");
      html.classList.remove("dark");
    } else {
      html.classList.add("dark");
      html.classList.remove("light");
    }
    localStorage.setItem("ms_theme", theme);
  }, [theme]);

  const toggle = () => setTheme(t => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === "dark", toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
