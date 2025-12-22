/**
 * 單字庫列表元件
 */

import { DeckCard } from './DeckCard'
import { useDeckStats } from '@/hooks/useDecks'
import type { Deck } from '@/types'

interface DeckListProps {
  decks: Deck[]
  onStartReview: (deckId: string) => void
  onEdit?: (deckId: string) => void
  onDelete?: (deckId: string) => void
}

export function DeckList({ decks, onStartReview, onEdit, onDelete }: DeckListProps) {
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
        <DeckCardWithStats
          key={deck.id}
          deck={deck}
          onStartReview={() => onStartReview(deck.id)}
          onEdit={onEdit ? () => onEdit(deck.id) : undefined}
          onDelete={onDelete ? () => onDelete(deck.id) : undefined}
        />
      ))}
    </div>
  )
}

// 帶統計的卡片（分離以優化 re-render）
function DeckCardWithStats({
  deck,
  onStartReview,
  onEdit,
  onDelete,
}: {
  deck: Deck
  onStartReview: () => void
  onEdit?: () => void
  onDelete?: () => void
}) {
  const { data: stats } = useDeckStats(deck.id)

  return (
    <DeckCard
      deck={deck}
      stats={stats}
      onStartReview={onStartReview}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  )
}
