/**
 * Header 元件
 */

import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui'

export function Header() {
  const location = useLocation()
  const { user, isAuthenticated, logout } = useAuth()

  const navItems = [
    { path: '/decks', label: '單字庫' },
    { path: '/stats', label: '統計' },
  ]

  const isActive = (path: string) => location.pathname.startsWith(path)

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">📚</span>
            <span className="text-xl font-bold text-primary-600">VocabFlash</span>
          </Link>

          {/* Navigation */}
          {isAuthenticated && (
            <nav className="flex items-center gap-1">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${
                      isActive(item.path)
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-gray-600">
                  {user?.email}
                </span>
                <Button variant="ghost" size="sm" onClick={logout}>
                  登出
                </Button>
              </>
            ) : (
              <Link to="/login">
                <Button size="sm">登入</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
