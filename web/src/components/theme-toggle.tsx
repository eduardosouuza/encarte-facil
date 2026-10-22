import * as React from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = React.useState(() => document.documentElement.classList.contains("dark"));
  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("encartefacil:theme", next ? "dark" : "light");
    setDark(next);
  }
  return <div className="flex items-center gap-2 text-muted-foreground">
    <Sun className="h-4 w-4" aria-hidden="true" />
    <button type="button" role="switch" aria-checked={dark} aria-label="Alternar tema" onClick={toggle} className="relative h-5 w-9 rounded-full bg-muted p-0.5 transition-colors data-[dark=true]:bg-primary" data-dark={dark}>
      <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${dark ? "translate-x-4" : "translate-x-0"}`} />
    </button>
    <Moon className="h-4 w-4" aria-hidden="true" />
  </div>;
}
