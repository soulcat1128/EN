// ============================================
// 資料庫類型定義
// ============================================

export interface Deck {
  id: string
  name: string
  description: string | null
  is_public: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Word {
  id: string
  deck_id: string
  word: string
  meaning_zh: string
  example_sentence: string | null
  pronunciation: string | null
  created_at: string
  updated_at?: string
}

export interface UserWord {
  id: string
  user_id: string
  word_id: string
  deck_id: string
  repetitions: number
  ease_factor: number
  interval: number
  due_at: string
  last_review_at: string | null
  total_reviews: number
  correct_reviews: number
  created_at: string
  updated_at: string
}

export interface ReviewLog {
  id: string
  user_id: string
  word_id: string
  deck_id: string
  quality: number
  ease_factor_before: number | null
  ease_factor_after: number | null
  interval_before: number | null
  interval_after: number | null
  reviewed_at: string
}

// ============================================
// SM-2 演算法類型
// ============================================

/**
 * SM-2 評分等級
 * 0: 完全忘記 (complete blackout)
 * 1: 錯誤，但想起正確答案
 * 2: 錯誤，但正確答案看起來容易
 * 3: 正確，但回想困難 (Hard)
 * 4: 正確，稍有猶豫 (Good)
 * 5: 完美記得 (Easy)
 */
export type SM2Quality = 0 | 1 | 2 | 3 | 4 | 5

/**
 * SM-2 卡片狀態
 */
export interface SM2CardState {
  repetitions: number    // 連續正確次數
  easeFactor: number     // 難易度因子 (EF), 最小 1.3
  interval: number       // 下次複習間隔（天數）
}

/**
 * SM-2 複習結果
 */
export interface SM2ReviewResult {
  nextState: SM2CardState
  nextDueDate: Date
  wasCorrect: boolean
}

/**
 * 待複習單字（含 SM-2 狀態）
 */
export interface ReviewWord {
  id: string
  wordId: string
  word: string
  meaningZh: string
  exampleSentence?: string
  pronunciation?: string
  sm2State: SM2CardState
  isNew: boolean
}

// ============================================
// 統計類型
// ============================================

export interface DeckStats {
  totalWords: number
  learnedWords: number
  dueToday: number
  newWords: number
}

export interface DailyStats {
  date: string
  reviewed: number
  correct: number
  newLearned: number
}

export interface UserStats {
  totalWords: number
  learnedWords: number
  masteredWords: number
  todayReviewed: number
  todayNewLearned: number
  currentStreak: number
  dailyStats: DailyStats[]
  forecast: { date: string; label: string; count: number }[]
}

// ============================================
// UI 類型
// ============================================

export interface ReviewSessionStats {
  total: number
  correct: number
  incorrect: number
  newLearned: number
}
