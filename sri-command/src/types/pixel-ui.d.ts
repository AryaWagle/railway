declare module "@joacod/pixel-ui" {
  import type { ButtonHTMLAttributes, ReactNode } from "react";

  export const Button: React.ForwardRefExoticComponent<
    ButtonHTMLAttributes<HTMLButtonElement> & {
      variant?: string;
      size?: string;
      loading?: boolean;
      children?: ReactNode;
    }
  >;

  export function cn(...inputs: unknown[]): string;
}
