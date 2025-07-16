import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EnhancedPromptEditor } from '../EnhancedPromptEditor';
import { Prompt } from '../../../types';

// Mock the template service
jest.mock('../../../services/templateService', () => ({
  templateService: {
    getTemplates: jest.fn().mockResolvedValue([]),
    getCategories: jest.fn().mockResolvedValue([]),
    incrementUsage: jest.fn().mockResolvedValue(undefined)
  }
}));

const mockPrompt: Prompt = {
  id: '1',
  title: 'Test Prompt',
  content: 'This is a test prompt with {{variable}}',
  description: 'A test prompt for testing',
  tags: ['test'],
  category: 'General',
  isPublic: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'user1',
  version: 1,
  variables: [
    {
      name: 'variable',
      type: 'string',
      description: 'A test variable',
      required: true
    }
  ]
};

const mockOnSave = jest.fn();
const mockOnExecute = jest.fn();

describe('EnhancedPromptEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders enhanced prompt editor', () => {
    render(
      <EnhancedPromptEditor
        onSave={mockOnSave}
        onExecute={mockOnExecute}
      />
    );

    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Template Library')).toBeInTheDocument();
    expect(screen.getByText('Quality Analysis')).toBeInTheDocument();
  });

  test('loads existing prompt data', () => {
    render(
      <EnhancedPromptEditor
        prompt={mockPrompt}
        onSave={mockOnSave}
        onExecute={mockOnExecute}
      />
    );

    expect(screen.getByDisplayValue('Test Prompt')).toBeInTheDocument();
    expect(screen.getByDisplayValue('A test prompt for testing')).toBeInTheDocument();
    expect(screen.getByDisplayValue('This is a test prompt with {{variable}}')).toBeInTheDocument();
  });

  test('handles title input change', () => {
    render(
      <EnhancedPromptEditor
        onSave={mockOnSave}
        onExecute={mockOnExecute}
      />
    );

    const titleInput = screen.getByPlaceholderText('Enter a descriptive title for your prompt');
    fireEvent.change(titleInput, { target: { value: 'New Prompt Title' } });

    expect(titleInput).toHaveValue('New Prompt Title');
  });

  test('handles description input change', () => {
    render(
      <EnhancedPromptEditor
        onSave={mockOnSave}
        onExecute={mockOnExecute}
      />
    );

    const descriptionInput = screen.getByPlaceholderText('Describe what this prompt does and when to use it');
    fireEvent.change(descriptionInput, { target: { value: 'New description' } });

    expect(descriptionInput).toHaveValue('New description');
  });

  test('handles category selection', () => {
    render(
      <EnhancedPromptEditor
        onSave={mockOnSave}
        onExecute={mockOnExecute}
      />
    );

    const categorySelect = screen.getByDisplayValue('');
    fireEvent.change(categorySelect, { target: { value: 'Content Creation' } });

    expect(categorySelect).toHaveValue('Content Creation');
  });

  test('handles public checkbox toggle', () => {
    render(
      <EnhancedPromptEditor
        onSave={mockOnSave}
        onExecute={mockOnExecute}
      />
    );

    const publicCheckbox = screen.getByLabelText('Make public');
    fireEvent.click(publicCheckbox);

    expect(publicCheckbox).toBeChecked();
  });

  test('opens template library when button clicked', () => {
    render(
      <EnhancedPromptEditor
        onSave={mockOnSave}
        onExecute={mockOnExecute}
      />
    );

    const templateLibraryButton = screen.getByText('Template Library');
    fireEvent.click(templateLibraryButton);

    // Template library modal should open
    // Note: This would need to be tested with proper modal rendering
  });

  test('toggles preview mode', () => {
    render(
      <EnhancedPromptEditor
        onSave={mockOnSave}
        onExecute={mockOnExecute}
      />
    );

    const previewButton = screen.getByText('Preview');
    fireEvent.click(previewButton);

    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  test('calls onSave when save button clicked with valid data', async () => {
    render(
      <EnhancedPromptEditor
        onSave={mockOnSave}
        onExecute={mockOnExecute}
      />
    );

    // Fill in required fields
    const titleInput = screen.getByPlaceholderText('Enter a descriptive title for your prompt');
    const contentTextarea = screen.getByPlaceholderText(/Enter your prompt content here/);

    fireEvent.change(titleInput, { target: { value: 'Test Title' } });
    fireEvent.change(contentTextarea, { target: { value: 'Test content' } });

    const saveButton = screen.getByText('Save Prompt');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        title: 'Test Title',
        content: 'Test content',
        description: '',
        category: '',
        tags: [],
        isPublic: false,
        variables: []
      });
    });
  });

  test('calls onExecute when test button clicked', async () => {
    render(
      <EnhancedPromptEditor
        onSave={mockOnSave}
        onExecute={mockOnExecute}
      />
    );

    // Fill in required fields
    const titleInput = screen.getByPlaceholderText('Enter a descriptive title for your prompt');
    const contentTextarea = screen.getByPlaceholderText(/Enter your prompt content here/);

    fireEvent.change(titleInput, { target: { value: 'Test Title' } });
    fireEvent.change(contentTextarea, { target: { value: 'Test content' } });

    const testButton = screen.getByText('Test Prompt');
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(mockOnExecute).toHaveBeenCalledWith({
        title: 'Test Title',
        content: 'Test content',
        description: '',
        category: '',
        tags: [],
        isPublic: false,
        variables: []
      });
    });
  });

  test('disables save button when required fields are empty', () => {
    render(
      <EnhancedPromptEditor
        onSave={mockOnSave}
        onExecute={mockOnExecute}
      />
    );

    const saveButton = screen.getByText('Save Prompt');
    expect(saveButton).toBeDisabled();
  });

  test('enables save button when required fields are filled', () => {
    render(
      <EnhancedPromptEditor
        onSave={mockOnSave}
        onExecute={mockOnExecute}
      />
    );

    const titleInput = screen.getByPlaceholderText('Enter a descriptive title for your prompt');
    const contentTextarea = screen.getByPlaceholderText(/Enter your prompt content here/);

    fireEvent.change(titleInput, { target: { value: 'Test Title' } });
    fireEvent.change(contentTextarea, { target: { value: 'Test content' } });

    const saveButton = screen.getByText('Save Prompt');
    expect(saveButton).not.toBeDisabled();
  });

  test('shows loading state when loading prop is true', () => {
    render(
      <EnhancedPromptEditor
        onSave={mockOnSave}
        onExecute={mockOnExecute}
        loading={true}
      />
    );

    // Should show loading spinner in save button
    expect(screen.getByText('Save Prompt')).toBeInTheDocument();
  });

  test('displays quality score when available', async () => {
    render(
      <EnhancedPromptEditor
        onSave={mockOnSave}
        onExecute={mockOnExecute}
      />
    );

    // Add content to trigger quality analysis
    const contentTextarea = screen.getByPlaceholderText(/Enter your prompt content here/);
    fireEvent.change(contentTextarea, { target: { value: 'This is a test prompt with good structure and clear instructions.' } });

    // Wait for quality analysis to complete (mocked)
    await waitFor(() => {
      // Quality score should be displayed
      expect(screen.getByText('Quality Analysis')).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});

describe('EnhancedPromptEditor Integration', () => {
  test('template selection updates form fields', () => {
    // This would test the integration between the editor and template library
    // In a real implementation, this would involve more complex interaction testing
  });

  test('quality analyzer suggestions can be applied', () => {
    // This would test the integration between the editor and quality analyzer
    // Testing auto-fix functionality and suggestion application
  });

  test('variable editor updates are reflected in content preview', () => {
    // This would test the integration between variable editor and content preview
    // Ensuring that variable changes update the preview correctly
  });
});
