import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// notFound() throws a special NEXT_NOT_FOUND error in the Next runtime.
// For tests we mock it to throw a sentinel we can assert on.
vi.mock('next/navigation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/navigation')>()
  return {
    ...actual,
    notFound: () => {
      throw new Error('NEXT_NOT_FOUND')
    },
  }
})

import MethodPage, { generateMetadata, generateStaticParams } from '@/app/method/[id]/page'

const VALID_IDS = ['rcv', 'stv', 'approval', 'yesno'] as const

describe('MethodPage generateStaticParams', () => {
  it('returns the four registered voting method IDs', () => {
    const ids = generateStaticParams().map((p) => p.id)
    expect(ids.sort()).toEqual([...VALID_IDS].sort())
  })
})

describe('MethodPage generateMetadata', () => {
  it('returns a titled metadata object for a valid id', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ id: 'rcv' }) })
    expect(meta.title).toBe('Ranked Choice - ClearVote')
    expect(meta.description).toBeDefined()
  })

  it('returns a not-found title for an unknown id', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ id: 'nope' }) })
    expect(meta.title).toBe('Method not found - ClearVote')
  })
})

describe('MethodPage render', () => {
  it('renders label, fullDesc, bestFor, and CTA for each registered method', async () => {
    for (const id of VALID_IDS) {
      const { unmount } = render(await MethodPage({ params: Promise.resolve({ id }) }))

      // How-it-works / Best-for / Configuration / CTA section labels
      expect(screen.getByText('How it works')).toBeDefined()
      expect(screen.getByText('Best for')).toBeDefined()
      expect(screen.getByText('Configuration')).toBeDefined()

      // CTA link text mentions "Create a ... poll"
      expect(screen.getByRole('link', { name: /Create a .* poll/ })).toBeDefined()

      unmount()
    }
  })

  it('throws NEXT_NOT_FOUND for an unknown id', async () => {
    await expect(MethodPage({ params: Promise.resolve({ id: 'not-a-method' }) })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    )
  })
})
