import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { AnnouncementCard } from '../AnnouncementCard'

const mockAnnouncement = {
  id: '1',
  title: 'Mid-Term Exam Schedule',
  body: '<p>Mid-term exams start on November 15th.</p>',
  type: 'exam' as const,
  publishedAt: new Date('2024-11-01'),
  author: { name: 'CR Test' },
}

describe('AnnouncementCard', () => {
  afterEach(cleanup)

  it('renders title', () => {
    render(<AnnouncementCard announcement={mockAnnouncement} />)
    expect(screen.getByText('Mid-Term Exam Schedule')).toBeInTheDocument()
  })

  it('shows type badge', () => {
    render(<AnnouncementCard announcement={mockAnnouncement} />)
    expect(screen.getByText('Exam')).toBeInTheDocument()
  })

  it('shows author name', () => {
    render(<AnnouncementCard announcement={mockAnnouncement} />)
    expect(screen.getByText(/CR Test/)).toBeInTheDocument()
  })

  it('does not render script tags from body', () => {
    const xssAnnouncement = { ...mockAnnouncement, body: '<script>alert("xss")</script><p>Safe</p>' }
    render(<AnnouncementCard announcement={xssAnnouncement} />)
    expect(document.querySelector('script')).toBeNull()
    expect(screen.getByText('Safe')).toBeInTheDocument()
  })
})
