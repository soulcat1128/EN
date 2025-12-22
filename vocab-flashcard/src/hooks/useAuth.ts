/**
 * 認證 Hook
 */

import { useState, useEffect, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import {
  signInWithGoogle,
  signOut,
  getCurrentUser,
  onAuthStateChange,
} from '@/lib/supabase/auth'

interface AuthState {
  user: User | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  })

  useEffect(() => {
    // 初始化：取得當前用戶
    getCurrentUser().then(user => {
      setState(prev => ({
        ...prev,
        user,
        isLoading: false,
        isAuthenticated: !!user,
      }))
    })

    // 監聽認證狀態變化
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      setState(prev => ({
        ...prev,
        user: session?.user ?? null,
        session,
        isLoading: false,
        isAuthenticated: !!session?.user,
      }))
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }))
    try {
      await signInWithGoogle()
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }))
      throw error
    }
  }, [])

  const logout = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }))
    try {
      await signOut()
      setState({
        user: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
      })
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }))
      throw error
    }
  }, [])

  return {
    ...state,
    login,
    logout,
  }
}
