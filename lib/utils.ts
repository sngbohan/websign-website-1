// shadcn-Standard: Klassen zusammenführen (clsx) und Tailwind-Konflikte auflösen (tailwind-merge)
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
