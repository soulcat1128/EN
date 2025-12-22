/**
 * 統計 Hook
 */

import { useQuery } from '@tanstack/react-query'
import { getStats } from '@/lib/supabase/user-words'

// Query Keys
export const statsKeys = {
  all: ['stats'] as const,
  user: () => [...statsKeys.all, 'user'] as const,
}

/**
 * 取得用戶統計
 */
export function useStats() {
  return useQuery({
    queryKey: statsKeys.user(),
    queryFn: getStats,
    staleTime: 60 * 1000, // 1 分鐘
  })
}
