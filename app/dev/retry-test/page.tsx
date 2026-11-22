import { notFound } from 'next/navigation'
import RetryTest from './RetryTest'

export default function RetryTestPage() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <RetryTest />
}
