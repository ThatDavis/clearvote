import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Home from '@/app/page'

describe('Home page', () => {
  it('renders the hero headline and primary CTAs', () => {
    render(<Home />)
    expect(screen.getByText(/actually trust\./)).toBeDefined()
    expect(screen.getByRole('link', { name: /Start a vote/ })).toBeDefined()
    expect(screen.getByRole('link', { name: /Verify a vote/ })).toBeDefined()
  })

  it('renders the bento grid with all four voting methods', () => {
    render(<Home />)
    expect(screen.getByRole('link', { name: /Ranked Choice/ })).toBeDefined()
    expect(screen.getByRole('link', { name: /Multi-winner/ })).toBeDefined()
    expect(screen.getByRole('link', { name: /Approval/ })).toBeDefined()
    expect(screen.getByRole('link', { name: /Yes \/ No/ })).toBeDefined()
  })

  it('renders the badge label and supporting features', () => {
    render(<Home />)
    expect(screen.getByText(/Open-source - self-hostable/)).toBeDefined()
    expect(screen.getByText('100% open source')).toBeDefined()
    expect(screen.getByText('SHA-256 receipts')).toBeDefined()
    expect(screen.getByText('Anonymous ballots')).toBeDefined()
  })

  it('intro section header on the card band', () => {
    render(<Home />)
    expect(screen.getByText('Four methods. One trustworthy box.')).toBeDefined()
  })
})
