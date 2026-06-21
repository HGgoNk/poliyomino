import { DEFAULT_DECK, LOCKABLE_BLOCK_IDS } from "../constants/gameData";
import { isValidSpecialPiece } from "./specials";
import type { PieceTemplate } from "../types";

// Special blocks earned across games are kept here so up to MAX_LOADOUT can be carried into
// the next game (chosen from the start-screen deck), alongside a customizable base deck.
const STASH_KEY = "block-blast-special-stash";
const LOADOUT_KEY = "block-blast-special-loadout";
const BASE_LOADOUT_KEY = "block-blast-base-loadout";
const UNLOCKED_KEY = "block-blast-unlocked-blocks";

export const MAX_STASH = 24;
export const MAX_LOADOUT = 3;
export const MAX_BASE_DECK = 20;

// Any catalog id is a valid base-deck entry; locked ones are filtered out at game start.
const ALL_BASE_IDS = new Set([...DEFAULT_DECK, ...LOCKABLE_BLOCK_IDS]);
const LOCKABLE_SET = new Set(LOCKABLE_BLOCK_IDS);

export function loadStash(): PieceTemplate[] {
  try {
    const raw = localStorage.getItem(STASH_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed.filter(isValidSpecialPiece) as PieceTemplate[]) : [];
  } catch {
    return [];
  }
}

export function saveStash(stash: PieceTemplate[]): void {
  try {
    localStorage.setItem(STASH_KEY, JSON.stringify(stash));
  } catch {
    // ignore quota / serialization errors
  }
}

// Add a newly earned special, de-duplicated by id (type + shape), capped to MAX_STASH (oldest dropped).
export function addToStash(stash: PieceTemplate[], piece: PieceTemplate): PieceTemplate[] {
  if (stash.some((entry) => entry.id === piece.id)) return stash;
  const next = [...stash, piece];
  return next.length > MAX_STASH ? next.slice(next.length - MAX_STASH) : next;
}

export function loadLoadout(): string[] {
  try {
    const raw = localStorage.getItem(LOADOUT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return (parsed.filter((id) => typeof id === "string") as string[]).slice(0, MAX_LOADOUT);
  } catch {
    return [];
  }
}

export function saveLoadout(ids: string[]): void {
  try {
    localStorage.setItem(LOADOUT_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

// Resolve selected loadout ids into the matching stash templates (preserving duplicates/order).
export function getLoadoutPieces(stash: PieceTemplate[], loadoutIds: string[]): PieceTemplate[] {
  return loadoutIds
    .map((id) => stash.find((piece) => piece.id === id))
    .filter((piece): piece is PieceTemplate => piece !== undefined);
}

// The base deck the player carries into the next game — a list of base piece ids, duplicates
// allowed (to weight the tray), capped to MAX_BASE_DECK. Defaults to the full base catalog.
export function loadBaseLoadout(): string[] {
  try {
    const raw = localStorage.getItem(BASE_LOADOUT_KEY);
    if (!raw) return [...DEFAULT_DECK];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_DECK];
    const ids = parsed.filter((id) => typeof id === "string" && ALL_BASE_IDS.has(id)) as string[];
    return ids.length ? ids.slice(0, MAX_BASE_DECK) : [...DEFAULT_DECK];
  } catch {
    return [...DEFAULT_DECK];
  }
}

export function saveBaseLoadout(ids: string[]): void {
  try {
    localStorage.setItem(BASE_LOADOUT_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

// Non-tetromino base shapes the player has unlocked through play.
export function loadUnlockedBlocks(): string[] {
  try {
    const raw = localStorage.getItem(UNLOCKED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((id) => typeof id === "string" && LOCKABLE_SET.has(id)) as string[])];
  } catch {
    return [];
  }
}

export function saveUnlockedBlocks(ids: string[]): void {
  try {
    localStorage.setItem(UNLOCKED_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export function addUnlockedBlock(unlocked: string[], id: string): string[] {
  return unlocked.includes(id) ? unlocked : [...unlocked, id];
}
