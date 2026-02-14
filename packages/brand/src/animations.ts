/** Framer Motion animation presets for Come Offline */
import type { Variants, Transition } from "framer-motion";

/** Standard spring transition */
export const spring: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 20,
};

/** Smooth ease transition */
export const smooth: Transition = {
  duration: 0.6,
  ease: [0.16, 1, 0.3, 1],
};

/** Fade + slide up (most common entry) */
export const fadeSlideUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: smooth },
};

/** Fade + slide down */
export const fadeSlideDown: Variants = {
  hidden: { opacity: 0, y: -12 },
  visible: { opacity: 1, y: 0, transition: smooth },
};

/** Scale in (modals, celebrations) */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: spring },
};

/** Shake animation (error/rejection) */
export const shake: Variants = {
  shake: {
    x: [0, -4, 4, -4, 4, 0],
    transition: { duration: 0.4 },
  },
};

/** Stagger children */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

/** Sticker badge stamp-in */
export const stickerDrop: Variants = {
  hidden: { scale: 0, rotate: -20 },
  visible: {
    scale: 1,
    rotate: "var(--rotation, -3deg)" as unknown as number,
    transition: { type: "spring", stiffness: 300, damping: 15 },
  },
};

/** Code reveal (vouch codes) */
export const codeReveal: Variants = {
  hidden: { letterSpacing: "12px", opacity: 0, filter: "blur(8px)" },
  visible: {
    letterSpacing: "4px",
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: 0.6 },
  },
};

/** Chat slide in from bottom */
export const chatSlideIn: Variants = {
  hidden: { opacity: 0, y: "100%", scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { ...smooth, duration: 0.4 } },
  exit: { opacity: 0, y: "100%", scale: 0.95, transition: { duration: 0.3 } },
};

/** Confetti fall */
export const confettiFall = (delay: number, duration: number) => ({
  initial: { y: "-10vh", rotate: 0, opacity: 1 },
  animate: {
    y: "100vh",
    rotate: 720,
    opacity: 0,
    transition: { duration, delay, ease: "easeIn" },
  },
});

/** Glitch text characters for scramble effect */
export const GLITCH_CHARS = "!@#$%^&*_+=~?░▒▓█▄▀÷×±∞≠≈∆∂∑∏";
