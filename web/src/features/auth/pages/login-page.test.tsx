import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginPage } from "@/features/auth/pages/login-page";
import { renderWithProviders } from "@/test/render";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const USER = {
  _key: "usr_1",
  _id: "usr_1",
  email: "demo@encartefacil.com",
  name: "Demo",
  phone: null,
  document: null,
  market: "BR",
  locale: "pt-br",
  role: "user",
  credits: 10,
  createdAt: new Date().toISOString(),
};

describe("LoginPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("mostra erro de credenciais invalidas", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: false, error: "Credenciais invalidas" }, 401));
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<LoginPage />, { route: "/login" });

    await userEvent.type(screen.getByLabelText("E-mail *"), "demo@encartefacil.com");
    await userEvent.type(screen.getByLabelText("Senha *"), "senha-errada");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Credenciais invalidas");
    });
  });

  it("valida campos obrigatorios antes de chamar a API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<LoginPage />, { route: "/login" });

    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(screen.getByText("Informe o e-mail")).toBeInTheDocument();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("autentica e guarda o token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true, token: "jwt-123", user: USER }));
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<LoginPage />, { route: "/login" });

    await userEvent.type(screen.getByLabelText("E-mail *"), "demo@encartefacil.com");
    await userEvent.type(screen.getByLabelText("Senha *"), "demo12345");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(window.localStorage.getItem("@encartefacil:token")).toBe("jwt-123");
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
