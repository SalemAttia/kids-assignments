'use client'
import { useCallback, useEffect, useState } from 'react'

const KEY = 'selectedUserId'

export function useCurrentUser() {
  const [userId, setUserIdState] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setUserIdState(localStorage.getItem(KEY))
    setLoaded(true)
  }, [])

  const setUserId = useCallback((id: string) => {
    localStorage.setItem(KEY, id)
    setUserIdState(id)
  }, [])

  const clearUser = useCallback(() => {
    localStorage.removeItem(KEY)
    setUserIdState(null)
  }, [])

  return { userId, loaded, setUserId, clearUser }
}
