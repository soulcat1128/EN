/**
 * 複習相關 Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDueWords, submitReview } from '@/lib/supabase/user-words'
import { deckKeys } from './useDecks'

// Query Keys
export const reviewKeys = {
  dueWords: (deckId: string) => ['review', 'due', deckId] as const,
}

/**
 * 取得待複習單字
 */
export function useReviewWords(deckId: string, newWordsLimit: number = 20) {
  return useQuery({
    queryKey: reviewKeys.dueWords(deckId),
    queryFn: () => getDueWords(deckId, newWordsLimit),
    enabled: !!deckId,
    staleTime: 0, // 每次都重新獲取
    refetchOnWindowFocus: false,
  })
}

/**
 * 提交複習結果
 */
export function useSubmitReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: submitReview,
    onSuccess: (_, variables) => {
      // 更新統計
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      queryClient.invalidateQueries({ queryKey: deckKeys.stats(variables.deckId) })
    },
  })
}
