/**
 * 翻轉卡片元件
 */

import { useState, useEffect } from 'react'

interface FlashCardProps {
  word: string
  meaningZh: string
  pronunciation?: string
  exampleSentence?: string
  isFlipped: boolean
  onFlip: () => void
}

export function FlashCard({
  word,
  meaningZh,
  pronunciation,
  exampleSentence,
  isFlipped,
  onFlip,
}: FlashCardProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isFlipped) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 600)
      return () => clearTimeout(timer)
    }
  }, [isFlipped])

  return (
    <div
      className="perspective w-full max-w-lg mx-auto cursor-pointer"
      onClick={onFlip}
    >
      <div
        className={`
          relative w-full h-80 transition-transform duration-500
          preserve-3d
          ${isFlipped ? 'rotate-y-180' : ''}
        `}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front - 英文單字 */}
        <div
          className={`
            absolute inset-0 backface-hidden
            bg-white rounded-2xl shadow-lg
            flex flex-col items-center justify-center p-8
            border-2 border-gray-100
          `}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <span className="text-4xl md:text-5xl font-bold text-gray-800 text-center">
            {word}
          </span>
          {pronunciation && (
            <span className="mt-4 text-lg text-gray-500">{pronunciation}</span>
          )}
          <span className="mt-8 text-sm text-gray-400">點擊查看翻譯</span>
        </div>

        {/* Back - 中文翻譯 */}
        <div
          className={`
            absolute inset-0 backface-hidden rotate-y-180
            bg-gradient-to-br from-primary-50 to-primary-100
            rounded-2xl shadow-lg
            flex flex-col items-center justify-center p-8
            border-2 border-primary-200
          `}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <span className="text-2xl font-bold text-gray-800 text-center mb-2">
            {word}
          </span>
          <span className="text-3xl md:text-4xl font-bold text-primary-700 text-center">
            {meaningZh}
          </span>
          {exampleSentence && (
            <p className="mt-6 text-sm text-gray-600 text-center italic max-w-xs">
              "{exampleSentence}"
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
