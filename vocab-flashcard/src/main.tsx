import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from './lib/supabase/client'
import App from './App.tsx'
import './index.css'

// 處理 OAuth callback（解決 HashRouter 衝突）
async function handleOAuthCallback() {
  const hash = window.location.hash
  if (hash && hash.includes('access_token')) {
    const hashParams = new URLSearchParams(hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')

    if (accessToken && refreshToken) {
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      // 清除 URL 中的 token，重導向到首頁
      window.location.hash = ''
      window.location.reload()
      return
    }
  }
}

// 啟動前先處理 OAuth callback
handleOAuthCallback()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 分鐘
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
