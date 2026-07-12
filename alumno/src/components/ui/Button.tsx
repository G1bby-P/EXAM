"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./ui.module.css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  icon?: ReactNode;
}

export function Button({ variant = "primary", icon, children, className, ...props }: ButtonProps) {
  return (
    <button className={[styles.button, styles[variant], className].filter(Boolean).join(" ")} {...props}>
      {icon}
      {children ? <span>{children}</span> : null}
    </button>
  );
}
