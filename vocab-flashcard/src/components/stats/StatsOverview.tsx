/**
 * 統計總覽元件
 */

interface StatsOverviewProps {
  totalWords: number
  learnedWords: number
  masteredWords: number
  streak: number
  todayReviewed: number
}

export function StatsOverview({
  totalWords,
  learnedWords,
  masteredWords,
  streak,
  todayReviewed,
}: StatsOverviewProps) {
  const stats = [
    {
      label: '總學習單字',
      value: learnedWords,
      total: totalWords,
      icon: '📖',
      color: 'blue',
    },
    {
      label: '已精熟',
      value: masteredWords,
      total: learnedWords,
      icon: '⭐',
      color: 'yellow',
    },
    {
      label: '今日複習',
      value: todayReviewed,
      icon: '✅',
      color: 'green',
    },
    {
      label: '連續學習',
      value: streak,
      suffix: '天',
      icon: '🔥',
      color: 'red',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map(stat => (
        <div
          key={stat.label}
          className="bg-white rounded-xl shadow-md p-6 text-center"
        >
          <div className="text-3xl mb-2">{stat.icon}</div>
          <div className="text-3xl font-bold text-gray-800">
            {stat.value}
            {stat.suffix && (
              <span className="text-lg font-normal text-gray-500">
                {stat.suffix}
              </span>
            )}
          </div>
          {stat.total !== undefined && (
            <div className="text-sm text-gray-400">
              / {stat.total}
            </div>
          )}
          <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}
