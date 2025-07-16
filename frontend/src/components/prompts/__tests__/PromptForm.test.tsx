import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PromptForm } from '../PromptForm';
import { ToastProvider } from '../../common/Toast';

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ToastProvider>
    {children}
  </ToastProvider>
);

describe('PromptForm', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  const existingPrompt = {
    id: 'existing-prompt',
    title: 'Existing Prompt',
    content: 'This is an existing prompt with {{variable1}}',
    variables: [
      { name: 'variable1', type: 'text' as const, description: 'Test variable', required: true }
    ],
    tags: ['existing', 'test'],
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: 'test-user'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty form for new prompt', () => {
    render(
      <TestWrapper>
        <PromptForm onSave={mockOnSave} onCancel={mockOnCancel} />
      </TestWrapper>
    );

    expect(screen.getByLabelText(/title/i)).toHaveValue('');
    expect(screen.getByLabelText(/content/i)).toHaveValue('');
    expect(screen.getByRole('button', { name: /save prompt/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('renders form with existing prompt data', () => {
    render(
      <TestWrapper>
        <PromptForm 
          prompt={existingPrompt}
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      </TestWrapper>
    );

    expect(screen.getByDisplayValue('Existing Prompt')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/This is an existing prompt/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('existing, test')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(
      <TestWrapper>
        <PromptForm onSave={mockOnSave} onCancel={mockOnCancel} />
      </TestWrapper>
    );

    const saveButton = screen.getByRole('button', { name: /save prompt/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      expect(screen.getByText(/content is required/i)).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('detects variables in prompt content', async () => {
    render(
      <TestWrapper>
        <PromptForm onSave={mockOnSave} onCancel={mockOnCancel} />
      </TestWrapper>
    );

    const contentInput = screen.getByLabelText(/content/i);
    fireEvent.change(contentInput, { 
      target: { value: 'Hello {{name}}, your age is {{age}}' } 
    });

    await waitFor(() => {
      expect(screen.getByText('name')).toBeInTheDocument();
      expect(screen.getByText('age')).toBeInTheDocument();
    });
  });

  it('allows editing variable properties', async () => {
    render(
      <TestWrapper>
        <PromptForm onSave={mockOnSave} onCancel={mockOnCancel} />
      </TestWrapper>
    );

    // Add content with variables
    const contentInput = screen.getByLabelText(/content/i);
    fireEvent.change(contentInput, { 
      target: { value: 'Hello {{name}}' } 
    });

    await waitFor(() => {
      expect(screen.getByText('name')).toBeInTheDocument();
    });

    // Edit variable description
    const descriptionInput = screen.getByPlaceholderText(/description for name/i);
    fireEvent.change(descriptionInput, { 
      target: { value: 'User name' } 
    });

    expect(descriptionInput).toHaveValue('User name');
  });

  it('handles tag input', () => {
    render(
      <TestWrapper>
        <PromptForm onSave={mockOnSave} onCancel={mockOnCancel} />
      </TestWrapper>
    );

    const tagsInput = screen.getByLabelText(/tags/i);
    fireEvent.change(tagsInput, { 
      target: { value: 'tag1, tag2, tag3' } 
    });

    expect(tagsInput).toHaveValue('tag1, tag2, tag3');
  });

  it('saves prompt with valid data', async () => {
    render(
      <TestWrapper>
        <PromptForm onSave={mockOnSave} onCancel={mockOnCancel} />
      </TestWrapper>
    );

    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/title/i), { 
      target: { value: 'Test Prompt' } 
    });
    fireEvent.change(screen.getByLabelText(/content/i), { 
      target: { value: 'Hello {{name}}!' } 
    });
    fireEvent.change(screen.getByLabelText(/tags/i), { 
      target: { value: 'test, example' } 
    });

    // Wait for variables to be detected
    await waitFor(() => {
      expect(screen.getByText('name')).toBeInTheDocument();
    });

    // Save the prompt
    const saveButton = screen.getByRole('button', { name: /save prompt/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        title: 'Test Prompt',
        content: 'Hello {{name}}!',
        variables: [
          {
            name: 'name',
            type: 'text',
            description: '',
            required: true
          }
        ],
        tags: ['test', 'example']
      });
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <TestWrapper>
        <PromptForm onSave={mockOnSave} onCancel={mockOnCancel} />
      </TestWrapper>
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('updates existing prompt', async () => {
    render(
      <TestWrapper>
        <PromptForm 
          prompt={existingPrompt}
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      </TestWrapper>
    );

    // Modify the title
    const titleInput = screen.getByDisplayValue('Existing Prompt');
    fireEvent.change(titleInput, { 
      target: { value: 'Updated Prompt' } 
    });

    const saveButton = screen.getByRole('button', { name: /save prompt/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Updated Prompt'
        })
      );
    });
  });

  it('handles variable type changes', async () => {
    render(
      <TestWrapper>
        <PromptForm onSave={mockOnSave} onCancel={mockOnCancel} />
      </TestWrapper>
    );

    // Add content with variables
    const contentInput = screen.getByLabelText(/content/i);
    fireEvent.change(contentInput, { 
      target: { value: 'Your age is {{age}}' } 
    });

    await waitFor(() => {
      expect(screen.getByText('age')).toBeInTheDocument();
    });

    // Change variable type
    const typeSelect = screen.getByDisplayValue('text');
    fireEvent.change(typeSelect, { target: { value: 'number' } });

    expect(typeSelect).toHaveValue('number');
  });

  it('handles variable required toggle', async () => {
    render(
      <TestWrapper>
        <PromptForm onSave={mockOnSave} onCancel={mockOnCancel} />
      </TestWrapper>
    );

    // Add content with variables
    const contentInput = screen.getByLabelText(/content/i);
    fireEvent.change(contentInput, { 
      target: { value: 'Hello {{name}}' } 
    });

    await waitFor(() => {
      expect(screen.getByText('name')).toBeInTheDocument();
    });

    // Toggle required checkbox
    const requiredCheckbox = screen.getByRole('checkbox');
    fireEvent.click(requiredCheckbox);

    expect(requiredCheckbox).not.toBeChecked();
  });

  it('shows loading state during save', async () => {
    const slowOnSave = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <TestWrapper>
        <PromptForm onSave={slowOnSave} onCancel={mockOnCancel} />
      </TestWrapper>
    );

    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/title/i), { 
      target: { value: 'Test Prompt' } 
    });
    fireEvent.change(screen.getByLabelText(/content/i), { 
      target: { value: 'Test content' } 
    });

    const saveButton = screen.getByRole('button', { name: /save prompt/i });
    fireEvent.click(saveButton);

    expect(screen.getByText(/saving/i)).toBeInTheDocument();
    expect(saveButton).toBeDisabled();

    await waitFor(() => {
      expect(slowOnSave).toHaveBeenCalled();
    });
  });

  it('handles empty tags gracefully', async () => {
    render(
      <TestWrapper>
        <PromptForm onSave={mockOnSave} onCancel={mockOnCancel} />
      </TestWrapper>
    );

    // Fill in required fields without tags
    fireEvent.change(screen.getByLabelText(/title/i), { 
      target: { value: 'Test Prompt' } 
    });
    fireEvent.change(screen.getByLabelText(/content/i), { 
      target: { value: 'Test content' } 
    });

    const saveButton = screen.getByRole('button', { name: /save prompt/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: []
        })
      );
    });
  });
});
