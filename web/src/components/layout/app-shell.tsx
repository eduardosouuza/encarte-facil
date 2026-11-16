import * as React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { NAV_ITEMS } from "./sidebar";
import { PanelLeftOpen } from "lucide-react";

const TITLES: Record<string, string> = {
  "/dashboard": "Painel",
  "/flyers": "Encartes",
  "/products": "Produtos",
  "/designs": "Modelos",
  "/assets": "Imagens",
  "/brandkit": "Minha marca",
  "/exports": "Exportacoes",
  "/billing": "Plano e creditos",
  "/settings": "Configuracoes",
};

export function AppShell() {
  const [sidebarHidden, setSidebarHidden] = React.useState(() => localStorage.getItem("workspace:sidebar-hidden") === "true");
  function toggleSidebar() {
    setSidebarHidden(value => {
      localStorage.setItem("workspace:sidebar-hidden", String(!value));
      return !value;
    });
  }
  const location = useLocation();
  const isEditor = location.pathname.startsWith("/editor/");
  const title = React.useMemo(() => {
    const match = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to));
    return TITLES[match?.to ?? ""] ?? "Encart?";
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden shrink-0 md:flex">
        {sidebarHidden ? <div className="w-10 border-r bg-card"><button type="button" aria-label="Mostrar menu principal" title="Mostrar menu principal" onClick={toggleSidebar} className="flex h-16 w-10 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"><PanelLeftOpen className="h-5 w-5" /></button></div> : <Sidebar onCollapse={toggleSidebar} />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        {isEditor ? null : <Topbar title={title} />}
        <main className={`min-h-0 flex-1 overflow-y-auto scrollbar-thin ${isEditor ? "" : "p-6"}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
