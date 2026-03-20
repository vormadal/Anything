import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Returns true only for http:// or https:// URLs to prevent javascript: and other dangerous schemes. */
export function isSafeUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}
