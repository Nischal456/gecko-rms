if (typeof process !== 'undefined') {
  process.env.TZ = "UTC";
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- KATHMANDU SESSION Rollover CONFIG ---
export const KATHMANDU_OFFSET_MS = 20700000; // +5:45 static offset
export const BUSINESS_DAY_ROLLOVER_HOUR = 5;  // Business day boundary starts at 05:00 AM local time

/**
 * Deterministically generates the business date for a given timestamp based on the Kathmandu 05:00 AM cutoff rule.
 * Business day starts at 05:00 AM Asia/Kathmandu time and ends at 04:59:59 AM next day.
 */
export function getBusinessDate(timestamp?: Date | string | number): string {
    const date = timestamp ? new Date(timestamp) : new Date();
    if (isNaN(date.getTime())) return "";

    const utcMs = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
    const ktmDate = new Date(utcMs + KATHMANDU_OFFSET_MS);
    const hour = ktmDate.getHours();

    if (hour < BUSINESS_DAY_ROLLOVER_HOUR) {
        const yesterday = new Date(ktmDate.getTime() - 24 * 60 * 60 * 1000);
        const y = yesterday.getFullYear();
        const m = String(yesterday.getMonth() + 1).padStart(2, '0');
        const d = String(yesterday.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    const y = ktmDate.getFullYear();
    const m = String(ktmDate.getMonth() + 1).padStart(2, '0');
    const d = String(ktmDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function getKathmanduDateString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kathmandu',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  
  return `${year}-${month}-${day}`;
}

export function getBusinessDateKTM(timestamp: Date | string = new Date()): string {
    return getBusinessDate(timestamp);
}

export function getBusinessDateStrOfTimestamp(dateOrString: Date | string): string {
    return getBusinessDate(dateOrString);
}

export function offsetDateString(dateStr: string, offsetDays: number): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + offsetDays);
    const rYear = date.getFullYear();
    const rMonth = String(date.getMonth() + 1).padStart(2, '0');
    const rDay = String(date.getDate()).padStart(2, '0');
    return `${rYear}-${rMonth}-${rDay}`;
}

