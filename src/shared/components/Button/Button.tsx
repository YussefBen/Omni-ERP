import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function Button({ children, variant = 'primary', className, ...rest }: ButtonProps) {
  const variantClass = styles[variant];
  return (
    <button className={`${styles.button} ${variantClass} ${className ?? ''}`} {...rest}>
      {children}
    </button>
  );
}