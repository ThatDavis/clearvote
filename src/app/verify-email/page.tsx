import { Suspense } from 'react'
import VerifyEmailPage from './verify-email-page'

export default function VerifyEmailWrapper() {
  return (
    <Suspense>
      <VerifyEmailPage />
    </Suspense>
  )
}
