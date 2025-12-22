/**
 * User Words 資料存取層 - 複習相關
 */

import { supabase } from './client'
import type { ReviewWord, SM2CardState } from '@/types'
import { createInitialState } from '@/lib/sm2/algorithm'

/**
 * 取得待複習單字
 * 包含：到期的單字 + 新單字（如果需要）
 */
export async function getDueWords(
  deckId: string,
  newWordsLimit: number = 20
): Promise<ReviewWord[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const now = new Date().toISOString()

  // 1. 取得已有學習紀錄且到期的單字
  const { data: dueUserWords, error: dueError } = await supabase
    .from('user_words')
    .select(`
      *,
      words (*)
    `)
    .eq('user_id', user.id)
    .eq('deck_id', deckId)
    .lte('due_at', now)
    .order('due_at', { ascending: true })

  if (dueError) throw dueError

  // 2. 取得已有學習紀錄的單字 IDs
  const { data: allUserWords } = await supabase
    .from('user_words')
    .select('word_id')
    .eq('user_id', user.id)
    .eq('deck_id', deckId)

  const learnedWordIds = new Set((allUserWords || []).map(uw => uw.word_id))

  // 3. 取得新單字（尚未有學習紀錄的）
  const { data: allWords } = await supabase
    .from('words')
    .select('*')
    .eq('deck_id', deckId)
    .order('created_at', { ascending: true })

  const newWords = (allWords || [])
    .filter(w => !learnedWordIds.has(w.id))
    .slice(0, newWordsLimit)

  // 4. 組合結果
  const result: ReviewWord[] = []

  // 加入到期的單字
  for (const uw of (dueUserWords || [])) {
    if (uw.words) {
      result.push({
        id: uw.id,
        wordId: uw.word_id,
        word: uw.words.word,
        meaningZh: uw.words.meaning_zh,
        exampleSentence: uw.words.example_sentence || undefined,
        pronunciation: uw.words.pronunciation || undefined,
        sm2State: {
          repetitions: uw.repetitions,
          easeFactor: Number(uw.ease_factor),
          interval: uw.interval,
        },
        isNew: false,
      })
    }
  }

  // 加入新單字
  for (const word of newWords) {
    result.push({
      id: '', // 新單字還沒有 user_word 記錄
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
 * 提交複習結果
 */
export async function submitReview(params: {
  wordId: string
  deckId: string
  quality: number
  newState: SM2CardState
  nextDueDate: Date
  previousState?: SM2CardState
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { wordId, deckId, quality, newState, nextDueDate, previousState } = params
  const wasCorrect = quality >= 3
  const now = new Date().toISOString()

  // 1. 更新或建立 user_words 記錄
  const { error: upsertError } = await supabase
    .from('user_words')
    .upsert(
      {
        user_id: user.id,
        word_id: wordId,
        deck_id: deckId,
        repetitions: newState.repetitions,
        ease_factor: newState.easeFactor,
        interval: newState.interval,
        due_at: nextDueDate.toISOString(),
        last_review_at: now,
      },
      {
        onConflict: 'user_id,word_id',
      }
    )

  if (upsertError) throw upsertError

  // 2. 更新統計（使用單獨的更新）
  const { data: existingRecord } = await supabase
    .from('user_words')
    .select('total_reviews, correct_reviews')
    .eq('user_id', user.id)
    .eq('word_id', wordId)
    .single()

  if (existingRecord) {
    await supabase
      .from('user_words')
      .update({
        total_reviews: (existingRecord.total_reviews || 0) + 1,
        correct_reviews: (existingRecord.correct_reviews || 0) + (wasCorrect ? 1 : 0),
      })
      .eq('user_id', user.id)
      .eq('word_id', wordId)
  }

  // 3. 記錄複習歷史
  await supabase.from('review_logs').insert({
    user_id: user.id,
    word_id: wordId,
    deck_id: deckId,
    quality,
    ease_factor_before: previousState?.easeFactor || null,
    ease_factor_after: newState.easeFactor,
    interval_before: previousState?.interval || null,
    interval_after: newState.interval,
    reviewed_at: now,
  })
}

/**
 * 取得學習統計
 */
export async function getStats() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // 取得所有用戶單字
  const { data: allUserWords } = await supabase
    .from('user_words')
    .select('*')
    .eq('user_id', user.id)

  const userWords = allUserWords || []

  // 計算基本統計
  const totalWords = userWords.length
  const learnedWords = userWords.filter(uw => uw.repetitions > 0).length
  const masteredWords = userWords.filter(uw => uw.interval > 21).length

  // 今日統計
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString()

  const { count: todayReviewed } = await supabase
    .from('review_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('reviewed_at', todayStr)

  // 今日新學的單字（interval_before 為 null 或 0）
  const { count: todayNewLearned } = await supabase
    .from('review_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('reviewed_at', todayStr)
    .or('interval_before.is.null,interval_before.eq.0')

  // 計算連續學習天數
  const streak = await calculateStreak(user.id)

  // 過去 30 天統計
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: recentLogs } = await supabase
    .from('review_logs')
    .select('reviewed_at, quality')
    .eq('user_id', user.id)
    .gte('reviewed_at', thirtyDaysAgo.toISOString())
    .order('reviewed_at', { ascending: true })

  const dailyStats = groupByDate(recentLogs || [])

  // 未來 7 天預測
  const forecast = await getForecast(user.id)

  return {
    totalWords,
    learnedWords,
    masteredWords,
    todayReviewed: todayReviewed || 0,
    todayNewLearned: todayNewLearned || 0,
    currentStreak: streak,
    dailyStats,
    forecast,
  }
}

/**
 * 計算連續學習天數
 */
async function calculateStreak(userId: string): Promise<number> {
  const { data: logs } = await supabase
    .from('review_logs')
    .select('reviewed_at')
    .eq('user_id', userId)
    .order('reviewed_at', { ascending: false })

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
 * 取得未來 7 天待複習預測
 */
async function getForecast(userId: string) {
  const forecast = []
  const now = new Date()

  for (let i = 0; i < 7; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() + i)
    date.setHours(23, 59, 59, 999)

    const startDate = new Date(date)
    startDate.setHours(0, 0, 0, 0)

    const { count } = await supabase
      .from('user_words')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('due_at', startDate.toISOString())
      .lte('due_at', date.toISOString())

    const dayNames = ['日', '一', '二', '三', '四', '五', '六']
    forecast.push({
      date: date.toISOString().split('T')[0],
      label: i === 0 ? '今天' : i === 1 ? '明天' : `週${dayNames[date.getDay()]}`,
      count: count || 0,
    })
  }

  return forecast
}
