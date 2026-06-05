import { Suspense } from 'react'
import VerifyPage from './verify-page'

export default function VerifyWrapper() {
  return (
    <Suspense>
      <VerifyPage />
    </Suspense>
  )
}
