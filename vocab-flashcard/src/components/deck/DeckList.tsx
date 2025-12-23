/**
 * 單字庫列表元件
 * 優化：使用批量查詢取得所有 deck 統計，避免 N+1 問題
 */

import { useMemo } from 'react'
import { DeckCard } from './DeckCard'
import { useAllDeckStats } from '@/hooks/useDecks'
import type { Deck } from '@/types'

interface DeckListProps {
  decks: Deck[]
  onStartReview: (deckId: string) => void
  onEdit?: (deckId: string) => void
  onDelete?: (deckId: string) => void
}

export function DeckList({ decks, onStartReview, onEdit, onDelete }: DeckListProps) {
  // 批量取得所有 deck 的統計
  const deckIds = useMemo(() => decks.map(d => d.id), [decks])
  const { data: allStats } = useAllDeckStats(deckIds)

  if (decks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📚</div>
        <h3 className="text-xl font-medium text-gray-600 mb-2">
          還沒有單字庫
        </h3>
        <p className="text-gray-500">
          建立你的第一個單字庫開始學習吧！
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {decks.map(deck => (
        <DeckCard
          key={deck.id}
          deck={deck}
          stats={allStats?.[deck.id]}
          onStartReview={() => onStartReview(deck.id)}
          onEdit={onEdit ? () => onEdit(deck.id) : undefined}
          onDelete={onDelete ? () => onDelete(deck.id) : undefined}
        />
      ))}
    </div>
  )
}
