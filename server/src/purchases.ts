import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// PoC-scale placeholder product; must match client/src/purchases.ts's
// PREMIUM_PRODUCT_ID and the .storekit file's productID exactly.
export const PREMIUM_PRODUCT_ID = "de.heinbockel.classroom.premium_test";

// Resolves to server/data regardless of whether this runs from src/ (tsx
// watch) or dist/ (node dist/index.js), and regardless of the process's cwd.
const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const DATA_FILE = join(DATA_DIR, "purchases.json");

// clientId -> array of purchased product ids.
let purchases: Record<string, string[]> = {};

function load(): void {
  if (!existsSync(DATA_FILE)) return;
  try {
    purchases = JSON.parse(readFileSync(DATA_FILE, "utf-8"));
  } catch {
    purchases = {};
  }
}
load();

function persist(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(purchases, null, 2));
}

export function hasPurchased(clientId: string, productId: string = PREMIUM_PRODUCT_ID): boolean {
  return purchases[clientId]?.includes(productId) ?? false;
}

export function recordPurchase(clientId: string, productId: string): void {
  const owned = purchases[clientId] ?? (purchases[clientId] = []);
  if (!owned.includes(productId)) {
    owned.push(productId);
    persist();
  }
}
