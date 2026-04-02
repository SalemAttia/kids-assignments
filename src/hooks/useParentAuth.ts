'use client'
import { useCallback, useEffect, useState } from 'react'

export function useParentAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    setIsAuthenticated(sessionStorage.getItem('parentAuth') === 'true')
  }, [])

  const login = useCallback((username: string, password: string): boolean => {
    const validUser = process.env.NEXT_PUBLIC_PARENT_USERNAME || 'admin'
    const validPass = process.env.NEXT_PUBLIC_PARENT_PASSWORD || '1234'
    if (username === validUser && password === validPass) {
      sessionStorage.setItem('parentAuth', 'true')
      setIsAuthenticated(true)
      return true
    }
    return false
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem('parentAuth')
    setIsAuthenticated(false)
  }, [])

  return { isAuthenticated, login, logout }
}
