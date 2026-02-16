"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithCustomToken, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@comeoffline/firebase";
import { useAppStore } from "@/store/useAppStore";
import type { User } from "@comeoffline/types";

export function useAuth() {
  const [loading, setLoading] = useState(true);
  const { user, setUser, setStage } = useAppStore();

  useEffect(() => {
    let lastUserId: string | null = null; // Track last processed user to prevent duplicate fetches

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Skip if we already processed this user (prevents duplicate fetch on token handoff)
          if (lastUserId === firebaseUser.uid) {
            setLoading(false);
            return;
          }
          lastUserId = firebaseUser.uid;

          // Fetch user profile from Firestore
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = { id: userDoc.id, ...userDoc.data() } as User;
            setUser(userData);

            // Determine initial stage
            if (!userData.has_seen_welcome) {
              setStage("accepted");
            } else {
              setStage("feed");
            }
          } else {
            // User exists in auth but not in Firestore profile collection
            setUser(null);
            setStage("gate");
          }
        } else {
          lastUserId = null;
          setUser(null);
          setStage("gate");
        }
      } catch (error) {
        console.error("[useAuth] Failed to resolve auth/profile state:", error);
        setUser(null);
        setStage("gate");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [setUser, setStage]);

  const loginWithToken = async (token: string) => {
    await signInWithCustomToken(auth, token);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setStage("gate");
  };

  const getIdToken = async (): Promise<string | null> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    return currentUser.getIdToken();
  };

  return { user, loading, loginWithToken, logout, getIdToken };
}
