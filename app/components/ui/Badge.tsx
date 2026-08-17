import { motion } from "framer-motion";
import { popIn } from "../motion/variants";
import "./ui.css";

export type BadgeTone =
  | "severity-low"
  | "severity-medium"
  | "severity-high"
  | "severity-critical"
  | "disabled"
  | "neutral";

/**
 * `animated` uses the `popIn` scale+fade variant — pair the conditional render of
 * `<Badge animated />` with an `AnimatePresence` in the parent so exit plays on unmount
 * (mirrors how the "Disabled" tag worked before extraction).
 */
export function Badge({
  tone,
  children,
  animated = false,
  ariaLabel,
  title,
}: {
  tone: BadgeTone;
  children?: React.ReactNode;
  animated?: boolean;
  ariaLabel?: string;
  title?: string;
}) {
  if (!animated) {
    return (
      <span className={`badge badge--${tone}`} aria-label={ariaLabel} title={title}>
        {children}
      </span>
    );
  }

  return (
    <motion.span
      className={`badge badge--${tone}`}
      aria-label={ariaLabel}
      title={title}
      variants={popIn}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.15 }}
    >
      {children}
    </motion.span>
  );
}
