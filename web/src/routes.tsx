import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { ProtectedRoute } from "@/features/auth/protected-route";
import { LoginPage } from "@/features/auth/pages/login-page";
import { RegisterPage } from "@/features/auth/pages/register-page";
import { ForgotPasswordPage } from "@/features/auth/pages/forgot-password-page";
import { ResetPasswordPage } from "@/features/auth/pages/reset-password-page";
import { DashboardPage } from "@/features/dashboard/pages/dashboard-page";
import { FlyersPage } from "@/features/flyers/pages/flyers-page";
import { EditorPage } from "@/features/flyers/pages/editor-page";
import { ProductsPage } from "@/features/products/pages/products-page";
import { DesignsPage } from "@/features/designs/pages/designs-page";
import { ExportsPage } from "@/features/exports/pages/exports-page";
import { BillingPage } from "@/features/billing/pages/billing-page";
import { SettingsPage } from "@/features/settings/pages/settings-page";
import { PublicFlyerPage } from "@/features/public/pages/public-flyer-page";
import { MediaPage } from "@/features/media/media-library";
import { BrandPage } from "@/features/media/brand-page";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/p/:id" element={<PublicFlyerPageRoute />} />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/flyers" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/flyers" element={<FlyersPage />} />
        <Route path="/editor" element={<FlyersPage />} />
        <Route path="/editor/:id" element={<EditorPageRoute />} />
        <Route path="/assets" element={<MediaPage />} />
        <Route path="/brandkit" element={<BrandPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/designs" element={<DesignsPage />} />
        <Route path="/exports" element={<ExportsPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/flyers" replace />} />
    </Routes>
  );
}

function EditorPageRoute() {
  const { id } = useParams();
  return <EditorPage key={id} />;
}

function PublicFlyerPageRoute() {
  const { id } = useParams<{ id: string }>();
  return <PublicFlyerPage id={id ?? ""} />;
}
