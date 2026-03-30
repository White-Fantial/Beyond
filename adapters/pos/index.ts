import { PosAdapterConfig, PosOrderData } from "./types";

export interface PosAdapter {
  readonly provider: string;
  connect(config: PosAdapterConfig): Promise<void>;
  fetchOrders(storeId: string, since?: Date): Promise<PosOrderData[]>;
  healthCheck(): Promise<boolean>;
}

export function createPosAdapter(_provider: string): PosAdapter {
  throw new Error(`POS adapter for provider "${_provider}" is not yet implemented. Add it to adapters/pos/`);
}
