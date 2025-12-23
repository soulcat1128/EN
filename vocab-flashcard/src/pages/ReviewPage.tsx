/**
 * 複習頁面 - 核心功能
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useReviewWords, useSubmitReview } from '@/hooks/useReview'
import { useDeck } from '@/hooks/useDecks'
import { useSM2 } from '@/hooks/useSM2'
import {
  FlashCard,
  ReviewControls,
  ProgressBar,
  ReviewSummary,
} from '@/components/review'
import { Loading, Button } from '@/components/ui'
import type { SM2Quality, ReviewWord, ReviewSessionStats } from '@/types'

type ReviewPhase = 'loading' | 'empty' | 'reviewing' | 'summary'

export function ReviewPage() {
  const { deckId } = useParams<{ deckId: string }>()
  const navigate = useNavigate()

  // 狀態
  const [phase, setPhase] = useState<ReviewPhase>('loading')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [reviewQueue, setReviewQueue] = useState<ReviewWord[]>([])
  const [stats, setStats] = useState<ReviewSessionStats>({
    total: 0,
    correct: 0,
    incorrect: 0,
    newLearned: 0,
  })

  // Hooks
  const { data: deck } = useDeck(deckId!)
  const { data: words, isLoading, refetch } = useReviewWords(deckId!)
  const submitReviewMutation = useSubmitReview()
  const { processReview, previewIntervals } = useSM2()

  // 防止快速連續點擊
  const isProcessingRef = useRef(false)

  // 初始化複習佇列
  useEffect(() => {
    if (words) {
      if (words.length > 0) {
        setReviewQueue(words)
        setStats(prev => ({ ...prev, total: words.length }))
        setPhase('reviewing')
      } else {
        setPhase('empty')
      }
    }
  }, [words])

  // 當前單字
  const currentWord = reviewQueue[currentIndex]

  // 翻轉卡片
  const handleFlip = useCallback(() => {
    setIsFlipped(prev => !prev)
  }, [])

  // 提交評分
  const handleRate = useCallback(
    async (quality: SM2Quality) => {
      // 防止快速連續點擊
      if (isProcessingRef.current || !currentWord || !deckId) return
      isProcessingRef.current = true

      try {
        const previousState = currentWord.sm2State
        const result = processReview(previousState, quality)
        const wasCorrect = quality >= 3

        // 更新統計
        setStats(prev => ({
          ...prev,
          correct: prev.correct + (wasCorrect ? 1 : 0),
          incorrect: prev.incorrect + (wasCorrect ? 0 : 1),
          newLearned:
            prev.newLearned + (currentWord.isNew && wasCorrect ? 1 : 0),
        }))

        // 提交到資料庫（不等待，背景執行）
        submitReviewMutation.mutate({
          wordId: currentWord.wordId,
          deckId: deckId,
          quality,
          newState: result.nextState,
          nextDueDate: result.nextDueDate,
          previousState,
        })

        // 翻回正面
        setIsFlipped(false)

        // 使用函數式更新確保狀態同步
        setReviewQueue(prev => {
          const isLastCard = currentIndex >= prev.length - 1

          if (!wasCorrect) {
            // 錯誤：將卡片加回佇列末端
            const newQueue = [
              ...prev,
              {
                ...currentWord,
                sm2State: result.nextState,
                isNew: false,
              },
            ]
            // 更新 total
            setStats(s => ({ ...s, total: s.total + 1 }))
            // 移到下一張
            setCurrentIndex(i => i + 1)
            return newQueue
          } else if (isLastCard) {
            // 正確且是最後一張：結束
            setPhase('summary')
            return prev
          } else {
            // 正確但還有下一張
            setCurrentIndex(i => i + 1)
            return prev
          }
        })
      } finally {
        // 短暫延遲後解鎖，防止過快連續點擊
        setTimeout(() => {
          isProcessingRef.current = false
        }, 150)
      }
    },
    [currentWord, currentIndex, processReview, submitReviewMutation, deckId]
  )

  // 鍵盤快捷鍵
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'reviewing') return

      if (e.code === 'Space' && !isFlipped) {
        e.preventDefault()
        handleFlip()
      } else if (isFlipped) {
        const keyMap: Record<string, SM2Quality> = {
          Digit1: 1,
          Digit2: 3,
          Digit3: 4,
          Digit4: 5,
        }
        if (keyMap[e.code] !== undefined) {
          e.preventDefault()
          handleRate(keyMap[e.code])
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [phase, isFlipped, handleFlip, handleRate])

  // 重新開始
  const handleContinue = async () => {
    setCurrentIndex(0)
    setIsFlipped(false)
    setStats({ total: 0, correct: 0, incorrect: 0, newLearned: 0 })
    setPhase('loading')
    await refetch()
  }

  // 渲染
  if (isLoading || phase === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loading message="載入複習單字..." />
      </div>
    )
  }

  if (phase === 'empty') {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          太棒了！
        </h2>
        <p className="text-gray-600 mb-6">
          目前沒有需要複習的單字，可以休息一下或學習新單字。
        </p>
        <div className="flex justify-center gap-4">
          <Button variant="secondary" onClick={() => navigate('/decks')}>
            返回單字庫
          </Button>
          <Button onClick={handleContinue}>
            學習新單字
          </Button>
        </div>
      </div>
    )
  }

  if (phase === 'summary') {
    return (
      <ReviewSummary
        stats={stats}
        onBackToDecks={() => navigate('/decks')}
        onContinue={handleContinue}
      />
    )
  }

  const progress = Math.min(100, ((currentIndex + 1) / reviewQueue.length) * 100)
  const intervals = currentWord ? previewIntervals(currentWord.sm2State) : null

  return (
    <div className="min-h-[80vh] flex flex-col -mx-4 -mt-8">
      {/* Deck Info */}
      {deck && (
        <div className="bg-white border-b px-4 py-2">
          <p className="text-sm text-gray-600 text-center">
            {deck.name}
          </p>
        </div>
      )}

      {/* 進度條 */}
      <ProgressBar
        progress={progress}
        current={currentIndex + 1}
        total={reviewQueue.length}
      />

      {/* 主要內容 */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {currentWord && (
          <>
            {/* 新單字標籤 */}
            {currentWord.isNew && (
              <div className="mb-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                  新單字
                </span>
              </div>
            )}

            <FlashCard
              word={currentWord.word}
              meaningZh={currentWord.meaningZh}
              pronunciation={currentWord.pronunciation}
              exampleSentence={currentWord.exampleSentence}
              isFlipped={isFlipped}
              onFlip={handleFlip}
            />

            {isFlipped && intervals && (
              <ReviewControls
                onRate={handleRate}
                intervals={intervals}
                disabled={submitReviewMutation.isPending}
              />
            )}

            {!isFlipped && (
              <p className="mt-6 text-gray-500">
                點擊卡片或按 <kbd className="px-2 py-1 bg-gray-100 rounded text-sm">Space</kbd> 顯示答案
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
