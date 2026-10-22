import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "../auth-context";
import { ApiClientError } from "@/lib/api";
import { ThemeToggle } from "@/components/theme-toggle";

const schema = z.object({
  email: z.string().min(1, "Informe o e-mail").email("Informe um e-mail valido"),
  password: z.string().min(1, "Informe a senha"),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await login(values.email, values.password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== "/login" ? from : "/flyers", { replace: true });
    } catch (error) {
      setServerError(
        error instanceof ApiClientError ? error.message : "Nao foi possivel entrar. Tente novamente.",
      );
    }
  });

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="absolute right-5 top-5"><ThemeToggle /></div>
      <div className="w-full max-w-md rounded-lg border bg-card px-6 py-14 sm:px-6">
          <img src="/encartefacil-logo.png" alt="Encartefacil" className="mx-auto mb-7 h-auto w-44" />
          <h1 className="mb-7 text-center text-2xl font-semibold tracking-tight">Logar</h1>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  aria-invalid={Boolean(errors.email)}
                  {...register("email")}
                />
              {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  aria-invalid={Boolean(errors.password)}
                  {...register("password")}
                />
              {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
            </div>

            {serverError ? (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {serverError}
              </p>
            ) : null}

            <Button type="submit" className="mt-8 w-full rounded-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Entrar
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm font-semibold">
            <Link to="/register" className="hover:text-primary">Criar conta</Link>
            <Link to="/forgot-password" className="hover:text-primary">Esqueci minha senha</Link>
          </div>
      </div>
    </div>
  );
}
