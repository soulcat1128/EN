/**
 * Decks 資料存取層
 */

import { supabase } from './client'
import type { Deck, DeckStats } from '@/types'
import {
  getAllCachedDeckStats,
  cacheDeckStats,
  type CachedDeckStats,
} from '@/lib/cache/indexedDB'

/**
 * 取得所有可存取的 decks（公開或自己的）
 */
export async function getDecks(): Promise<Deck[]> {
  const { data, error } = await supabase
    .from('decks')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * 取得單一 deck
 */
export async function getDeck(deckId: string): Promise<Deck | null> {
  const { data, error } = await supabase
    .from('decks')
    .select('*')
    .eq('id', deckId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }
  return data
}

/**
 * 取得 deck 統計資訊
 */
export async function getDeckStats(deckId: string): Promise<DeckStats> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // 取得總單字數
  const { count: totalWords } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .eq('deck_id', deckId)

  // 取得用戶已學習的單字數
  const { count: learnedWords } = await supabase
    .from('user_words')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('deck_id', deckId)
    .gt('repetitions', 0)

  // 取得今日待複習數
  const now = new Date().toISOString()
  const { count: dueToday } = await supabase
    .from('user_words')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('deck_id', deckId)
    .lte('due_at', now)

  // 計算新單字數（總數 - 已學習）
  const newWords = (totalWords || 0) - (learnedWords || 0)

  return {
    totalWords: totalWords || 0,
    learnedWords: learnedWords || 0,
    dueToday: dueToday || 0,
    newWords: Math.max(0, newWords),
  }
}

/**
 * 建立新 deck
 */
export async function createDeck(
  data: { name: string; description?: string }
): Promise<Deck> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: deck, error } = await supabase
    .from('decks')
    .insert({
      name: data.name,
      description: data.description || null,
      created_by: user.id,
      is_public: false,
    })
    .select()
    .single()

  if (error) throw error
  return deck
}

/**
 * 更新 deck
 */
export async function updateDeck(
  deckId: string,
  data: { name?: string; description?: string }
): Promise<Deck> {
  const { data: deck, error } = await supabase
    .from('decks')
    .update(data)
    .eq('id', deckId)
    .select()
    .single()

  if (error) throw error
  return deck
}

/**
 * 刪除 deck
 */
export async function deleteDeck(deckId: string): Promise<void> {
  const { error } = await supabase
    .from('decks')
    .delete()
    .eq('id', deckId)

  if (error) throw error
}

/**
 * 批量取得所有 deck 統計（優化版本）
 * 一次查詢取得所有統計，避免 N+1 問題
 */
export async function getAllDeckStats(deckIds: string[]): Promise<Map<string, DeckStats>> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  if (deckIds.length === 0) return new Map()

  // 並行執行所有查詢
  const [wordsResult, userWordsResult, dueResult] = await Promise.all([
    // 取得所有 deck 的單字數
    supabase
      .from('words')
      .select('deck_id')
      .in('deck_id', deckIds),

    // 取得用戶已學習的單字
    supabase
      .from('user_words')
      .select('deck_id, repetitions')
      .eq('user_id', user.id)
      .in('deck_id', deckIds),

    // 取得待複習單字
    supabase
      .from('user_words')
      .select('deck_id, due_at')
      .eq('user_id', user.id)
      .in('deck_id', deckIds)
      .lte('due_at', new Date().toISOString()),
  ])

  // 計算每個 deck 的統計
  const words = wordsResult.data || []
  const userWords = userWordsResult.data || []
  const dueWords = dueResult.data || []

  const statsMap = new Map<string, DeckStats>()
  const now = Date.now()

  for (const deckId of deckIds) {
    const totalWords = words.filter(w => w.deck_id === deckId).length
    const learnedWords = userWords.filter(uw => uw.deck_id === deckId && uw.repetitions > 0).length
    const dueToday = dueWords.filter(d => d.deck_id === deckId).length
    const newWords = Math.max(0, totalWords - learnedWords)

    statsMap.set(deckId, {
      totalWords,
      learnedWords,
      dueToday,
      newWords,
    })
  }

  // 快取結果
  const cacheData: CachedDeckStats[] = Array.from(statsMap.entries()).map(([deckId, stats]) => ({
    deckId,
    ...stats,
    cachedAt: now,
  }))
  cacheDeckStats(cacheData).catch(() => {}) // 背景執行，不阻塞

  return statsMap
}

/**
 * 取得所有 deck 統計（優先使用快取）
 */
export async function getAllDeckStatsWithCache(deckIds: string[]): Promise<{
  stats: Map<string, DeckStats>
  fromCache: boolean
}> {
  // 先嘗試從快取取得
  const cached = await getAllCachedDeckStats()
  const cachedMap = new Map<string, CachedDeckStats>()

  for (const item of cached) {
    cachedMap.set(item.deckId, item)
  }

  // 檢查是否所有 deck 都有快取且未過期（1 分鐘）
  const now = Date.now()
  const maxAge = 60 * 1000 // 1 分鐘

  const allCached = deckIds.every(id => {
    const c = cachedMap.get(id)
    return c && (now - c.cachedAt) < maxAge
  })

  if (allCached && cached.length >= deckIds.length) {
    const result = new Map<string, DeckStats>()
    for (const id of deckIds) {
      const c = cachedMap.get(id)!
      result.set(id, {
        totalWords: c.totalWords,
        learnedWords: c.learnedWords,
        dueToday: c.dueToday,
        newWords: c.newWords,
      })
    }
    return { stats: result, fromCache: true }
  }

  // 否則從伺服器取得
  const stats = await getAllDeckStats(deckIds)
  return { stats, fromCache: false }
}
