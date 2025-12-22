/**
 * 複習評分控制元件
 */

// import { Button } from '@/components/ui'
import { formatInterval } from '@/lib/sm2/algorithm'
import type { SM2Quality } from '@/types'

interface ReviewControlsProps {
  onRate: (quality: SM2Quality) => void
  intervals: Record<SM2Quality, number>
  disabled?: boolean
}

interface RatingButton {
  quality: SM2Quality
  label: string
  shortcut: string
  variant: 'danger' | 'warning' | 'primary' | 'success'
  description: string
}

const ratingButtons: RatingButton[] = [
  {
    quality: 1,
    label: 'Again',
    shortcut: '1',
    variant: 'danger',
    description: '完全忘記',
  },
  {
    quality: 3,
    label: 'Hard',
    shortcut: '2',
    variant: 'warning',
    description: '困難但記得',
  },
  {
    quality: 4,
    label: 'Good',
    shortcut: '3',
    variant: 'primary',
    description: '正常記住',
  },
  {
    quality: 5,
    label: 'Easy',
    shortcut: '4',
    variant: 'success',
    description: '輕鬆記住',
  },
]

export function ReviewControls({ onRate, intervals, disabled }: ReviewControlsProps) {
  return (
    <div className="mt-8 w-full max-w-lg mx-auto">
      <p className="text-center text-sm text-gray-500 mb-4">
        你記得這個單字嗎？
      </p>
      <div className="grid grid-cols-4 gap-2">
        {ratingButtons.map(button => (
          <button
            key={button.quality}
            onClick={() => onRate(button.quality)}
            disabled={disabled}
            className={`
              flex flex-col items-center justify-center
              p-3 rounded-xl transition-all
              disabled:opacity-50 disabled:cursor-not-allowed
              ${
                button.variant === 'danger'
                  ? 'bg-red-50 hover:bg-red-100 text-red-700 border-2 border-red-200'
                  : button.variant === 'warning'
                  ? 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-2 border-yellow-200'
                  : button.variant === 'primary'
                  ? 'bg-primary-50 hover:bg-primary-100 text-primary-700 border-2 border-primary-200'
                  : 'bg-green-50 hover:bg-green-100 text-green-700 border-2 border-green-200'
              }
            `}
          >
            <span className="text-lg font-bold">{button.label}</span>
            <span className="text-xs opacity-75 mt-1">
              {formatInterval(intervals[button.quality])}
            </span>
            <span className="text-[10px] opacity-50 mt-1">
              [{button.shortcut}]
            </span>
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-gray-400 mt-4">
        使用數字鍵 1-4 快速選擇
      </p>
    </div>
  )
}
