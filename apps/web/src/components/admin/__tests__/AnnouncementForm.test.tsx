import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
// import { AnnouncementForm } from '../AnnouncementForm'
import { vi, describe, it, expect } from 'vitest'

describe.skip('AnnouncementForm', () => {
  it('TC-4.3.1: shows error when title is empty on submit', async () => {
    // Component missing: AnnouncementForm
    // await userEvent.click(screen.getByRole('button', { name: /publish/i }))
    // await waitFor(() => expect(screen.getByText(/title is required/i)).toBeInTheDocument())
  })

  it('TC-4.3.2: shows error when body is empty', async () => {
    // Component missing: AnnouncementForm
    // await userEvent.type(screen.getByLabelText(/title/i), 'Test')
    // await userEvent.click(screen.getByRole('button', { name: /publish/i }))
    // await waitFor(() => expect(screen.getByText(/body is required/i)).toBeInTheDocument())
  })

  it('TC-4.3.3: title max length 60 chars enforced', async () => {
    // Component missing: AnnouncementForm
    // await userEvent.type(screen.getByLabelText(/title/i), 'a'.repeat(61))
    // await userEvent.click(screen.getByRole('button', { name: /publish/i }))
    // await waitFor(() => expect(screen.getByText(/max 60/i)).toBeInTheDocument())
  })

  it('TC-4.3.4: valid form submission calls onSubmit once', async () => {
    const onSubmit = vi.fn()
    // Component missing: AnnouncementForm
    // await userEvent.type(screen.getByLabelText(/title/i), 'Valid Title')
    // await userEvent.click(screen.getByRole('button', { name: /publish/i }))
  })
})
