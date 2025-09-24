// src/auth/AuthContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";
import {
  loginUser,
  registerUser,
  resendConfirmationEmail,
  confirmEmail,
  forgotPassword as forgotPasswordApi,
  resetPassword as resetPasswordApi,
  type UserResponse,
} from "../lib/api";

// ---------- Types ----------
type User = {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  emailConfirmed?: boolean; // 🔑 optional flag
  role?: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: string | null; user?: User }>;
  signOut: () => void;
  register: (
    firstName: string,
    lastName: string,
    email: string,
    password: string
  ) => Promise<{ error: string | null; confirmUrl?: string; confirmCode?: string }>;
  resendConfirmationEmail: (
    email: string
  ) => Promise<{ error: string | null; confirmUrl?: string; confirmCode?: string }>;
  confirmEmail: (email: string, token: string, code: string) => Promise<string | null>;
  forgotPassword: (
    email: string
  ) => Promise<{
    error: string | null;
    message?: string;
    devToken?: string;
    devResetUrl?: string;
  }>;
  resetPassword: (
    resetToken: string,
    newPassword: string
  ) => Promise<{
    error: string | null;
    message?: string;
  }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const LS_USER = "deskapp:user";

type ApiErrorPayload = {
  message?: string;
  error?: string;
};

function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const payload = err.response?.data as ApiErrorPayload | undefined;
    if (payload?.message) return payload.message;
    if (payload?.error) return payload.error;
  }

  if (err instanceof Error && err.message) return err.message;

  return "Something went wrong. Please try again.";
}

// ---------- Provider ----------
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ---- Restore session on boot ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_USER);
      if (raw) {
        const parsed = JSON.parse(raw) as User;
        if (parsed?.userId && parsed?.email) {
          setUser(parsed);
        } else {
          localStorage.removeItem(LS_USER);
        }
      }
    } catch (err) {
      console.error("Error loading user from localStorage:", err);
      localStorage.removeItem(LS_USER);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ---- LOGIN ----

  const signIn: AuthContextType["signIn"] = async (email, password) => {
    try {
      const res: UserResponse = await loginUser({ email, password });

      if (!res?.userId || !res?.email) throw new Error("Invalid response from server");

      if (res.emailConfirmed === false) {
        return { error: "Please confirm your email before logging in." };
      }

      const authUser: User = {
        userId: res.userId,
        email: res.email,
        firstName: res.firstName,
        lastName: res.lastName,
        emailConfirmed: res.emailConfirmed,
        role: res.role,
      };

      localStorage.setItem(LS_USER, JSON.stringify(authUser));
      setUser(authUser);
      return { error: null, user: authUser };
    } catch (err) {
      console.error("signIn failed:", err);
      return { error: getErrorMessage(err) || "Login failed." };
    }
  };


  // ---- LOGOUT ----
  const signOut = () => {
    try {
      localStorage.removeItem(LS_USER);
    } catch (err) {
      console.error("Error clearing localStorage:", err);
    } finally {
      setUser(null);
    }
  };

  // ---- REGISTER ----
  const register: AuthContextType["register"] = async (firstName, lastName, email, password) => {
    try {
      const res = await registerUser({ firstName, lastName, email, password });
      if (!res?.user?.userId || !res?.user?.email) throw new Error("Invalid response from server");

      return {
        error: null,
        confirmUrl: res.devConfirmUrl,
        confirmCode: res.devConfirmCode,
      };
    } catch (err) {
      console.error("register failed:", err);
      return { error: getErrorMessage(err) || "Registration failed." };
    }
  };

  // ---- RESEND CONFIRMATION EMAIL ----
  const resendConfirmationEmailFn: AuthContextType["resendConfirmationEmail"] = async (email) => {
    try {
      const res = await resendConfirmationEmail({ email });
      return { error: null, confirmUrl: res.devConfirmUrl, confirmCode: res.devConfirmCode };
    } catch (err) {
      console.error("resendConfirmationEmail failed:", err);
      return { error: getErrorMessage(err) || "Failed to resend confirmation email." };
    }
  };

  // ---- CONFIRM EMAIL ----
  const confirmEmailFn: AuthContextType["confirmEmail"] = async (email, token, code) => {
    try {
      await confirmEmail(email, token, code);
      return null; // success
    } catch (err) {
      console.error("confirmEmail failed:", err);
      return getErrorMessage(err) || "Email confirmation failed.";
    }
  };

  // ---- FORGOT PASSWORD ----
  const forgotPasswordFn: AuthContextType["forgotPassword"] = async (email) => {
    try {
      const res = await forgotPasswordApi({ email });
      return {
        error: null,
        message: res.message,
        devResetUrl: res.devResetUrl,
        devToken: res.devToken,
      };
    } catch (err) {
      console.error("forgotPassword failed:", err);
      return { error: getErrorMessage(err) || "Failed to send reset link." };
    }
  };

  // ---- RESET PASSWORD ----
  const resetPasswordFn: AuthContextType["resetPassword"] = async (resetToken, newPassword) => {
    try {
      const res = await resetPasswordApi({ resetToken, newPassword });
      return {
        error: null,
        message: res.message,
      };
    } catch (err) {
      console.error("resetPassword failed:", err);
      return { error: getErrorMessage(err) || "Password reset failed." };
    }
  };

  // ---- Value ----
  const value = useMemo(
    () => ({
      user,
      isLoading,
      signIn,
      signOut,
      register,
      resendConfirmationEmail: resendConfirmationEmailFn,
      confirmEmail: confirmEmailFn,
      forgotPassword: forgotPasswordFn,
      resetPassword: resetPasswordFn,
    }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------- Hook ----------
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
