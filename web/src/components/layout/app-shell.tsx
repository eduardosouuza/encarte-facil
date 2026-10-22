import * as React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { NAV_ITEMS } from "./sidebar";

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
  const location = useLocation();
  const isEditor = location.pathname.startsWith("/editor/");
  const title = React.useMemo(() => {
    const match = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to));
    return TITLES[match?.to ?? ""] ?? "Encartefacil";
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="hidden md:flex">
        <Sidebar />
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
