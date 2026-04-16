import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AdminPageHeader } from '../AdminPageHeader'
import { FileText, Plus } from 'lucide-react'

describe('AdminPageHeader', () => {
  it('renders title and subtitle', () => {
    render(
      <AdminPageHeader
        icon={FileText}
        title="Announcements"
        subtitle="Manage all class announcements"
      />
    )

    expect(screen.getByTestId('admin-header-title')).toHaveTextContent('Announcements')
    expect(screen.getByText('Manage all class announcements')).toBeInTheDocument()
  })

  it('renders action button when actionLabel and onAction are provided', () => {
    const onAction = vi.fn()
    render(
      <AdminPageHeader
        icon={FileText}
        title="Files"
        subtitle="Upload files"
        actionLabel="Upload File"
        onAction={onAction}
        actionIcon={Plus}
      />
    )

    const btn = screen.getByTestId('admin-header-action')
    expect(btn).toHaveTextContent('Upload File')
    fireEvent.click(btn)
    expect(onAction).toHaveBeenCalledOnce()
  })

  it('does not render action button when no onAction provided', () => {
    render(
      <AdminPageHeader
        icon={FileText}
        title="Overview"
        subtitle="Dashboard overview"
      />
    )

    expect(screen.queryByTestId('admin-header-action')).not.toBeInTheDocument()
  })

  it('renders badge when provided', () => {
    render(
      <AdminPageHeader
        icon={FileText}
        title="Users"
        subtitle="Manage users"
        badge="Beta"
      />
    )

    expect(screen.getByText('Beta')).toBeInTheDocument()
  })
})
