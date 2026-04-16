import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ExamCountdown } from '../ExamCountdown'

describe('ExamCountdown', () => {
  it('renders the exam course code', () => {
    const exam = {
      title: 'Final Exam',
      examDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      course: { code: 'IPE 101', name: 'Intro to IPE' },
    }

    render(<ExamCountdown exam={exam} />)
    expect(screen.getByText('IPE 101')).toBeInTheDocument()
    expect(screen.getByText('Final Exam')).toBeInTheDocument()
  })

  it('renders "Exam" fallback when no course code', () => {
    const exam = {
      title: 'Pop Quiz',
      examDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      course: null,
    }

    render(<ExamCountdown exam={exam} />)
    expect(screen.getByText('Exam')).toBeInTheDocument()
  })

  it('shows date in correct format', () => {
    const futureDate = new Date(2026, 4, 20, 10, 0) // May 20, 2026 10:00 AM
    const exam = {
      title: 'Midterm',
      examDate: futureDate.toISOString(),
      course: { code: 'CSE 101' },
    }

    render(<ExamCountdown exam={exam} />)
    // Should show "May 20" somewhere
    expect(screen.getByText('May 20')).toBeInTheDocument()
  })

  it('renders "Upcoming Assessment" when no title provided', () => {
    const exam = {
      examDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      course: { code: 'IPE 201' },
    }

    render(<ExamCountdown exam={exam} />)
    expect(screen.getByText('Upcoming Assessment')).toBeInTheDocument()
  })

  it('renders relative time text (e.g., "in X days")', () => {
    const exam = {
      title: 'Lab Quiz',
      examDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
      course: { code: 'IPE 301' },
    }

    render(<ExamCountdown exam={exam} />)
    // formatDistanceToNow produces something like "in 2 days"
    expect(screen.getByText(/in \d+ (day|hour|minute)/i)).toBeInTheDocument()
  })
})
