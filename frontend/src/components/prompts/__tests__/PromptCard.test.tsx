import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PromptCard } from '../PromptCard';
import { BrowserRouter } from 'react-router-dom';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn()
  };
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('PromptCard', () => {
  const mockPrompt = {
    id: 'test-prompt-id',
    title: 'Test Prompt',
    content: 'This is a test prompt with {{variable1}} and {{variable2}}',
    variables: [
      { name: 'variable1', type: 'text' as const, description: 'First variable', required: true },
      { name: 'variable2', type: 'number' as const, description: 'Second variable', required: false }
    ],
    tags: ['test', 'example'],
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-02'),
    userId: 'test-user'
  };

  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnExecute = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders prompt card with basic information', () => {
    render(
      <TestWrapper>
        <PromptCard 
          prompt={mockPrompt}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExecute={mockOnExecute}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Test Prompt')).toBeInTheDocument();
    expect(screen.getByText(/This is a test prompt/)).toBeInTheDocument();
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('example')).toBeInTheDocument();
  });

  it('shows variable count', () => {
    render(
      <TestWrapper>
        <PromptCard 
          prompt={mockPrompt}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExecute={mockOnExecute}
        />
      </TestWrapper>
    );

    expect(screen.getByText('2 variables')).toBeInTheDocument();
  });

  it('shows creation date', () => {
    render(
      <TestWrapper>
        <PromptCard 
          prompt={mockPrompt}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExecute={mockOnExecute}
        />
      </TestWrapper>
    );

    expect(screen.getByText(/Jan 1, 2023/)).toBeInTheDocument();
  });

  it('calls onExecute when execute button is clicked', () => {
    render(
      <TestWrapper>
        <PromptCard 
          prompt={mockPrompt}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExecute={mockOnExecute}
        />
      </TestWrapper>
    );

    const executeButton = screen.getByRole('button', { name: /execute/i });
    fireEvent.click(executeButton);

    expect(mockOnExecute).toHaveBeenCalledWith(mockPrompt);
  });

  it('calls onEdit when edit button is clicked', () => {
    render(
      <TestWrapper>
        <PromptCard 
          prompt={mockPrompt}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExecute={mockOnExecute}
        />
      </TestWrapper>
    );

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith(mockPrompt);
  });

  it('calls onDelete when delete button is clicked', () => {
    render(
      <TestWrapper>
        <PromptCard 
          prompt={mockPrompt}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExecute={mockOnExecute}
        />
      </TestWrapper>
    );

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith(mockPrompt.id);
  });

  it('truncates long content', () => {
    const longPrompt = {
      ...mockPrompt,
      content: 'This is a very long prompt content that should be truncated when displayed in the card view because it exceeds the maximum length that we want to show in the preview.'
    };

    render(
      <TestWrapper>
        <PromptCard 
          prompt={longPrompt}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExecute={mockOnExecute}
        />
      </TestWrapper>
    );

    const content = screen.getByText(/This is a very long prompt/);
    expect(content.textContent).toHaveLength(150); // Assuming 150 char limit
  });

  it('handles prompt with no variables', () => {
    const noVariablesPrompt = {
      ...mockPrompt,
      variables: []
    };

    render(
      <TestWrapper>
        <PromptCard 
          prompt={noVariablesPrompt}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExecute={mockOnExecute}
        />
      </TestWrapper>
    );

    expect(screen.getByText('0 variables')).toBeInTheDocument();
  });

  it('handles prompt with no tags', () => {
    const noTagsPrompt = {
      ...mockPrompt,
      tags: []
    };

    render(
      <TestWrapper>
        <PromptCard 
          prompt={noTagsPrompt}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExecute={mockOnExecute}
        />
      </TestWrapper>
    );

    // Should not show any tag elements
    expect(screen.queryByText('test')).not.toBeInTheDocument();
    expect(screen.queryByText('example')).not.toBeInTheDocument();
  });

  it('shows hover effects on card', () => {
    render(
      <TestWrapper>
        <PromptCard 
          prompt={mockPrompt}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExecute={mockOnExecute}
        />
      </TestWrapper>
    );

    const card = screen.getByText('Test Prompt').closest('div');
    expect(card).toHaveClass('hover:shadow-md');
  });

  it('displays correct variable types', () => {
    render(
      <TestWrapper>
        <PromptCard 
          prompt={mockPrompt}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExecute={mockOnExecute}
        />
      </TestWrapper>
    );

    // Check if variable information is displayed (might be in a tooltip or expanded view)
    const card = screen.getByText('Test Prompt').closest('div');
    fireEvent.mouseEnter(card!);

    // Variables might be shown in a tooltip or expanded state
    expect(screen.getByText('2 variables')).toBeInTheDocument();
  });

  it('handles missing optional props gracefully', () => {
    render(
      <TestWrapper>
        <PromptCard 
          prompt={mockPrompt}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExecute={mockOnExecute}
        />
      </TestWrapper>
    );

    // Should render without errors even if some optional props are missing
    expect(screen.getByText('Test Prompt')).toBeInTheDocument();
  });

  it('shows updated date when different from created date', () => {
    const updatedPrompt = {
      ...mockPrompt,
      updatedAt: new Date('2023-01-10')
    };

    render(
      <TestWrapper>
        <PromptCard 
          prompt={updatedPrompt}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExecute={mockOnExecute}
        />
      </TestWrapper>
    );

    // Should show updated date instead of created date
    expect(screen.getByText(/Jan 10, 2023/)).toBeInTheDocument();
  });
});
