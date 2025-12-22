/**
 * Decks 資料存取層
 */

import { supabase } from './client'
import type { Deck, DeckStats } from '@/types'

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
