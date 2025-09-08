import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loginUser, registerUser, type UserResponse } from "../lib/api";

type User = {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>; // uses /api/Users/login
  signOut: () => void;
  register: (firstName: string, lastName: string, email: string, password: string) => Promise<string | null>; // uses /api/Users/register
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LS_USER = "deskapp:user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Add loading state for initial load

  // Load session on boot
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_USER);
      if (raw) {
        const userData = JSON.parse(raw);
        // Validate the stored data structure
        if (userData && userData.userId && userData.email) {
          setUser(userData);
        } else {
          // Clear invalid data
          localStorage.removeItem(LS_USER);
        }
      }
    } catch (error) {
      console.error("Error loading user from localStorage:", error);
      localStorage.removeItem(LS_USER);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ---- LOGIN ----
  const signIn: AuthContextType["signIn"] = async (email, password) => {
    try {
      // this calls your backend endpoint POST /api/Users/login
      const u: UserResponse = await loginUser({ email, password });
      
      // Validate response
      if (!u || !u.userId || !u.email) {
        throw new Error("Invalid response from server");
      }

      const authUser: User = {
        userId: u.userId,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
      };
      
      // Store in localStorage and update state
      localStorage.setItem(LS_USER, JSON.stringify(authUser));
      setUser(authUser);
      return null; // Success
    } catch (err: any) {
      console.error("signIn failed:", err);
      return err?.message || "Login failed.";
    }
  };

  // ---- LOGOUT ----
  const signOut = () => {
    try {
      localStorage.removeItem(LS_USER);
      setUser(null);
    } catch (error) {
      console.error("Error during signOut:", error);
      // Still clear the user state even if localStorage fails
      setUser(null);
    }
  };

  // ---- REGISTER ----
  const register: AuthContextType["register"] = async (firstName, lastName, email, password) => {
    try {
      // this calls your backend endpoint POST /api/Users/register
      const u: UserResponse = await registerUser({ firstName, lastName, email, password });
      
      // Validate response
      if (!u || !u.userId || !u.email) {
        throw new Error("Invalid response from server");
      }

      const authUser: User = {
        userId: u.userId,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
      };
      
      // Store in localStorage and update state
      localStorage.setItem(LS_USER, JSON.stringify(authUser));
      setUser(authUser);
      return null; // Success
    } catch (err: any) {
      console.error("register failed:", err);
      return err?.message || "Registration failed.";
    }
  };

  const value = useMemo(() => ({ 
    user, 
    isLoading, 
    signIn, 
    signOut, 
    register 
  }), [user, isLoading]);
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}