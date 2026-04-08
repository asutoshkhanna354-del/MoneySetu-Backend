import { createContext, useContext, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export interface User {
  id: number;
  name: string;
  phone: string;
  isAdmin: boolean;
  referralCode: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isLoading, isError } = useGetMe({
    query: {
      retry: false,
      refetchOnWindowFocus: false,
      enabled: !!localStorage.getItem("ev_token"),
    },
  });

  useEffect(() => {
    if (isError) {
      localStorage.removeItem("ev_token");
      const publicPaths = ["/", "/login", "/register"];
      if (!publicPaths.includes(window.location.pathname)) {
        setLocation("/login");
      }
    }
  }, [isError, setLocation]);

  const logout = () => {
    localStorage.removeItem("ev_token");
    queryClient.clear();
    setLocation("/");
  };

  return (
    <AuthContext.Provider
      value={{
        user: (user as User) ?? null,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: (user as User)?.isAdmin ?? false,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
