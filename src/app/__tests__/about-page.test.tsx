import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import AboutPage from '@/app/about/page'

describe('About page', () => {
  it('renders the hero headline and subhead', () => {
    render(<AboutPage />)
    expect(screen.getByText('Voting you can trust.')).toBeDefined()
    expect(screen.getByText(/Built by one developer, for small communities/)).toBeDefined()
  })

  it('renders the three body sections', () => {
    render(<AboutPage />)
    expect(screen.getByText('Why this exists')).toBeDefined()
    expect(screen.getByText('Why ranked choice?')).toBeDefined()
    expect(screen.getByText("Who it's for")).toBeDefined()
  })

  it('links to FairVote.org and GitHub', () => {
    render(<AboutPage />)
    const fairvote = screen.getByRole('link', { name: 'FairVote.org' })
    expect(fairvote).toHaveAttribute('href', 'https://fairvote.org')
    const github = screen.getByRole('link', { name: /View on GitHub/ })
    expect(github).toHaveAttribute('href', 'https://github.com/ThatDavis/clearvote')
  })

  it('mentions RCV as the core focus', () => {
    render(<AboutPage />)
    expect(screen.getAllByText(/Ranked Choice Voting/).length).toBeGreaterThan(0)
  })
})
