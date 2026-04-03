'use client'
import { useCallback } from 'react'
import type { Question } from '@/types'

export function useStudySession() {
  const setSessionId = useCallback((id: string) => {
    // Clear stale questions whenever a new session starts
    sessionStorage.removeItem('questions')
    sessionStorage.removeItem('reportId')
    sessionStorage.setItem('sessionId', id)
  }, [])

  const getSessionId = useCallback((): string | null => {
    return sessionStorage.getItem('sessionId')
  }, [])

  const setQuestions = useCallback((questions: Question[], sessionId: string) => {
    sessionStorage.setItem('questionsSessionId', sessionId)
    sessionStorage.setItem('questions', JSON.stringify(questions))
  }, [])

  const getQuestions = useCallback((sessionId: string): Question[] => {
    const cachedSessionId = sessionStorage.getItem('questionsSessionId')
    if (cachedSessionId !== sessionId) return [] // stale cache — different session
    const raw = sessionStorage.getItem('questions')
    return raw ? JSON.parse(raw) : []
  }, [])

  const setReportId = useCallback((id: string) => {
    sessionStorage.setItem('reportId', id)
  }, [])

  const getReportId = useCallback((): string | null => {
    return sessionStorage.getItem('reportId')
  }, [])

  const clearSession = useCallback(() => {
    sessionStorage.removeItem('sessionId')
    sessionStorage.removeItem('questions')
    sessionStorage.removeItem('questionsSessionId')
    sessionStorage.removeItem('reportId')
  }, [])

  return { setSessionId, getSessionId, setQuestions, getQuestions, setReportId, getReportId, clearSession }
}
