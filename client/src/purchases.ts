import { Capacitor } from "@capacitor/core";
import { NativePurchases, PURCHASE_TYPE } from "@capgo/native-purchases";
import { socket } from "./socket";

// Must match server/src/purchases.ts's PREMIUM_PRODUCT_ID and the .storekit
// file's productID exactly.
export const PREMIUM_PRODUCT_ID = "de.heinbockel.classroom.premium_test";

export const purchasesAvailable = (): boolean => Capacitor.isNativePlatform();

export function fetchPurchaseStatus(clientId: string): Promise<boolean> {
  return new Promise((resolve) => {
    socket.emit("purchase:status", { clientId }, (res) => resolve(res.purchased));
  });
}

export async function buyPremiumTest(clientId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!purchasesAvailable()) return { ok: false, error: "Käufe sind nur in der iOS-App verfügbar." };
  try {
    await NativePurchases.purchaseProduct({
      productIdentifier: PREMIUM_PRODUCT_ID,
      productType: PURCHASE_TYPE.INAPP,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Kauf fehlgeschlagen." };
  }
  return new Promise((resolve) => {
    socket.emit("purchase:record", { clientId, productId: PREMIUM_PRODUCT_ID }, resolve);
  });
}
