import type { Variants } from "framer-motion";

/** Simple opacity fade — used by overlay backdrops. */
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/** Panel slides in from the right — used by the drawer. */
export const slideInRight: Variants = {
  initial: { x: 24, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: 24, opacity: 0 },
};

/** Menu "baja suavemente" — slides down softly while fading in. */
export const slideDown: Variants = {
  initial: { opacity: 0, y: -6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

/** List row enter/exit, paired with `layout` on the element. */
export const listItem: Variants = {
  initial: { opacity: 0, y: -6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

/** Badge/pill pop-in, e.g. the "Disabled" tag. */
export const popIn: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

/** Horizontal crossfade between steps of a wizard, e.g. the rule drawer. */
export const stepFade: Variants = {
  initial: { opacity: 0, x: 8 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -8 },
};

/** Shared transition curves, kept alongside the variants that use them. */
export const easeOut = { duration: 0.18, ease: "easeOut" } as const;
