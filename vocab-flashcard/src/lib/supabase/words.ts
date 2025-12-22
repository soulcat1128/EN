/**
 * Words 資料存取層
 */

import { supabase } from './client'
import type { Word } from '@/types'

/**
 * 取得 deck 中的所有單字
 */
export async function getWords(deckId: string): Promise<Word[]> {
  const { data, error } = await supabase
    .from('words')
    .select('*')
    .eq('deck_id', deckId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * 取得單一單字
 */
export async function getWord(wordId: string): Promise<Word | null> {
  const { data, error } = await supabase
    .from('words')
    .select('*')
    .eq('id', wordId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

/**
 * 建立新單字
 */
export async function createWord(data: {
  deck_id: string
  word: string
  meaning_zh: string
  example_sentence?: string
  pronunciation?: string
}): Promise<Word> {
  const { data: word, error } = await supabase
    .from('words')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return word
}

/**
 * 批量建立單字
 */
export async function createWords(
  words: Array<{
    deck_id: string
    word: string
    meaning_zh: string
    example_sentence?: string
    pronunciation?: string
  }>
): Promise<Word[]> {
  const { data, error } = await supabase
    .from('words')
    .insert(words)
    .select()

  if (error) throw error
  return data || []
}

/**
 * 更新單字
 */
export async function updateWord(
  wordId: string,
  data: {
    word?: string
    meaning_zh?: string
    example_sentence?: string
    pronunciation?: string
  }
): Promise<Word> {
  const { data: word, error } = await supabase
    .from('words')
    .update(data)
    .eq('id', wordId)
    .select()
    .single()

  if (error) throw error
  return word
}

/**
 * 刪除單字
 */
export async function deleteWord(wordId: string): Promise<void> {
  const { error } = await supabase
    .from('words')
    .delete()
    .eq('id', wordId)

  if (error) throw error
}

// ============================================
// 預留：CSV 匯入功能
// ============================================

/**
 * 從 CSV 資料匯入單字
 * TODO: 實作 CSV 解析和批量匯入
 */
export async function importWordsFromCsv(
  _deckId: string,
  _csvContent: string
): Promise<{ imported: number; errors: string[] }> {
  // 預留擴展：之後實作 CSV 匯入功能
  throw new Error('CSV import not implemented yet')
}
