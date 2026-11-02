"use client";

import { useEffect, useRef } from "react";
import { getVariantsInfo } from "@/app/actions/cart";
import { useCart } from "@/lib/cart";

/**
 * Refreshes prices / stock / availability of the cart lines from the server once
 * per page view, so customers never see stale data (the server re-validates anyway).
 */
export function useCartSync() {
  const { items, hydrated, sync } = useCart();
  const done = useRef(false);

  useEffect(() => {
    if (!hydrated || done.current) return;
    done.current = true;
    if (items.length === 0) return;
    getVariantsInfo(items.map((i) => i.variantId))
      .then(sync)
      .catch(() => {
        /* offline: keep local data */
      });
  }, [hydrated, items, sync]);
}
