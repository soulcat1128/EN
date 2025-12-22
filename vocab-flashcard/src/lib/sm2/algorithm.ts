/**
 * SM-2 演算法核心實作
 *
 * SuperMemo 2 (SM-2) 是一種間隔重複演算法，
 * 根據使用者的回憶品質來調整下次複習的間隔。
 */

import { SM2Quality, SM2CardState, SM2ReviewResult } from './types'

/**
 * SM-2 演算法常量
 */
const SM2_CONSTANTS = {
  MIN_EASE_FACTOR: 1.3,      // 最小難易度因子
  DEFAULT_EASE_FACTOR: 2.5,  // 預設難易度因子
  FIRST_INTERVAL: 1,         // 第一次正確後間隔（天）
  SECOND_INTERVAL: 6,        // 第二次正確後間隔（天）
} as const

/**
 * 計算新的難易度因子 (EF)
 * 公式: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
 *
 * @param currentEF - 當前難易度因子
 * @param quality - 評分 (0-5)
 * @returns 新的難易度因子（最小 1.3）
 */
export function calculateEaseFactor(currentEF: number, quality: SM2Quality): number {
  const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  const newEF = currentEF + delta
  return Math.max(SM2_CONSTANTS.MIN_EASE_FACTOR, newEF)
}

/**
 * 計算下次複習間隔
 *
 * @param repetitions - 連續正確次數
 * @param easeFactor - 難易度因子
 * @param previousInterval - 上次間隔
 * @returns 新的間隔（天數）
 */
export function calculateInterval(
  repetitions: number,
  easeFactor: number,
  previousInterval: number
): number {
  if (repetitions === 0) {
    return SM2_CONSTANTS.FIRST_INTERVAL
  }
  if (repetitions === 1) {
    return SM2_CONSTANTS.SECOND_INTERVAL
  }
  // repetitions >= 2: interval = previousInterval * EF
  return Math.round(previousInterval * easeFactor)
}

/**
 * SM-2 演算法核心：處理一次複習
 *
 * @param currentState - 當前卡片狀態
 * @param quality - 用戶評分 (0-5)
 * @returns 複習結果（新狀態和下次複習日期）
 */
export function processReview(
  currentState: SM2CardState,
  quality: SM2Quality
): SM2ReviewResult {
  const wasCorrect = quality >= 3

  let newRepetitions: number
  let newEaseFactor: number
  let newInterval: number

  if (wasCorrect) {
    // 正確回答 (quality >= 3)
    newRepetitions = currentState.repetitions + 1
    newEaseFactor = calculateEaseFactor(currentState.easeFactor, quality)
    newInterval = calculateInterval(
      currentState.repetitions, // 使用更新前的 repetitions
      newEaseFactor,
      currentState.interval
    )
  } else {
    // 錯誤回答 (quality < 3)：重置進度
    newRepetitions = 0
    newEaseFactor = calculateEaseFactor(currentState.easeFactor, quality)
    newInterval = SM2_CONSTANTS.FIRST_INTERVAL
  }

  const nextState: SM2CardState = {
    repetitions: newRepetitions,
    easeFactor: Math.round(newEaseFactor * 100) / 100, // 四捨五入到小數點後兩位
    interval: newInterval,
  }

  // 計算下次複習日期
  const nextDueDate = new Date()
  nextDueDate.setDate(nextDueDate.getDate() + newInterval)
  nextDueDate.setHours(0, 0, 0, 0) // 設為當天開始

  return {
    nextState,
    nextDueDate,
    wasCorrect,
  }
}

/**
 * 建立新卡片的初始狀態
 */
export function createInitialState(): SM2CardState {
  return {
    repetitions: 0,
    easeFactor: SM2_CONSTANTS.DEFAULT_EASE_FACTOR,
    interval: 0,
  }
}

/**
 * 預覽不同評分的結果（用於 UI 顯示）
 *
 * @param currentState - 當前狀態
 * @returns 各評分對應的間隔天數
 */
export function previewIntervals(currentState: SM2CardState): Record<SM2Quality, number> {
  const preview = {} as Record<SM2Quality, number>

  for (let q = 0; q <= 5; q++) {
    const result = processReview(currentState, q as SM2Quality)
    preview[q as SM2Quality] = result.nextState.interval
  }

  return preview
}

/**
 * 格式化間隔顯示文字
 */
export function formatInterval(days: number): string {
  if (days === 0) return '立即'
  if (days === 1) return '1 天'
  if (days < 7) return `${days} 天`
  if (days < 30) {
    const weeks = Math.round(days / 7)
    return `${weeks} 週`
  }
  if (days < 365) {
    const months = Math.round(days / 30)
    return `${months} 個月`
  }
  const years = Math.round(days / 365 * 10) / 10
  return `${years} 年`
}

/**
 * 計算卡片的掌握程度（0-100）
 */
export function calculateMastery(state: SM2CardState): number {
  // 基於 repetitions 和 interval 計算掌握程度
  const repScore = Math.min(state.repetitions / 5, 1) * 50
  const intervalScore = Math.min(state.interval / 30, 1) * 50
  return Math.round(repScore + intervalScore)
}
