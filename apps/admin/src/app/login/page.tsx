"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@comeoffline/firebase";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { LoginScreen } from "@/components/tabs/LoginScreen";

function setSessionCookie(token: string) {
  document.cookie = `admin_session=${token}; path=/; samesite=strict; max-age=3600`;
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const tokenResult = await user.getIdTokenResult();
          if (tokenResult.claims.admin) {
            setSessionCookie(await user.getIdToken());
            router.replace(searchParams.get("redirect") || "/");
            return;
          }
        } catch {
          // Fall through to show login
        }
      }
      setChecking(false);
    });
    return unsubscribe;
  }, [router, searchParams]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gate-black">
        <p className="font-mono text-sm text-muted">loading...</p>
      </div>
    );
  }

  const handleLogin = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const tokenResult = await cred.user.getIdTokenResult();
    if (!tokenResult.claims.admin) {
      throw new Error("Not an admin");
    }
    const token = await cred.user.getIdToken();
    setSessionCookie(token);
    router.replace(searchParams.get("redirect") || "/");
  };

  return <LoginScreen onLogin={handleLogin} />;
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gate-black">
          <p className="font-mono text-sm text-muted">loading...</p>
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
