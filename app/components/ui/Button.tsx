import type { ButtonHTMLAttributes } from "react";
import "./ui.css";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
  shape?: "pill" | "rounded";
};

export function Button({ variant = "primary", shape = "pill", className = "", ...rest }: ButtonProps) {
  return (
    <button
      className={`btn btn--${variant} btn--${shape} ${className}`.trim()}
      {...rest}
    />
  );
}
