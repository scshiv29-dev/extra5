import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function extractServerIp(apiUrl: string | URL) {
  try {
    const url = new URL(apiUrl);
    return url.hostname;
  } catch (error) {
    console.error("Invalid API URL", error);
    return null;
  }
}
