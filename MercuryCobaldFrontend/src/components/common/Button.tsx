import type { ButtonHTMLAttributes } from "react";
import { Icon, type IconName } from "./Icon";
import { Spinner } from "./Spinner";
import styles from "./Button.module.css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "danger" | "ghost";
  icon?: IconName;
  loading?: boolean;
}

export function Button({ variant = "default", icon, loading, className, children, disabled, ...rest }: ButtonProps) {
  const variantClass = variant === "default" ? "" : styles[variant];
  return (
    <button
      type="button"
      className={`${styles.button} ${variantClass} ${className ?? ""}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner size={14} /> : icon && <Icon name={icon} />}
      {children}
    </button>
  );
}
