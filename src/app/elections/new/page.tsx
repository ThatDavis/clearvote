'use client'

import { Suspense } from 'react'
import NewElectionForm from './new-election-form'

export default function NewElectionPage() {
  return (
    <Suspense>
      <NewElectionForm />
    </Suspense>
  )
}
