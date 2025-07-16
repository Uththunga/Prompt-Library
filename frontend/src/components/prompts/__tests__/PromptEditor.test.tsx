import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PromptEditor } from '../PromptEditor';
import type { Prompt } from '../../../types';

const mockPrompt: Prompt = {
  id: 'test-prompt-1',
  title: 'Test Prompt',
  content: 'This is a test prompt with {{variable1}}',
  description: 'A test prompt for testing',
  tags: ['test', 'example'],
  category: 'General',
  isPublic: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'user-1',
  version: 1,
  variables: [
    {
      name: 'variable1',
      type: 'string',
      description: 'A test variable',
      required: true,
    },
  ],
};

describe('PromptEditor', () => {
  const mockOnSave = vi.fn();
  const mockOnExecute = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders editor with prompt data', () => {
    render(
      <PromptEditor 
        prompt={mockPrompt} 
        onSave={mockOnSave} 
        onExecute={mockOnExecute} 
      />
    );
    
    expect(screen.getByDisplayValue('Test Prompt')).toBeInTheDocument();
    expect(screen.getByDisplayValue('A test prompt for testing')).toBeInTheDocument();
    expect(screen.getByDisplayValue('This is a test prompt with {{variable1}}')).toBeInTheDocument();
  });

  it('renders empty editor for new prompt', () => {
    render(
      <PromptEditor 
        onSave={mockOnSave} 
        onExecute={mockOnExecute} 
      />
    );
    
    expect(screen.getByText('Create New Prompt')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter prompt title')).toHaveValue('');
  });

  it('allows adding and removing tags', async () => {
    render(
      <PromptEditor 
        onSave={mockOnSave} 
        onExecute={mockOnExecute} 
      />
    );
    
    const tagInput = screen.getByPlaceholderText('Add a tag');
    const addButton = screen.getByRole('button', { name: 'Add' });
    
    fireEvent.change(tagInput, { target: { value: 'new-tag' } });
    fireEvent.click(addButton);
    
    expect(screen.getByText('new-tag')).toBeInTheDocument();
    
    // Remove tag
    const removeButton = screen.getByRole('button', { name: '' }); // X button
    fireEvent.click(removeButton);
    
    expect(screen.queryByText('new-tag')).not.toBeInTheDocument();
  });

  it('toggles preview mode', () => {
    render(
      <PromptEditor 
        prompt={mockPrompt} 
        onSave={mockOnSave} 
        onExecute={mockOnExecute} 
      />
    );
    
    const previewButton = screen.getByText('Show Preview');
    fireEvent.click(previewButton);
    
    expect(screen.getByText('Hide Preview')).toBeInTheDocument();
    expect(screen.getByText(/This is a test prompt with \[variable1: string\]/)).toBeInTheDocument();
  });

  it('calls onSave when save button is clicked', async () => {
    render(
      <PromptEditor 
        prompt={mockPrompt} 
        onSave={mockOnSave} 
        onExecute={mockOnExecute} 
      />
    );
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });
  });

  it('manages variables correctly', () => {
    render(
      <PromptEditor 
        onSave={mockOnSave} 
        onExecute={mockOnExecute} 
      />
    );
    
    const addVariableButton = screen.getByText('Add Variable');
    fireEvent.click(addVariableButton);
    
    expect(screen.getByPlaceholderText('Variable name')).toBeInTheDocument();
    expect(screen.getByDisplayValue('string')).toBeInTheDocument();
  });
});
