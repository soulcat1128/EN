/**
 * 路由配置
 */

import { createHashRouter, Navigate } from 'react-router-dom'
import { MainLayout } from '@/components/layout'
import { LoginPage } from '@/pages/LoginPage'
import { DecksPage } from '@/pages/DecksPage'
import { ReviewPage } from '@/pages/ReviewPage'
import { StatsPage } from '@/pages/StatsPage'

export const router = createHashRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <MainLayout requireAuth={true} />,
    children: [
      {
        index: true,
        element: <Navigate to="/decks" replace />,
      },
      {
        path: 'decks',
        element: <DecksPage />,
      },
      {
        path: 'review/:deckId',
        element: <ReviewPage />,
      },
      {
        path: 'stats',
        element: <StatsPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/decks" replace />,
  },
])
