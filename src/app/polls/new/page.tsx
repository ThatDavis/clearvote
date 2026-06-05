import { Suspense } from 'react'
import NewPollForm from './new-poll-form'

export default function NewPollPage() {
  return (
    <Suspense>
      <NewPollForm />
    </Suspense>
  )
}
