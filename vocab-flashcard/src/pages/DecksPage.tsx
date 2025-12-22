/**
 * 單字庫列表頁面
 */

import { useNavigate } from 'react-router-dom'
import { useDecks, useDeleteDeck } from '@/hooks/useDecks'
import { DeckList } from '@/components/deck'
import { Loading, Button } from '@/components/ui'

export function DecksPage() {
  const navigate = useNavigate()
  const { data: decks, isLoading, error } = useDecks()
  const deleteDeckMutation = useDeleteDeck()

  const handleStartReview = (deckId: string) => {
    navigate(`/review/${deckId}`)
  }

  const handleDeleteDeck = async (deckId: string) => {
    if (confirm('確定要刪除這個單字庫嗎？此操作無法復原。')) {
      try {
        await deleteDeckMutation.mutateAsync(deckId)
      } catch (error) {
        console.error('Delete deck error:', error)
        alert('刪除失敗，請稍後再試')
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loading message="載入單字庫..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">😢</div>
        <h3 className="text-xl font-medium text-gray-600 mb-2">
          載入失敗
        </h3>
        <p className="text-gray-500 mb-4">
          {error.message}
        </p>
        <Button onClick={() => window.location.reload()}>
          重新載入
        </Button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">我的單字庫</h1>
          <p className="text-gray-500 mt-1">
            選擇一個單字庫開始學習
          </p>
        </div>
        {/* 未來可加入「建立單字庫」按鈕 */}
      </div>

      {/* Deck List */}
      <DeckList
        decks={decks || []}
        onStartReview={handleStartReview}
        onDelete={handleDeleteDeck}
      />

      {/* 提示 */}
      {decks && decks.length === 0 && (
        <div className="mt-8 p-6 bg-blue-50 rounded-xl text-center">
          <p className="text-blue-700">
            💡 請先在 Supabase 執行 seed.sql 來建立測試資料
          </p>
        </div>
      )}
    </div>
  )
}
