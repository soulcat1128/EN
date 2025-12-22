/**
 * 單字庫卡片元件
 */

import { Card, Button } from '@/components/ui'
import type { Deck, DeckStats } from '@/types'

interface DeckCardProps {
  deck: Deck
  stats?: DeckStats
  onStartReview: () => void
  onEdit?: () => void
  onDelete?: () => void
}

export function DeckCard({
  deck,
  stats,
  onStartReview,
  onEdit,
  onDelete,
}: DeckCardProps) {
  const hasDueCards = stats && stats.dueToday > 0

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800">{deck.name}</h3>
            {deck.description && (
              <p className="text-sm text-gray-500 mt-1">{deck.description}</p>
            )}
          </div>
          {deck.is_public && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
              公開
            </span>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-700">
                {stats.totalWords}
              </div>
              <div className="text-xs text-gray-500">總單字</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {stats.learnedWords}
              </div>
              <div className="text-xs text-gray-500">已學習</div>
            </div>
            <div className={`text-center p-3 rounded-lg ${
              hasDueCards ? 'bg-red-50' : 'bg-gray-50'
            }`}>
              <div className={`text-2xl font-bold ${
                hasDueCards ? 'text-red-600' : 'text-gray-400'
              }`}>
                {stats.dueToday}
              </div>
              <div className="text-xs text-gray-500">待複習</div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={onStartReview}
            className="flex-1"
            variant={hasDueCards ? 'primary' : 'secondary'}
          >
            {hasDueCards ? `開始複習 (${stats?.dueToday})` : '開始學習'}
          </Button>
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit}>
              編輯
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="sm" onClick={onDelete}>
              刪除
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
