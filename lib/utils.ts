import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format date to Indonesian locale with consistent timezone
 * This prevents hydration mismatch between server and client
 * @param dateString - ISO date string
 * @param format - 'long' (default) or 'short'
 */
export function formatDate(
  dateString: string | null | undefined,
  format: "long" | "short" = "long"
): string {
  if (!dateString) return format === "short" ? "Not published" : "-";
  
  try {
    const date = new Date(dateString);
    
    // Use Intl.DateTimeFormat with explicit timezone to ensure consistency
    // between server and client rendering
    const formatter = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: format === "short" ? "short" : "long",
      day: "numeric",
    });
    
    return formatter.format(date);
  } catch (error) {
    console.error("Error formatting date:", error);
    return format === "short" ? "Not published" : "-";
  }
}
