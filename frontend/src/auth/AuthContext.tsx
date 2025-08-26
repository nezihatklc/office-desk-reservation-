// Global auth state stored in Context. Uses localStorage for demo purposes.
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type User = { email: string };

type AuthContextType = {
  user: User | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => void;
  register: (email: string, password: string, confirm: string) => Promise<string | null>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LS_USER  = "deskapp:user";
const LS_USERS = "deskapp:users"; // array of { email, password } (mock database)

type StoredUser = { email: string; password: string };

function getUsers(): StoredUser[] {
  try { return JSON.parse(localStorage.getItem(LS_USERS) || "[]"); }
  catch { return []; }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Load session on boot
  useEffect(() => {
    const raw = localStorage.getItem(LS_USER);
    if (raw) setUser(JSON.parse(raw));
  }, []);

  const signIn: AuthContextType["signIn"] = async (email, password) => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return "Please enter a valid email.";
    if (password.length < 8) return "Password must be at least 8 characters.";

    const users = getUsers();
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!found) return "Account not found. Please register.";
    if (found.password !== password) return "Incorrect password.";

    const u = { email: found.email };
    localStorage.setItem(LS_USER, JSON.stringify(u));
    setUser(u);
    return null;
  };

  const signOut = () => {
    localStorage.removeItem(LS_USER);
    setUser(null);
  };

  const register: AuthContextType["register"] = async (email, password, confirm) => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return "Please enter a valid email.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password !== confirm) return "Passwords do not match.";

    const users = getUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return "This email is already registered.";
    }
    users.push({ email, password });
    localStorage.setItem(LS_USERS, JSON.stringify(users));
    return null;
  };

  const value = useMemo(() => ({ user, signIn, signOut, register }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
