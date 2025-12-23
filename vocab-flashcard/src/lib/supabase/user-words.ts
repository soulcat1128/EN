/**
 * User Words 資料存取層 - 複習相關
 */

import { supabase } from './client'
import type { ReviewWord, SM2CardState, Word, UserWord } from '@/types'
import { createInitialState } from '@/lib/sm2/algorithm'
import {
  getCachedWords,
  cacheWords,
  getCachedUserWords,
  cacheUserWords,
  updateCachedUserWord,
  invalidateDeckStats,
} from '@/lib/cache/indexedDB'

/**
 * 從伺服器取得單字並快取
 */
async function fetchAndCacheWords(deckId: string): Promise<Word[]> {
  const { data, error } = await supabase
    .from('words')
    .select('*')
    .eq('deck_id', deckId)
    .order('created_at', { ascending: true })

  if (error) throw error
  const words = data || []

  // 背景快取
  cacheWords(deckId, words).catch(() => {})

  return words
}

/**
 * 從伺服器取得用戶單字並快取
 */
async function fetchAndCacheUserWords(deckId: string, userId: string): Promise<UserWord[]> {
  const { data, error } = await supabase
    .from('user_words')
    .select('*')
    .eq('user_id', userId)
    .eq('deck_id', deckId)

  if (error) throw error
  const userWords = data || []

  // 背景快取
  cacheUserWords(deckId, userId, userWords).catch(() => {})

  return userWords
}

/**
 * 取得待複習單字（優化版本：使用快取）
 * 包含：到期的單字 + 新單字（如果需要）
 */
export async function getDueWords(
  deckId: string,
  newWordsLimit: number = 20
): Promise<ReviewWord[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const now = new Date()

  // 嘗試從快取取得資料
  let words: Word[] | null = await getCachedWords(deckId)
  let userWords: UserWord[] | null = await getCachedUserWords(deckId, user.id)

  // 如果有快取，先用快取資料，背景同步
  if (words && userWords !== null) {
    // 背景更新快取（不阻塞）
    Promise.all([
      fetchAndCacheWords(deckId),
      fetchAndCacheUserWords(deckId, user.id),
    ]).catch(() => {})
  } else {
    // 沒有快取，同步取得
    const [fetchedWords, fetchedUserWords] = await Promise.all([
      fetchAndCacheWords(deckId),
      fetchAndCacheUserWords(deckId, user.id),
    ])
    words = fetchedWords
    userWords = fetchedUserWords
  }

  // 建立單字查詢 Map
  const wordsMap = new Map<string, Word>()
  for (const w of words) {
    wordsMap.set(w.id, w)
  }

  // 建立已學習單字 ID Set 和 UserWord Map
  const userWordsMap = new Map<string, UserWord>()
  const learnedWordIds = new Set<string>()
  for (const uw of userWords) {
    userWordsMap.set(uw.word_id, uw)
    learnedWordIds.add(uw.word_id)
  }

  const result: ReviewWord[] = []

  // 1. 加入到期的單字（已有學習紀錄且 due_at <= now）
  const dueUserWords = userWords
    .filter(uw => new Date(uw.due_at) <= now)
    .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())

  for (const uw of dueUserWords) {
    const word = wordsMap.get(uw.word_id)
    if (word) {
      result.push({
        id: uw.id,
        wordId: uw.word_id,
        word: word.word,
        meaningZh: word.meaning_zh,
        exampleSentence: word.example_sentence || undefined,
        pronunciation: word.pronunciation || undefined,
        sm2State: {
          repetitions: uw.repetitions,
          easeFactor: Number(uw.ease_factor),
          interval: uw.interval,
        },
        isNew: false,
      })
    }
  }

  // 2. 加入新單字（尚未有學習紀錄的）
  const newWords = words
    .filter(w => !learnedWordIds.has(w.id))
    .slice(0, newWordsLimit)

  for (const word of newWords) {
    result.push({
      id: '',
      wordId: word.id,
      word: word.word,
      meaningZh: word.meaning_zh,
      exampleSentence: word.example_sentence || undefined,
      pronunciation: word.pronunciation || undefined,
      sm2State: createInitialState(),
      isNew: true,
    })
  }

  return result
}

/**
 * 提交複習結果（優化版本：並行執行 + 樂觀更新）
 */
export async function submitReview(params: {
  wordId: string
  deckId: string
  quality: number
  newState: SM2CardState
  nextDueDate: Date
  previousState?: SM2CardState
}): Promise<void> {
  const { wordId, deckId, quality, newState, nextDueDate, previousState } = params
  const wasCorrect = quality >= 3
  const now = new Date().toISOString()

  // 取得用戶（這個通常已經快取在 Supabase client）
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // 立即更新本地快取（樂觀更新）
  const optimisticUserWord: UserWord = {
    id: '', // 會被 upsert 覆蓋
    user_id: user.id,
    word_id: wordId,
    deck_id: deckId,
    repetitions: newState.repetitions,
    ease_factor: newState.easeFactor,
    interval: newState.interval,
    due_at: nextDueDate.toISOString(),
    last_review_at: now,
    total_reviews: 0,
    correct_reviews: 0,
    created_at: now,
    updated_at: now,
  }
  updateCachedUserWord(optimisticUserWord).catch(() => {})
  invalidateDeckStats(deckId).catch(() => {})

  // 並行執行所有資料庫操作（不阻塞 UI）
  Promise.all([
    // 1. Upsert user_words（含統計更新）
    supabase.rpc('upsert_user_word_with_stats', {
      p_user_id: user.id,
      p_word_id: wordId,
      p_deck_id: deckId,
      p_repetitions: newState.repetitions,
      p_ease_factor: newState.easeFactor,
      p_interval: newState.interval,
      p_due_at: nextDueDate.toISOString(),
      p_was_correct: wasCorrect,
    }).then(({ error }) => {
      // 如果 RPC 不存在，fallback 到原本的方式
      if (error?.code === '42883') {
        return submitReviewFallback(user.id, params, wasCorrect, now)
      }
      if (error) console.error('upsert error:', error)
    }),

    // 2. 記錄複習歷史
    supabase.from('review_logs').insert({
      user_id: user.id,
      word_id: wordId,
      deck_id: deckId,
      quality,
      ease_factor_before: previousState?.easeFactor || null,
      ease_factor_after: newState.easeFactor,
      interval_before: previousState?.interval || null,
      interval_after: newState.interval,
      reviewed_at: now,
    }),
  ]).catch(err => console.error('submitReview background error:', err))
}

/**
 * Fallback：如果沒有 RPC，用原本的方式（但並行執行）
 */
async function submitReviewFallback(
  userId: string,
  params: {
    wordId: string
    deckId: string
    newState: SM2CardState
    nextDueDate: Date
  },
  wasCorrect: boolean,
  now: string
): Promise<void> {
  const { wordId, deckId, newState, nextDueDate } = params

  // 先 upsert
  await supabase
    .from('user_words')
    .upsert(
      {
        user_id: userId,
        word_id: wordId,
        deck_id: deckId,
        repetitions: newState.repetitions,
        ease_factor: newState.easeFactor,
        interval: newState.interval,
        due_at: nextDueDate.toISOString(),
        last_review_at: now,
      },
      { onConflict: 'user_id,word_id' }
    )

  // 更新統計（使用 SQL 增量更新，避免 read-then-write）
  try {
    await supabase.rpc('increment_review_stats', {
      p_user_id: userId,
      p_word_id: wordId,
      p_was_correct: wasCorrect,
    })
  } catch {
    // 如果 RPC 不存在，忽略統計更新（不影響核心功能）
  }
}

/**
 * 取得學習統計（優化版本：並行查詢）
 */
export async function getStats() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // 並行執行所有查詢
  const [
    userWordsResult,
    todayReviewedResult,
    todayNewLearnedResult,
    recentLogsResult,
    streakLogsResult,
  ] = await Promise.all([
    // 1. 取得所有用戶單字（含 due_at 用於預測）
    supabase
      .from('user_words')
      .select('repetitions, interval, due_at')
      .eq('user_id', user.id),

    // 2. 今日複習數
    supabase
      .from('review_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('reviewed_at', todayStr),

    // 3. 今日新學的單字
    supabase
      .from('review_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('reviewed_at', todayStr)
      .or('interval_before.is.null,interval_before.eq.0'),

    // 4. 過去 30 天的 logs
    supabase
      .from('review_logs')
      .select('reviewed_at, quality')
      .eq('user_id', user.id)
      .gte('reviewed_at', thirtyDaysAgo.toISOString())
      .order('reviewed_at', { ascending: true }),

    // 5. 用於計算 streak 的 logs
    supabase
      .from('review_logs')
      .select('reviewed_at')
      .eq('user_id', user.id)
      .order('reviewed_at', { ascending: false }),
  ])

  const userWords = userWordsResult.data || []

  // 計算基本統計
  const totalWords = userWords.length
  const learnedWords = userWords.filter(uw => uw.repetitions > 0).length
  const masteredWords = userWords.filter(uw => uw.interval > 21).length

  // 計算 streak（本地計算，不再查詢）
  const streak = calculateStreakFromLogs(streakLogsResult.data || [])

  // 計算每日統計
  const dailyStats = groupByDate(recentLogsResult.data || [])

  // 計算未來 7 天預測（本地計算，不再查詢）
  const forecast = calculateForecastFromUserWords(userWords)

  return {
    totalWords,
    learnedWords,
    masteredWords,
    todayReviewed: todayReviewedResult.count || 0,
    todayNewLearned: todayNewLearnedResult.count || 0,
    currentStreak: streak,
    dailyStats,
    forecast,
  }
}

/**
 * 從 logs 計算連續學習天數（本地計算）
 */
function calculateStreakFromLogs(logs: { reviewed_at: string }[]): number {

  if (!logs || logs.length === 0) return 0

  // 取得有複習紀錄的日期（去重）
  const dates = new Set<string>()
  for (const log of logs) {
    const date = new Date(log.reviewed_at).toISOString().split('T')[0]
    dates.add(date)
  }

  const sortedDates = Array.from(dates).sort().reverse()

  // 檢查今天或昨天是否有紀錄
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  if (sortedDates[0] !== today && sortedDates[0] !== yesterday) {
    return 0
  }

  // 計算連續天數
  let streak = 1
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1])
    const currDate = new Date(sortedDates[i])
    const diff = (prevDate.getTime() - currDate.getTime()) / 86400000

    if (diff === 1) {
      streak++
    } else {
      break
    }
  }

  return streak
}

/**
 * 按日期分組統計
 */
function groupByDate(logs: { reviewed_at: string; quality: number }[]) {
  const groups: Record<string, { reviewed: number; correct: number; newLearned: number }> = {}

  for (const log of logs) {
    const date = new Date(log.reviewed_at).toISOString().split('T')[0]
    if (!groups[date]) {
      groups[date] = { reviewed: 0, correct: 0, newLearned: 0 }
    }
    groups[date].reviewed++
    if (log.quality >= 3) {
      groups[date].correct++
    }
  }

  return Object.entries(groups).map(([date, stats]) => ({
    date,
    ...stats,
  }))
}

/**
 * 從 user_words 計算未來 7 天待複習預測（本地計算）
 */
function calculateForecastFromUserWords(userWords: { due_at: string }[]) {
  const forecast = []
  const now = new Date()
  const dayNames = ['日', '一', '二', '三', '四', '五', '六']

  for (let i = 0; i < 7; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() + i)
    date.setHours(23, 59, 59, 999)

    const startDate = new Date(date)
    startDate.setHours(0, 0, 0, 0)

    // 本地計算該日到期的單字數
    const count = userWords.filter(uw => {
      const dueAt = new Date(uw.due_at)
      return dueAt >= startDate && dueAt <= date
    }).length

    forecast.push({
      date: date.toISOString().split('T')[0],
      label: i === 0 ? '今天' : i === 1 ? '明天' : `週${dayNames[date.getDay()]}`,
      count,
    })
  }

  return forecast
}
