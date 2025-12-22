/**
 * 複習完成摘要元件
 */

import { Button } from '@/components/ui'
import type { ReviewSessionStats } from '@/types'

interface ReviewSummaryProps {
  stats: ReviewSessionStats
  onBackToDecks: () => void
  onContinue?: () => void
}

export function ReviewSummary({ stats, onBackToDecks, onContinue }: ReviewSummaryProps) {
  const accuracy = stats.total > 0
    ? Math.round((stats.correct / stats.total) * 100)
    : 0

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">
          {accuracy >= 80 ? '🎉' : accuracy >= 60 ? '👍' : '💪'}
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          複習完成！
        </h1>
        <p className="text-gray-600">
          今天的複習結束了，繼續保持！
        </p>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 w-full max-w-2xl">
        <StatCard
          label="總複習"
          value={stats.total}
          color="gray"
        />
        <StatCard
          label="正確"
          value={stats.correct}
          color="green"
        />
        <StatCard
          label="錯誤"
          value={stats.incorrect}
          color="red"
        />
        <StatCard
          label="新學習"
          value={stats.newLearned}
          color="blue"
        />
      </div>

      {/* 正確率 */}
      <div className="mb-8 text-center">
        <div className="text-sm text-gray-500 mb-1">正確率</div>
        <div className={`text-4xl font-bold ${
          accuracy >= 80 ? 'text-green-600' :
          accuracy >= 60 ? 'text-yellow-600' :
          'text-red-600'
        }`}>
          {accuracy}%
        </div>
      </div>

      {/* 按鈕 */}
      <div className="flex gap-4">
        <Button variant="secondary" onClick={onBackToDecks}>
          返回單字庫
        </Button>
        {onContinue && (
          <Button onClick={onContinue}>
            繼續學習
          </Button>
        )}
      </div>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: number
  color: 'gray' | 'green' | 'red' | 'blue'
}

function StatCard({ label, value, color }: StatCardProps) {
  const colorClasses = {
    gray: 'bg-gray-50 text-gray-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-blue-50 text-blue-700',
  }

  return (
    <div className={`rounded-xl p-4 text-center ${colorClasses[color]}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm opacity-75">{label}</div>
    </div>
  )
}
