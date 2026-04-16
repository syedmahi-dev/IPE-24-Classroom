import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AdminDataTable, Column } from '../AdminDataTable'

type Item = { id: string; name: string; email: string }

const columns: Column<Item>[] = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
]

const mockData: Item[] = [
  { id: '1', name: 'Alice', email: 'alice@iut-dhaka.edu' },
  { id: '2', name: 'Bob', email: 'bob@iut-dhaka.edu' },
]

describe('AdminDataTable', () => {
  const defaultProps = {
    columns,
    data: mockData,
    page: 1,
    totalPages: 1,
    onPageChange: vi.fn(),
    getId: (item: Item) => item.id,
  }

  it('renders column headers', () => {
    render(<AdminDataTable {...defaultProps} />)
    // Both desktop (th) and mobile (span) renders exist in jsdom
    expect(screen.getAllByText('Name').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Email').length).toBeGreaterThanOrEqual(1)
  })

  it('renders data rows', () => {
    render(<AdminDataTable {...defaultProps} />)
    // Data appears in both desktop table and mobile cards
    expect(screen.getAllByText('Alice').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('bob@iut-dhaka.edu').length).toBeGreaterThanOrEqual(1)
  })

  it('shows empty state when data is empty', () => {
    render(
      <AdminDataTable
        {...defaultProps}
        data={[]}
        emptyTitle="Nothing here"
        emptyMessage="Create a new entry."
      />
    )
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
    expect(screen.getByText('Create a new entry.')).toBeInTheDocument()
  })

  it('renders search input when onSearchChange is provided', () => {
    const onSearchChange = vi.fn()
    render(
      <AdminDataTable
        {...defaultProps}
        search=""
        onSearchChange={onSearchChange}
        searchPlaceholder="Search users..."
      />
    )

    const searchInput = screen.getByTestId('admin-table-search-input')
    expect(searchInput).toBeInTheDocument()
    fireEvent.change(searchInput, { target: { value: 'Alice' } })
    expect(onSearchChange).toHaveBeenCalledWith('Alice')
  })

  it('renders pagination controls for multiple pages', () => {
    const onPageChange = vi.fn()
    render(
      <AdminDataTable
        {...defaultProps}
        page={1}
        totalPages={3}
        total={30}
        onPageChange={onPageChange}
      />
    )

    expect(screen.getByText('of 3')).toBeInTheDocument()
    expect(screen.getByText('(30 total)')).toBeInTheDocument()

    // Click Next
    fireEvent.click(screen.getByText('Next'))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('disables Prev button on first page', () => {
    render(<AdminDataTable {...defaultProps} page={1} totalPages={3} />)
    expect(screen.getByText('Prev').closest('button')).toBeDisabled()
  })

  it('disables Next button on last page', () => {
    render(<AdminDataTable {...defaultProps} page={3} totalPages={3} />)
    expect(screen.getByText('Next').closest('button')).toBeDisabled()
  })

  it('does not show pagination controls when only 1 page', () => {
    render(<AdminDataTable {...defaultProps} page={1} totalPages={1} />)
    expect(screen.queryByText('Prev')).not.toBeInTheDocument()
    expect(screen.queryByText('Next')).not.toBeInTheDocument()
  })

  it('shows loading overlay when loading is true', () => {
    render(<AdminDataTable {...defaultProps} loading={true} />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders custom column renderers', () => {
    const columnsWithRender: Column<Item>[] = [
      { key: 'name', label: 'Name', render: (item) => <strong>{item.name.toUpperCase()}</strong> },
      { key: 'email', label: 'Email' },
    ]
    render(<AdminDataTable {...defaultProps} columns={columnsWithRender} />)
    expect(screen.getAllByText('ALICE').length).toBeGreaterThanOrEqual(1)
  })

  it('calls onRowClick when a row is clicked', () => {
    const onRowClick = vi.fn()
    render(<AdminDataTable {...defaultProps} onRowClick={onRowClick} />)
    
    // Click on the first occurrence of Alice
    fireEvent.click(screen.getAllByText('Alice')[0])
    expect(onRowClick).toHaveBeenCalledWith(mockData[0])
  })

  it('renders actions column when actions are provided', () => {
    render(
      <AdminDataTable
        {...defaultProps}
        actions={(item) => <button>Delete {item.name}</button>}
      />
    )
    // Actions header only appears in the desktop table
    expect(screen.getByText('Actions')).toBeInTheDocument()
    expect(screen.getAllByText('Delete Alice').length).toBeGreaterThanOrEqual(1)
  })
})
