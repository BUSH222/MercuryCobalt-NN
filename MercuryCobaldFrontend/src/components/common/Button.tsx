import type { ButtonHTMLAttributes } from "react";
import { Icon, type IconName } from "./Icon";
import styles from "./Button.module.css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "danger" | "ghost";
  icon?: IconName;
}

export function Button({ variant = "default", icon, className, children, ...rest }: ButtonProps) {
  const variantClass = variant === "default" ? "" : styles[variant];
  return (
    <button type="button" className={`${styles.button} ${variantClass} ${className ?? ""}`} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}
