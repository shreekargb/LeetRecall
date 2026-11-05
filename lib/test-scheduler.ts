import { scheduleReviews, rescheduleD7, isExpired } from './scheduler'

const solved = new Date(2026, 9, 14) // months start at 0, so 9 = October
console.log(scheduleReviews(solved))
console.log(rescheduleD7(new Date(2026, 9, 19)))
console.log(isExpired(new Date(2026, 9, 18), new Date(2026, 9, 20))) // false
console.log(isExpired(new Date(2026, 9, 18), new Date(2026, 9, 21))) // true