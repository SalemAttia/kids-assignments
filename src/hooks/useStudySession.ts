'use client'
import { useCallback } from 'react'
import type { Question } from '@/types'

export function useStudySession() {
  const setSessionId = useCallback((id: string) => {
    sessionStorage.setItem('sessionId', id)
  }, [])

  const getSessionId = useCallback((): string | null => {
    return sessionStorage.getItem('sessionId')
  }, [])

  const setQuestions = useCallback((questions: Question[]) => {
    sessionStorage.setItem('questions', JSON.stringify(questions))
  }, [])

  const getQuestions = useCallback((): Question[] => {
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
    sessionStorage.removeItem('reportId')
  }, [])

  return { setSessionId, getSessionId, setQuestions, getQuestions, setReportId, getReportId, clearSession }
}
