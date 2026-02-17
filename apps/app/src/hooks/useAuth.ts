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

          // If TheGate or useTokenHandoff already set this user in the store (from API response),
          // skip the Firestore fetch — we already have the data and the token
          // may not be fully authorized for Firestore reads yet.
          // useStage will derive the correct stage from the user data.
          const storeUser = useAppStore.getState().user;
          if (storeUser && storeUser.id === firebaseUser.uid) {
            setLoading(false);
            return;
          }

          // Fetch user profile from Firestore
          try {
            const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
            if (userDoc.exists()) {
              const userData = { id: userDoc.id, ...userDoc.data() } as User;
              setUser(userData);
              // useStage will derive the correct stage from userData
            } else {
              // User exists in auth but not yet in Firestore — may still be propagating
              // from the Admin SDK write. Only reset if the store doesn't already have this user.
              const currentUser = useAppStore.getState().user;
              if (!currentUser || currentUser.id !== firebaseUser.uid) {
                setUser(null);
                setStage("gate");
              }
            }
          } catch (firestoreErr) {
            // Firestore read failed (e.g. rules not deployed, permissions error).
            // Fall back to fetching profile from the API instead.
            console.warn("[useAuth] Firestore read failed, falling back to API:", firestoreErr);
            try {
              const token = await firebaseUser.getIdToken();
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"}/api/users/me`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                const data = await res.json();
                if (data.data) {
                  const userData = data.data as User;
                  setUser(userData);
                  // useStage will derive the correct stage from userData
                }
              }
            } catch (apiErr) {
              console.error("[useAuth] API fallback also failed:", apiErr);
            }
          }
        } else {
          lastUserId = null;
          setUser(null);
          setStage("gate");
        }
      } catch (error) {
        console.error("[useAuth] Failed to resolve auth/profile state:", error);
        // Only reset if the store doesn't already have a valid user
        // (TheGate may have set the user directly from the API response)
        const currentUser = useAppStore.getState().user;
        if (!currentUser) {
          setUser(null);
          setStage("gate");
        }
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
