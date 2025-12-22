/**
 * SM-2 演算法 Hook
 */

import { useCallback } from 'react'
import type { SM2CardState, SM2Quality, SM2ReviewResult } from '@/types'
import {
  processReview as sm2ProcessReview,
  previewIntervals as sm2PreviewIntervals,
  formatInterval,
  calculateMastery,
} from '@/lib/sm2/algorithm'

export function useSM2() {
  /**
   * 處理複習
   */
  const processReview = useCallback(
    (state: SM2CardState, quality: SM2Quality): SM2ReviewResult => {
      return sm2ProcessReview(state, quality)
    },
    []
  )

  /**
   * 預覽各評分的間隔
   */
  const previewIntervals = useCallback(
    (state: SM2CardState): Record<SM2Quality, number> => {
      return sm2PreviewIntervals(state)
    },
    []
  )

  /**
   * 格式化間隔顯示
   */
  const formatIntervalText = useCallback((days: number): string => {
    return formatInterval(days)
  }, [])

  /**
   * 計算掌握程度
   */
  const getMastery = useCallback((state: SM2CardState): number => {
    return calculateMastery(state)
  }, [])

  return {
    processReview,
    previewIntervals,
    formatIntervalText,
    getMastery,
  }
}
