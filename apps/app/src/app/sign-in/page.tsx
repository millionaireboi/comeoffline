"use client";

import { SignInScreen } from "@/components/gates/SignInScreen";

export default function SignInPage() {
  return (
    <SignInScreen
      onBack={() => {
        if (typeof window !== "undefined") {
          window.location.href = "/";
        }
      }}
    />
  );
}
