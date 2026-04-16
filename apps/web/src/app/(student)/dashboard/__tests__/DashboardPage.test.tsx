import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import DashboardPage from '../page'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    announcement: {
      findMany: vi.fn(),
    },
    exam: {
      findMany: vi.fn(),
    },
  },
}))

// Mock child components to simplify testing the page logic
vi.mock('@/components/announcements/AnnouncementCard', () => ({
  AnnouncementCard: ({ announcement }: any) => <div data-testid="announcement-card">{announcement.title}</div>,
}))

vi.mock('@/components/routine/RoutineWidget', () => ({
  RoutineWidget: () => <div data-testid="routine-widget">Routine Widget</div>,
}))

vi.mock('@/components/exams/ExamCountdown', () => ({
  ExamCountdown: ({ exam }: any) => <div data-testid="exam-countdown">{exam.title}</div>,
}))

vi.mock('@/components/notifications/NotificationBell', () => ({
  NotificationBell: () => <div data-testid="notification-bell">Bell</div>,
}))

describe('DashboardPage', () => {
  const mockSession = {
    user: {
      name: 'John Doe',
      role: 'student',
      studentId: '200041123', // ODD
    },
  }

  const mockAnnouncements = [
    {
      id: '1',
      title: 'Test Announcement',
      body: '<p>Body</p>',
      type: 'general',
      publishedAt: new Date(),
      author: { name: 'Admin', role: 'admin' },
    },
  ]

  const mockExams = [
    {
      id: '1',
      title: 'Midterm',
      examDate: new Date(),
      course: { name: 'Math' },
    },
  ]

  it('renders hero section with user name and role', async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.announcement.findMany).mockResolvedValue(mockAnnouncements as any)
    vi.mocked(prisma.exam.findMany).mockResolvedValue(mockExams as any)

    const jsx = await DashboardPage()
    render(jsx)

    expect(screen.getByText(/Good/)).toBeInTheDocument()
    expect(screen.getByText('John')).toBeInTheDocument()
    expect(screen.getByText('Student')).toBeInTheDocument()
  })

  it('renders announcements when available', async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.announcement.findMany).mockResolvedValue(mockAnnouncements as any)
    vi.mocked(prisma.exam.findMany).mockResolvedValue(mockExams as any)

    const jsx = await DashboardPage()
    render(jsx)

    expect(screen.getByTestId('announcement-card')).toBeInTheDocument()
    expect(screen.getByText('Test Announcement')).toBeInTheDocument()
  })

  it('renders exams when available', async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.announcement.findMany).mockResolvedValue(mockAnnouncements as any)
    vi.mocked(prisma.exam.findMany).mockResolvedValue(mockExams as any)

    const jsx = await DashboardPage()
    render(jsx)

    expect(screen.getByTestId('exam-countdown')).toBeInTheDocument()
    expect(screen.getByText('Midterm')).toBeInTheDocument()
  })

  it('renders empty states when no data exists', async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.exam.findMany).mockResolvedValue([] as any)

    const jsx = await DashboardPage()
    render(jsx)

    expect(screen.getByText('No recent announcements')).toBeInTheDocument()
    expect(screen.getByText('No exams soon!')).toBeInTheDocument()
  })
})
