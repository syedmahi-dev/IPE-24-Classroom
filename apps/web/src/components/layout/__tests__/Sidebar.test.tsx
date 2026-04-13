import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Sidebar } from '../Sidebar'

describe('Sidebar', () => {
  it('renders student navigation by default', () => {
    render(<Sidebar role="student" />)
    
    // Core student links should exist
    expect(screen.getByTestId('nav-Dashboard')).toBeInTheDocument()
    expect(screen.getByTestId('nav-Announcements')).toBeInTheDocument()
    expect(screen.getByTestId('nav-Class-Routine')).toBeInTheDocument()
    expect(screen.getByTestId('nav-Virtual-CR')).toBeInTheDocument()
    
    // Admin links shouldn't be there
    expect(screen.queryByTestId('nav-Overview')).not.toBeInTheDocument()
    expect(screen.queryByTestId('nav-Users')).not.toBeInTheDocument()
  })

  it('renders admin navigation when role is admin', () => {
    render(<Sidebar role="admin" />)
    screen.debug()
    
    // Admin tools should exist
    expect(screen.getByTestId('nav-Overview')).toBeInTheDocument()
    expect(screen.getByTestId('nav-Announcements')).toBeInTheDocument()
    expect(screen.getByTestId('nav-Exams')).toBeInTheDocument()
    
    // Super-admin only tools should be rendered but locked (or at least visually show they are locked via aria-labels or classes)
    const usersLink = screen.getByTestId('nav-Users')
    expect(usersLink).toBeInTheDocument()
    // It should have some aria-disabled or visual indicator
    expect(usersLink).toHaveAttribute('aria-disabled', 'true')
  })

  it('renders super_admin navigation with full access', () => {
    render(<Sidebar role="super_admin" />)
    
    // Admin tools
    expect(screen.getByTestId('nav-Overview')).toBeInTheDocument()
    
    // Super-admin tools should be fully accessible
    const usersLink = screen.getByTestId('nav-Users')
    expect(usersLink).toBeInTheDocument()
    expect(usersLink).not.toHaveAttribute('aria-disabled', 'true')
  })
})
