import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import RoutinePage from '../page'

// Mock global fetch
global.fetch = vi.fn()

describe('RoutinePage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Mock toLocaleDateString to always return 'Monday' for "highlights current day" test
    vi.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('Monday')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const mockRoutineData = {
    success: true,
    data: [
      {
        id: '1',
        courseCode: 'IPE 4101',
        courseName: 'Industrial Management',
        dayOfWeek: 'Monday',
        startTime: '08:00',
        endTime: '09:00',
        room: 'LT 1',
        teacher: 'Dr. John',
        targetGroup: 'ALL',
        isLab: false,
        status: 'NORMAL',
      },
      {
        id: '2',
        courseCode: 'IPE 4102',
        courseName: 'Manufacturing Processes',
        dayOfWeek: 'Monday',
        startTime: '09:00',
        endTime: '12:00',
        room: 'Lab 1',
        teacher: 'Dr. Jane',
        targetGroup: 'ODD',
        isLab: true,
        status: 'NORMAL',
      },
    ],
    meta: {
      studentGroup: 'ODD',
    },
  }

  it('renders loading state and then data', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockRoutineData,
    } as any)

    render(<RoutinePage />)
    
    expect(screen.getByText(/Syncing Schedule/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByText(/Syncing Schedule/i)).not.toBeInTheDocument()
      expect(screen.getByText('IPE 4101')).toBeInTheDocument()
    }, { timeout: 10000 })
  })

  it('shows student lab group badge', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockRoutineData,
    } as any)

    render(<RoutinePage />)
    
    await waitFor(() => {
      expect(screen.getByText(/Group 2 \(Odd\)/i)).toBeInTheDocument()
    }, { timeout: 10000 })
  })

  it('highlights current day (Monday)', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockRoutineData,
    } as any)

    render(<RoutinePage />)
    
    await waitFor(() => {
      // Find the Monday header - it should have a 'Sparkles' icon (rendered as an element or text if mocked simply, but here we can check the class)
      const mondayHeader = screen.getByText('Monday').closest('div')
      expect(mondayHeader).toHaveClass('bg-emerald-500')
    }, { timeout: 10000 })
  })

  it('renders error state on fetch failure', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('API Down'))

    render(<RoutinePage />)
    
    await waitFor(() => {
      expect(screen.getByText('API Down')).toBeInTheDocument()
    }, { timeout: 10000 })
  })

  it('renders empty state for days with no classes', async () => {
      vi.mocked(fetch).mockResolvedValue({
          ok: true,
          json: async () => ({ success: true, data: [], meta: { studentGroup: 'ALL' } }),
      } as any)

      render(<RoutinePage />)
      
      await waitFor(() => {
          const noClassesElements = screen.getAllByText('No Classes')
          expect(noClassesElements.length).toBeGreaterThan(0)
      }, { timeout: 10000 })
  })
})
