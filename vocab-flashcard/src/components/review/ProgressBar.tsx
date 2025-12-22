/**
 * 進度條元件
 */

interface ProgressBarProps {
  progress: number // 0-100
  current: number
  total: number
}

export function ProgressBar({ progress, current, total }: ProgressBarProps) {
  return (
    <div className="w-full bg-white border-b border-gray-100 px-4 py-3">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">
            進度 {current}/{total}
          </span>
          <span className="text-sm font-medium text-primary-600">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
