/**
 * 統計頁面
 */

import { useStats } from '@/hooks/useStats'
import { StatsOverview } from '@/components/stats'
import { Loading, Card } from '@/components/ui'

export function StatsPage() {
  const { data: stats, isLoading, error } = useStats()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loading message="載入統計資料..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">😢</div>
        <h3 className="text-xl font-medium text-gray-600">
          載入統計失敗
        </h3>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">學習統計</h1>
        <p className="text-gray-500 mt-1">
          追蹤你的學習進度
        </p>
      </div>

      {/* Overview Stats */}
      <StatsOverview
        totalWords={stats.totalWords}
        learnedWords={stats.learnedWords}
        masteredWords={stats.masteredWords}
        streak={stats.currentStreak}
        todayReviewed={stats.todayReviewed}
      />

      {/* Future 7 Days Forecast */}
      <Card className="mt-8">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            未來 7 天待複習
          </h2>
          <div className="grid grid-cols-7 gap-2">
            {stats.forecast.map(day => (
              <div
                key={day.date}
                className={`text-center p-3 rounded-lg ${
                  day.count > 0 ? 'bg-primary-50' : 'bg-gray-50'
                }`}
              >
                <div className="text-sm text-gray-500">{day.label}</div>
                <div
                  className={`text-2xl font-bold ${
                    day.count > 0 ? 'text-primary-600' : 'text-gray-300'
                  }`}
                >
                  {day.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Daily Stats Chart (簡化版本) */}
      <Card className="mt-8">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            過去 7 天學習紀錄
          </h2>
          {stats.dailyStats.length > 0 ? (
            <div className="space-y-3">
              {stats.dailyStats.slice(-7).reverse().map(day => (
                <div key={day.date} className="flex items-center gap-4">
                  <span className="text-sm text-gray-500 w-24">
                    {formatDate(day.date)}
                  </span>
                  <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (day.reviewed / 50) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 w-16 text-right">
                    {day.reviewed} 個
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              還沒有學習紀錄，開始你的第一次複習吧！
            </p>
          )}
        </div>
      </Card>

      {/* Tips */}
      <Card className="mt-8 bg-gradient-to-r from-primary-50 to-blue-50">
        <div className="p-6">
          <h3 className="font-semibold text-gray-800 mb-2">💡 學習小技巧</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 每天固定時間複習，效果最好</li>
            <li>• 不確定時選擇「Hard」而非「Again」，幫助加深記憶</li>
            <li>• 連續學習天數越多，記憶效果越好</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}/${day}`
}
