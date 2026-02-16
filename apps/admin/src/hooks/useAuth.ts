import { useState, useEffect, useCallback } from "react";
import { auth } from "@comeoffline/firebase";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          // Get token without forcing refresh to avoid quota limits
          // Only force refresh on first load or after a reasonable time
          const tokenResult = await firebaseUser.getIdTokenResult(false);
          setIsAdmin(!!tokenResult.claims.admin);
        } catch (error) {
          console.error('Failed to get token:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
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
    await signOut(auth);
  };

  const getIdToken = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    try {
      // Don't force refresh - use cached token to avoid quota limits
      // Firebase will automatically refresh when the token expires (~1 hour)
      return await user.getIdToken(false);
    } catch (error) {
      console.error('Failed to get ID token:', error);
      return null;
    }
  }, [user]);

  return { user, loading, isAdmin, login, logout, getIdToken };
}
