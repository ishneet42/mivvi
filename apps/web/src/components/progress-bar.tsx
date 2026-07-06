'use client'
import { Next13ProgressBar } from 'next13-progressbar'

export function ProgressBar() {
  return (
    <Next13ProgressBar
      height="2px"
      color="#D8412A"
      options={{ showSpinner: false }}
      showOnShallow
    />
  )
}
