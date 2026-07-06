"use client";

/**
 * Module-level toast bus — any tab can call toast.success()/error()/info()
 * without context plumbing. <Toaster /> (mounted once in page.tsx) renders
 * the stack. Replaces the three inconsistent feedback patterns the panel
 * had: inline banners, window.alert, and silent console.error.
 */
export type ToastKind = "success" | "error" | "info";

export interface ToastItem {
  id: number;
  text: string;
  kind: ToastKind;
}

type Listener = (t: ToastItem) => void;

let listeners: Listener[] = [];
let nextId = 1;

export function subscribeToasts(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

function emit(text: string, kind: ToastKind) {
  const item = { id: nextId++, text, kind };
  listeners.forEach((l) => l(item));
}

export const toast = {
  success: (text: string) => emit(text, "success"),
  error: (text: string) => emit(text, "error"),
  info: (text: string) => emit(text, "info"),
};
