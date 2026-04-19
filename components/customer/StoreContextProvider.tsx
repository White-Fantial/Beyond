"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export interface StoreContext {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  storeId: string;
  storeName: string;
  storeCode: string;
  isMultiStore: boolean;
}

interface StoreContextValue {
  ctx: StoreContext;
  switchStore: (storeId: string) => Promise<void>;
}

const StoreContextCtx = createContext<StoreContextValue | null>(null);

interface Props {
  initialContext: StoreContext;
  children: ReactNode;
}

/**
 * Provides the resolved store context to all child components.
 * Also persists the storeId to the `beyond_store_ctx` cookie on mount
 * and whenever the store changes.
 */
export function StoreContextProvider({ initialContext, children }: Props) {
  const [ctx, setCtx] = useState<StoreContext>(initialContext);

  // Persist the resolved storeId on first render (e.g. after ?s= query resolved server-side)
  useEffect(() => {
    persistStoreId(initialContext.storeId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const switchStore = useCallback(async (storeId: string) => {
    await persistStoreId(storeId);
    // Reload to re-run server-side resolution with the new cookie
    window.location.reload();
  }, []);

  return (
    <StoreContextCtx.Provider value={{ ctx, switchStore }}>
      {children}
    </StoreContextCtx.Provider>
  );
}

export function useStoreContext(): StoreContextValue {
  const value = useContext(StoreContextCtx);
  if (!value) {
    throw new Error("useStoreContext must be used inside StoreContextProvider");
  }
  return value;
}

async function persistStoreId(storeId: string): Promise<void> {
  try {
    await fetch("/api/customer/store-context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId }),
    });
  } catch (err) {
    // Non-critical — cookie will be set by server on next navigation
    console.warn("[StoreContextProvider] Failed to persist store context:", err);
  }
}
