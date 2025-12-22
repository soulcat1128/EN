/**
 * 主要佈局元件
 */

import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Header } from './Header'
import { Loading } from '@/components/ui'

interface MainLayoutProps {
  requireAuth?: boolean
}

export function MainLayout({ requireAuth = true }: MainLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <Loading fullScreen message="載入中..." />
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
