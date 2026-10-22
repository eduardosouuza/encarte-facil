import { useAuth } from "@/features/auth/auth-context";
import { initials } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { NAV_ITEMS } from "./sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Topbar({ title }: { title?: string }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white px-6 dark:bg-slate-950">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild><button className="rounded p-2 hover:bg-muted md:hidden" aria-label="Abrir menu"><Menu className="h-5 w-5" /></button></DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">{NAV_ITEMS.map(item => <DropdownMenuItem key={item.to} asChild><Link to={item.to}><item.icon className="mr-2 h-4 w-4" />{item.label}</Link></DropdownMenuItem>)}
            <DropdownMenuSeparator /><DropdownMenuItem onSelect={() => void logout().then(() => navigate("/login", { replace: true }))}>Sair</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {title ? <h1 className="font-display text-xl font-semibold tracking-tight">{title}</h1> : null}
      </div>

      <div className="flex items-center gap-4"><ThemeToggle /><DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-full border p-1 pr-3 text-sm transition-colors hover:bg-muted"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials(user?.name ?? "EF")}
            </span>
            <span className="hidden font-medium sm:inline">{user?.name ?? "Visitante"}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <span className="block text-sm">{user?.name}</span>
            <span className="block truncate text-xs font-normal text-muted-foreground">{user?.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/settings">Configuracoes</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu></div>
    </header>
  );
}
