/**
 * SM-2 演算法類型定義
 */

/**
 * SM-2 評分等級
 * 0: 完全忘記 (complete blackout)
 * 1: 錯誤，但想起正確答案 (Again)
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
