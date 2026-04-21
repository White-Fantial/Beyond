/** Returns the storeId if the pathname is under /owner/stores/[storeId], otherwise null. */
export function extractOwnerStoreId(pathname: string): string | null {
  return pathname.match(/^\/owner\/stores\/([^/]+)/)?.[1] ?? null;
}
