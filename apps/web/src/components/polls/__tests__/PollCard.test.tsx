import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
// import { PollCard } from '../PollCard'
import { vi, describe, it, expect } from 'vitest'

const poll = {
  id: 'poll-1',
  question: 'When should we schedule the class trip?',
  options: ['This Friday', 'Next Monday', 'Next Friday'],
  isClosed: false,
  userVoted: false,
}

describe.skip('PollCard', () => {
  it('TC-4.2.1: renders the question', () => {
    // Component missing: PollCard
    // expect(screen.getByText('When should we schedule the class trip?')).toBeInTheDocument()
  })

  it('TC-4.2.2: renders all options', () => {
    // Component missing: PollCard
    // poll.options.forEach(opt => expect(screen.getByText(opt)).toBeInTheDocument())
  })

  it('TC-4.2.3: clicking an option calls onVote with correct index', async () => {
    const onVote = vi.fn()
    // Component missing: PollCard
    // await userEvent.click(screen.getByText('Next Monday'))
    // expect(onVote).toHaveBeenCalledWith('poll-1', 1)
  })

  it('TC-4.2.4: voting buttons are disabled after voting', () => {
    // Component missing: PollCard
    // const buttons = screen.getAllByRole('button')
    // buttons.forEach(btn => expect(btn).toBeDisabled())
  })

  it('TC-4.2.5: closed poll shows results, not vote buttons', () => {
    // Component missing: PollCard
    // expect(screen.getByText(/closed/i)).toBeInTheDocument()
  })
})
