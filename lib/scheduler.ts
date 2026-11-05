export const PASS_MARK = 3
export const GRACE_DAYS = 2

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function scheduleReviews(solvedDate: Date) {
  return [
    { type: 'd1', due_date: addDays(solvedDate, 1) },
    { type: 'd4', due_date: addDays(solvedDate, 4) },
    { type: 'd7', due_date: addDays(solvedDate, 7) },
  ]
}

export function rescheduleD7(d4CompletedDate: Date): Date {
  return addDays(d4CompletedDate, 3)
}

export function isExpired(dueDate: Date, today: Date): boolean {
  const msPerDay = 1000 * 60 * 60 * 24
  const daysLate = Math.floor((today.getTime() - dueDate.getTime()) / msPerDay)
  return daysLate > GRACE_DAYS
}


export function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
