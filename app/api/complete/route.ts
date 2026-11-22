import { NextResponse } from 'next/server'

// Retired: reviews must be completed through their assessment-specific endpoint.
export async function POST() {
  return NextResponse.json(
    { error: 'Complete the quiz or explanation to finish this review.' },
    { status: 410 }
  )
}
