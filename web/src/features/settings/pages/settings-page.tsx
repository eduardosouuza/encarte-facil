import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/features/auth/auth-context";
import { api } from "@/lib/api";

export function SettingsPage() {
  const { user, refresh } = useAuth();
  const [name, setName] = React.useState(user?.name ?? "");
  const [phone, setPhone] = React.useState(user?.phone ?? "");
  const [market, setMarket] = React.useState(user?.market ?? "BR");
  const [locale, setLocale] = React.useState(user?.locale ?? "pt-br");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    setName(user.name);
    setPhone(user.phone ?? "");
    setMarket(user.market);
    setLocale(user.locale);
  }, [user]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.put("/customers/me", { name, phone: phone || null, market, locale });
      await refresh();
      toast.success("Dados atualizados");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar os dados");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold">Configuracoes</h2>
        <p className="text-sm text-muted-foreground">Atualize os dados da sua conta.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da conta</CardTitle>
          <CardDescription>Informacoes usadas nos encartes e nos envios.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settings-name">Nome</Label>
              <Input
                id="settings-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="settings-email">E-mail</Label>
              <Input id="settings-email" value={user?.email ?? ""} disabled readOnly />
            </div>

            <div className="space-y-2">
              <Label htmlFor="settings-phone">Telefone</Label>
              <Input
                id="settings-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="settings-market">Mercado</Label>
                <Select value={market} onValueChange={setMarket}>
                  <SelectTrigger id="settings-market">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BR">Brasil</SelectItem>
                    <SelectItem value="PT">Portugal</SelectItem>
                    <SelectItem value="MX">Mexico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-locale">Idioma</Label>
                <Select value={locale} onValueChange={setLocale}>
                  <SelectTrigger id="settings-locale">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt-br">Portugues (BR)</SelectItem>
                    <SelectItem value="pt-pt">Portugues (PT)</SelectItem>
                    <SelectItem value="es">Espanhol</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar alteracoes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
