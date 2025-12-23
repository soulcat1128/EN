/**
 * Decks Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getDecks,
  getDeck,
  getDeckStats,
  createDeck,
  updateDeck,
  deleteDeck,
  getAllDeckStatsWithCache,
} from '@/lib/supabase/decks'
import type { DeckStats } from '@/types'

// Query Keys
export const deckKeys = {
  all: ['decks'] as const,
  list: () => [...deckKeys.all, 'list'] as const,
  detail: (id: string) => [...deckKeys.all, 'detail', id] as const,
  stats: (id: string) => [...deckKeys.all, 'stats', id] as const,
}

/**
 * 取得所有 decks
 */
export function useDecks() {
  return useQuery({
    queryKey: deckKeys.list(),
    queryFn: getDecks,
    staleTime: 5 * 60 * 1000, // 5 分鐘
  })
}

/**
 * 取得單一 deck
 */
export function useDeck(deckId: string) {
  return useQuery({
    queryKey: deckKeys.detail(deckId),
    queryFn: () => getDeck(deckId),
    enabled: !!deckId,
  })
}

/**
 * 取得 deck 統計
 */
export function useDeckStats(deckId: string) {
  return useQuery({
    queryKey: deckKeys.stats(deckId),
    queryFn: () => getDeckStats(deckId),
    enabled: !!deckId,
    staleTime: 60 * 1000, // 1 分鐘
  })
}

/**
 * 批量取得所有 deck 統計（優化版本）
 * 一次查詢取得所有統計，避免 N+1 問題
 */
export function useAllDeckStats(deckIds: string[]) {
  return useQuery({
    queryKey: ['decks', 'allStats', deckIds.sort().join(',')],
    queryFn: async () => {
      const { stats } = await getAllDeckStatsWithCache(deckIds)
      // 將 Map 轉換為物件以便序列化
      const result: Record<string, DeckStats> = {}
      stats.forEach((value, key) => {
        result[key] = value
      })
      return result
    },
    enabled: deckIds.length > 0,
    staleTime: 60 * 1000, // 1 分鐘
  })
}

/**
 * 建立 deck
 */
export function useCreateDeck() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createDeck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deckKeys.list() })
    },
  })
}

/**
 * 更新 deck
 */
export function useUpdateDeck() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ deckId, data }: { deckId: string; data: { name?: string; description?: string } }) =>
      updateDeck(deckId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: deckKeys.list() })
      queryClient.invalidateQueries({ queryKey: deckKeys.detail(variables.deckId) })
    },
  })
}

/**
 * 刪除 deck
 */
export function useDeleteDeck() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteDeck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deckKeys.list() })
    },
  })
}
