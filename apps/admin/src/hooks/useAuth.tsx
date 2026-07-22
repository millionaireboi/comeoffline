"use client";

import { useState, useEffect, useCallback, useContext, createContext, type ReactNode } from "react";
import { auth } from "@comeoffline/firebase";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  /** Team role custom claim (e.g. "creator_ops") — null for full admins
   *  and for accounts with no access */
  role: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          const tokenResult = await firebaseUser.getIdTokenResult(false);
          const admin = !!tokenResult.claims.admin;
          const teamRole = typeof tokenResult.claims.role === "string" ? (tokenResult.claims.role as string) : null;
          setIsAdmin(admin);
          setRole(teamRole);
          // Team roles need the session cookie too — the Next middleware
          // only checks presence; real authorization happens API-side.
          if (admin || teamRole) {
            const token = await firebaseUser.getIdToken();
            document.cookie = `admin_session=${token}; path=/; samesite=strict; secure; max-age=3600`;
          }
        } catch (error) {
          console.error('Failed to get token:', error);
          setIsAdmin(false);
          setRole(null);
        }
      } else {
        setIsAdmin(false);
        setRole(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    document.cookie = "admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    await signOut(auth);
  };

  const getIdToken = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    try {
      return await user.getIdToken(false);
    } catch (error) {
      console.error('Failed to get ID token:', error);
      return null;
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, role, login, logout, getIdToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
