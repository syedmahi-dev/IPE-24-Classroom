import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PendingActionsWidget } from '../PendingActionsWidget'

describe('PendingActionsWidget', () => {
  it('renders pending actions list', () => {
    // This is a CR only component
    render(<PendingActionsWidget />)
    
    // Check for core titles
    expect(screen.getByText(/REQUIRES YOUR ATTENTION/i)).toBeInTheDocument()
    
    // Check for some expected mock content
    expect(screen.getAllByText(/knowledge base/i).length).toBeGreaterThan(0)
    
    // Should have visual indicator of a CR-only component
    expect(screen.getByText('◆')).toBeInTheDocument()
  })
})
