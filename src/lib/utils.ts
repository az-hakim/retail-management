import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a UUIDv7 (time-ordered UUID)
 */
export function generateUUIDv7(): string {
  const now = Date.now();
  const timeHex = now.toString(16).padStart(12, '0');
  
  // Random bytes for the rest
  const randomBytes = new Uint8Array(10);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < 10; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }

  const randHex = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // UUIDv7 format: 8-4-4-4-12
  // unix_ts_ms (48 bits / 12 hex) - ver(4) + rand (12 bits / 3 hex) - var(2) + rand (14 bits / 4 hex) - rand (48 bits / 12 hex)
  const part1 = timeHex.slice(0, 8);
  const part2 = timeHex.slice(8, 12);
  const part3 = '7' + randHex.slice(0, 3);
  const part4 = ((parseInt(randHex.slice(3, 4), 16) & 0x3) | 0x8).toString(16) + randHex.slice(4, 7);
  const part5 = randHex.slice(7, 19);

  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}

export function formatCurrency(amount: number, symbol: string = '$'): string {
  const safeAmount = isNaN(amount) ? 0 : amount;
  return `${symbol}${safeAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

/**
 * Audio feedback for barcode scanning using the Web Audio API
 * Requires zero external audio files.
 */
export function playScanBeep(success = true) {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (success) {
      // Pleasant high-pitched scan confirmation beep
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, ctx.currentTime); // A6
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } else {
      // Low dual buzz for error
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch {
    // AudioContext might be blocked until user gesture, ignore silently
  }
}
