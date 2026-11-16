import { BrandLogo } from "@/components/brand-logo";
import * as React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  BadgePercent,
  Download,
  FileStack,
  LayoutDashboard,
  LogOut,
  Package,
  Palette,
  Settings,
  PanelLeftClose,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/auth-context";

export interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { to: "/flyers", label: "Encartes", icon: FileStack },
  { to: "/products", label: "Produtos", icon: Package },
  { to: "/designs", label: "Modelos", icon: Palette },
  { to: "/assets", label: "Imagens", icon: FileStack },
  { to: "/brandkit", label: "Minha marca", icon: Palette },
  { to: "/exports", label: "Exportacoes", icon: Download },
  { to: "/billing", label: "Plano e creditos", icon: BadgePercent },
  { to: "/settings", label: "Configuracoes", icon: Settings },
];

export function Sidebar({ className, onCollapse }: { className?: string; onCollapse?: () => void }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside
      className={cn(
        "flex h-full w-60 shrink-0 flex-col border-r bg-card",
        className,
      )}
    >
      <div className="flex h-16 items-center gap-2 border-b px-5">
        <BrandLogo />
        {onCollapse && <button type="button" onClick={onCollapse} aria-label="Ocultar menu principal" title="Ocultar menu principal" className="ml-auto rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><PanelLeftClose className="h-4 w-4" /></button>}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
