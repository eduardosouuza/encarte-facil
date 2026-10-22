import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, storage } from "@/lib/api";
import type { User } from "@/lib/types";

interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      if (!storage.getToken()) return null;
      const data = await api.get<{ success: boolean; user: User }>("/auth/me");
      return data.user;
    },
    retry: false,
    staleTime: 60 * 1000,
  });

  React.useEffect(() => {
    const onExpired = () => {
      queryClient.setQueryData(["auth", "me"], null);
    };
    window.addEventListener("encarte:session-expired", onExpired);
    return () => window.removeEventListener("encarte:session-expired", onExpired);
  }, [queryClient]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user: meQuery.data ?? null,
      isLoading: meQuery.isLoading,
      isAuthenticated: Boolean(meQuery.data),
      login: async (email, password) => {
        const data = await api.post<AuthResponse>("/auth/login", { email, password });
        storage.setToken(data.token);
        queryClient.setQueryData(["auth", "me"], data.user);
        return data.user;
      },
      register: async (input) => {
        const data = await api.post<AuthResponse>("/auth/register", input);
        storage.setToken(data.token);
        queryClient.setQueryData(["auth", "me"], data.user);
        return data.user;
      },
      logout: async () => {
        try {
          await api.post("/auth/logout");
        } catch {
          /* sessao pode ja estar expirada */
        }
        storage.clearToken();
        queryClient.setQueryData(["auth", "me"], null);
        queryClient.clear();
      },
      refresh: async () => {
        await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      },
    }),
    [meQuery.data, meQuery.isLoading, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
