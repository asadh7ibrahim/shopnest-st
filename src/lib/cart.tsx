"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  variantName: string;
  price: number;
  image: string | null;
  quantity: number;
  stock: number;
};

/** Fresh data for a variant, returned by the `getVariantsInfo` server action. */
export type VariantInfo = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  variantName: string;
  price: number;
  image: string | null;
  stock: number;
};

type CartContextValue = {
  items: CartItem[];
  hydrated: boolean;
  count: number;
  subtotal: number;
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  /** Replace prices/stock with server data; drops items that no longer exist. */
  sync: (infos: VariantInfo[]) => void;
};

const STORAGE_KEY = "shopnest:cart:v1";
const MAX_QTY = 100;

const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (i): i is CartItem =>
          !!i &&
          typeof i.variantId === "string" &&
          typeof i.quantity === "number" &&
          typeof i.price === "number",
      )
      .slice(0, 50);
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load once on the client (avoids hydration mismatch)
  useEffect(() => {
    setItems(readStorage());
    setHydrated(true);
  }, []);

  // Persist + keep tabs in sync
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage full / disabled: cart still works for this session */
    }
  }, [items, hydrated]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setItems(readStorage());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback<CartContextValue["add"]>((item, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === item.variantId);
      const limit = Math.max(1, Math.min(MAX_QTY, item.stock));
      if (existing) {
        return prev.map((i) =>
          i.variantId === item.variantId
            ? { ...i, ...item, quantity: Math.min(limit, i.quantity + quantity) }
            : i,
        );
      }
      return [...prev, { ...item, quantity: Math.min(limit, quantity) }];
    });
  }, []);

  const setQuantity = useCallback((variantId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.variantId === variantId
          ? {
              ...i,
              quantity: Math.max(1, Math.min(MAX_QTY, Math.max(1, i.stock), quantity)),
            }
          : i,
      ),
    );
  }, []);

  const remove = useCallback((variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const sync = useCallback((infos: VariantInfo[]) => {
    const byId = new Map(infos.map((i) => [i.variantId, i]));
    setItems((prev) => {
      const next: CartItem[] = [];
      for (const item of prev) {
        const info = byId.get(item.variantId);
        if (!info) continue; // deleted / inactive
        next.push({
          ...item,
          ...info,
          quantity: info.stock > 0 ? Math.min(item.quantity, info.stock) : item.quantity,
        });
      }
      return next;
    });
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      hydrated,
      count: items.reduce((n, i) => n + i.quantity, 0),
      subtotal: items.reduce((n, i) => n + i.price * i.quantity, 0),
      add,
      setQuantity,
      remove,
      clear,
      sync,
    }),
    [items, hydrated, add, setQuantity, remove, clear, sync],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
