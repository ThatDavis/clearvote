'use client'

import { useEffect } from 'react'

export default function OrgNameToggle() {
  useEffect(() => {
    const radios = document.querySelectorAll('input[name="accountType"]')
    const handler = () => {
      const checked = document.querySelector(
        'input[name="accountType"]:checked',
      ) as HTMLInputElement | null
      const isOrg = checked?.value === 'organization'
      document.getElementById('orgNameField')?.classList.toggle('hidden', !isOrg)
      const orgNameInput = document.getElementById('orgName') as HTMLInputElement | null
      if (orgNameInput) orgNameInput.required = isOrg
    }

    for (const r of radios) {
      r.addEventListener('change', handler)
    }
    return () => {
      for (const r of radios) {
        r.removeEventListener('change', handler)
      }
    }
  }, [])

  return null
}
