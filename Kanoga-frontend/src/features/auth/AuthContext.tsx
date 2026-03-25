import React, { createContext, useContext } from "react";

export type AuthCredentials = { email: string; password: string };

const AuthContext = createContext<AuthCredentials | null>(null);

export function AuthProvider({
  value,
  children,
}: {
  value: AuthCredentials;
  children: React.ReactNode;
}) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
