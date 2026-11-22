type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function explanationDraftKey(userId: string, reviewId: number) {
  return `dsa-recall:explanation:${userId}:${reviewId}`
}
export function readDraft(storage: DraftStorage, key: string) { return storage.getItem(key) ?? '' }
export function writeDraft(storage: DraftStorage, key: string, value: string) { storage.setItem(key, value) }
export function clearDraft(storage: DraftStorage, key: string) { storage.removeItem(key) }
