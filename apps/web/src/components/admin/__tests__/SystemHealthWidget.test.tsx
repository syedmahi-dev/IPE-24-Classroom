import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SystemHealthWidget } from '../SystemHealthWidget'

describe('SystemHealthWidget', () => {
  it('renders system health metrics', () => {
    // Only CR can typically see this in the page, but the widget itself just takes data.
    render(<SystemHealthWidget />)
    
    // Check for core titles
    expect(screen.getByText('SYSTEM HEALTH')).toBeInTheDocument()
    
    // Check for some expected metrics from the mockup
    expect(screen.getByText(/Web Portal/i)).toBeInTheDocument()
    expect(screen.getByText(/AI Chatbot/i)).toBeInTheDocument()
    expect(screen.getByText(/telegram/i)).toBeInTheDocument()
    
    // Should have visual indicator of a CR-only component (like an amber title or icon)
    const titleBar = screen.getByText('SYSTEM HEALTH').closest('div')
    // We expect it to be wrapped with CR styling (e.g., border-cr-amber or text-cr-amber or ◆)
    expect(screen.getByText('◆')).toBeInTheDocument()
  })
})
