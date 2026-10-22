import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

interface ForgotResponse {
  success: boolean;
  message: string;
  resetToken?: string;
  expiresAt?: string;
}

export function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [resetToken, setResetToken] = React.useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const data = await api.post<ForgotResponse>("/auth/forgot-password", { email });
      setMessage(data.message);
      setResetToken(data.resetToken ?? null);
    } catch {
      setMessage("Nao foi possivel processar a solicitacao agora.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <Link to="/login" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar para o login
        </Link>

        <h1 className="font-display text-2xl font-semibold">Recuperar senha</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Informe o e-mail da conta e enviaremos as instrucoes para redefinir a senha.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Enviar instrucoes
          </Button>
        </form>

        {message ? (
          <div role="status" className="mt-4 rounded-md bg-muted px-3 py-2 text-sm">
            {message}
          </div>
        ) : null}

        {resetToken ? (
          <div className="mt-4 rounded-md border border-dashed p-3 text-xs">
            <p className="font-medium">Ambiente local: link de redefinicao</p>
            <Link to={`/reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(email)}`} className="text-primary hover:underline">
              Redefinir senha agora
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
