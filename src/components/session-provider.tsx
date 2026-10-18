"use client";

import { api, dataOf } from "@/lib/api";
import type { ApiEnvelope, User } from "@/lib/types";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

type SessionContextValue = {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const envelope = await api<ApiEnvelope<User>>("v1/users/me");
      setUser(dataOf(envelope));
    } catch {
      setUser(null);
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function logout() {
    try {
      await api("v1/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <SessionContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used within SessionProvider");
  return context;
}
