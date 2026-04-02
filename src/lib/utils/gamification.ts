export function calculatePoints(score: number, currentStreak: number): number {
  let points = Math.round(score * 10)
  if (score === 100) points += 50
  if (currentStreak > 1) points += Math.min(currentStreak * 20, 100)
  return points
}

export function calculateNewStreak(lastActive: string | null): number {
  if (!lastActive) return 1
  const last = new Date(lastActive)
  const today = new Date()
  const diffDays = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 0 // already studied today, no increment
  if (diffDays === 1) return 1 // increment streak
  return -1 // reset streak (gap > 1 day)
}
