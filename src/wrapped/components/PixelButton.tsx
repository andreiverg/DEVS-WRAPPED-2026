import type { ButtonHTMLAttributes } from "react";

/** The one button component in the system. */
export function PixelButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} />;
}
