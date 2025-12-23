/**
 * IndexedDB 快取層
 * 用於快取單字和用戶學習資料，減少網路請求
 */

import type { Word, UserWord, DeckStats } from '@/types'

const DB_NAME = 'vocab-flashcard-cache'
const DB_VERSION = 1

interface CacheMetadata {
  key: string
  lastSync: number
  version: number
}

let dbPromise: Promise<IDBDatabase> | null = null

/**
 * 初始化 IndexedDB
 */
function initDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // 單字快取
      if (!db.objectStoreNames.contains('words')) {
        const wordsStore = db.createObjectStore('words', { keyPath: 'id' })
        wordsStore.createIndex('deck_id', 'deck_id', { unique: false })
      }

      // 用戶單字快取
      if (!db.objectStoreNames.contains('userWords')) {
        const userWordsStore = db.createObjectStore('userWords', { keyPath: 'id' })
        userWordsStore.createIndex('deck_id', 'deck_id', { unique: false })
        userWordsStore.createIndex('word_id', 'word_id', { unique: false })
        userWordsStore.createIndex('user_word', ['user_id', 'word_id'], { unique: true })
      }

      // Deck 統計快取
      if (!db.objectStoreNames.contains('deckStats')) {
        db.createObjectStore('deckStats', { keyPath: 'deckId' })
      }

      // 快取元資料
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' })
      }
    }
  })

  return dbPromise
}

/**
 * 取得快取元資料
 */
async function getMetadata(key: string): Promise<CacheMetadata | null> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('metadata', 'readonly')
    const store = tx.objectStore('metadata')
    const request = store.get(key)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result || null)
  })
}

/**
 * 設定快取元資料
 */
async function setMetadata(key: string, lastSync: number): Promise<void> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('metadata', 'readwrite')
    const store = tx.objectStore('metadata')
    const request = store.put({ key, lastSync, version: DB_VERSION })
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

/**
 * 檢查快取是否過期（預設 5 分鐘）
 */
async function isCacheStale(key: string, maxAge: number = 5 * 60 * 1000): Promise<boolean> {
  const metadata = await getMetadata(key)
  if (!metadata) return true
  return Date.now() - metadata.lastSync > maxAge
}

// ============================================
// Words 快取
// ============================================

/**
 * 取得快取的單字
 */
export async function getCachedWords(deckId: string): Promise<Word[] | null> {
  try {
    const db = await initDB()
    const words = await new Promise<Word[]>((resolve, reject) => {
      const tx = db.transaction('words', 'readonly')
      const store = tx.objectStore('words')
      const index = store.index('deck_id')
      const request = index.getAll(deckId)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || [])
    })

    // 如果沒有快取資料，回傳 null
    if (words.length === 0) return null

    // 回傳資料，同時標記是否過期（讓呼叫方決定是否背景更新）
    return words
  } catch {
    return null
  }
}

/**
 * 快取單字
 */
export async function cacheWords(deckId: string, words: Word[]): Promise<void> {
  try {
    const db = await initDB()
    const tx = db.transaction('words', 'readwrite')
    const store = tx.objectStore('words')

    // 先刪除該 deck 的舊資料
    const index = store.index('deck_id')
    const existingKeys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const request = index.getAllKeys(deckId)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })

    for (const key of existingKeys) {
      store.delete(key)
    }

    // 寫入新資料
    for (const word of words) {
      store.put(word)
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })

    await setMetadata(`words-${deckId}`, Date.now())
  } catch (e) {
    console.warn('Failed to cache words:', e)
  }
}

// ============================================
// UserWords 快取
// ============================================

/**
 * 取得快取的用戶單字
 */
export async function getCachedUserWords(deckId: string, userId: string): Promise<UserWord[] | null> {
  try {
    const cacheKey = `userWords-${userId}-${deckId}`

    const db = await initDB()
    const userWords = await new Promise<UserWord[]>((resolve, reject) => {
      const tx = db.transaction('userWords', 'readonly')
      const store = tx.objectStore('userWords')
      const index = store.index('deck_id')
      const request = index.getAll(deckId)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        // 過濾出當前用戶的資料
        const filtered = (request.result || []).filter(uw => uw.user_id === userId)
        resolve(filtered)
      }
    })

    if (userWords.length === 0) {
      // 檢查是否有快取元資料（區分「沒資料」和「從未快取」）
      const metadata = await getMetadata(cacheKey)
      return metadata ? [] : null
    }

    return userWords
  } catch {
    return null
  }
}

/**
 * 快取用戶單字
 */
export async function cacheUserWords(deckId: string, userId: string, userWords: UserWord[]): Promise<void> {
  try {
    const db = await initDB()
    const tx = db.transaction('userWords', 'readwrite')
    const store = tx.objectStore('userWords')

    // 先刪除該用戶該 deck 的舊資料
    const index = store.index('deck_id')
    const existing = await new Promise<UserWord[]>((resolve, reject) => {
      const request = index.getAll(deckId)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || [])
    })

    for (const uw of existing) {
      if (uw.user_id === userId) {
        store.delete(uw.id)
      }
    }

    // 寫入新資料
    for (const uw of userWords) {
      store.put(uw)
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })

    await setMetadata(`userWords-${userId}-${deckId}`, Date.now())
  } catch (e) {
    console.warn('Failed to cache user words:', e)
  }
}

/**
 * 更新單一用戶單字快取（複習後）
 */
export async function updateCachedUserWord(userWord: UserWord): Promise<void> {
  try {
    const db = await initDB()
    const tx = db.transaction('userWords', 'readwrite')
    const store = tx.objectStore('userWords')
    store.put(userWord)

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (e) {
    console.warn('Failed to update cached user word:', e)
  }
}

// ============================================
// DeckStats 快取
// ============================================

export interface CachedDeckStats extends DeckStats {
  deckId: string
  cachedAt: number
}

/**
 * 取得快取的 deck 統計
 */
export async function getCachedDeckStats(deckId: string): Promise<CachedDeckStats | null> {
  try {
    const db = await initDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('deckStats', 'readonly')
      const store = tx.objectStore('deckStats')
      const request = store.get(deckId)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  } catch {
    return null
  }
}

/**
 * 取得所有快取的 deck 統計
 */
export async function getAllCachedDeckStats(): Promise<CachedDeckStats[]> {
  try {
    const db = await initDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('deckStats', 'readonly')
      const store = tx.objectStore('deckStats')
      const request = store.getAll()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || [])
    })
  } catch {
    return []
  }
}

/**
 * 批量快取 deck 統計
 */
export async function cacheDeckStats(stats: CachedDeckStats[]): Promise<void> {
  try {
    const db = await initDB()
    const tx = db.transaction('deckStats', 'readwrite')
    const store = tx.objectStore('deckStats')

    for (const stat of stats) {
      store.put(stat)
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (e) {
    console.warn('Failed to cache deck stats:', e)
  }
}

/**
 * 清除特定 deck 的統計快取
 */
export async function invalidateDeckStats(deckId: string): Promise<void> {
  try {
    const db = await initDB()
    const tx = db.transaction('deckStats', 'readwrite')
    const store = tx.objectStore('deckStats')
    store.delete(deckId)

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (e) {
    console.warn('Failed to invalidate deck stats:', e)
  }
}

// ============================================
// 快取工具
// ============================================

/**
 * 清除所有快取
 */
export async function clearAllCache(): Promise<void> {
  try {
    const db = await initDB()
    const storeNames = ['words', 'userWords', 'deckStats', 'metadata']

    for (const storeName of storeNames) {
      const tx = db.transaction(storeName, 'readwrite')
      tx.objectStore(storeName).clear()
      await new Promise<void>((resolve) => {
        tx.oncomplete = () => resolve()
      })
    }
  } catch (e) {
    console.warn('Failed to clear cache:', e)
  }
}

/**
 * 檢查快取是否需要更新
 */
export async function shouldRefreshCache(key: string, maxAge: number = 5 * 60 * 1000): Promise<boolean> {
  return isCacheStale(key, maxAge)
}
