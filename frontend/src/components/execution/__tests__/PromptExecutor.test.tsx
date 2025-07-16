import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PromptExecutor } from '../PromptExecutor';
import { useAuth } from '../../../contexts/AuthContext';
import { ToastProvider } from '../../common/Toast';
import { DocumentService } from '../../../services/documentService';

// Mock Firebase functions
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn()
}));

vi.mock('../../../config/firebase', () => ({
  functions: {}
}));

// Mock auth context
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

// Mock document service
vi.mock('../../../services/documentService', () => ({
  DocumentService: {
    getDocumentsByStatus: vi.fn(),
    formatFileSize: vi.fn((size) => `${size} bytes`)
  }
}));

const mockUseAuth = useAuth as vi.MockedFunction<typeof useAuth>;

// Test wrapper with providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ToastProvider>
    {children}
  </ToastProvider>
);

describe('PromptExecutor', () => {
  const mockPrompt = {
    id: 'test-prompt-id',
    title: 'Test Prompt',
    content: 'This is a test prompt with {{variable1}} and {{variable2}}',
    variables: [
      { name: 'variable1', type: 'text' as const, description: 'First variable', required: true },
      { name: 'variable2', type: 'text' as const, description: 'Second variable', required: false }
    ],
    tags: ['test'],
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: 'test-user'
  };

  const mockUser = {
    uid: 'test-user-id',
    email: 'test@example.com'
  };

  const mockOnExecutionComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      currentUser: mockUser,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      signInWithGoogle: vi.fn()
    });

    (DocumentService.getDocumentsByStatus as vi.Mock).mockResolvedValue([]);
  });

  it('renders prompt executor correctly', () => {
    render(
      <TestWrapper>
        <PromptExecutor prompt={mockPrompt} onExecutionComplete={mockOnExecutionComplete} />
      </TestWrapper>
    );

    expect(screen.getByText('Execute Prompt')).toBeInTheDocument();
    expect(screen.getByText('Test Prompt')).toBeInTheDocument();
    expect(screen.getByDisplayValue('This is a test prompt with {{variable1}} and {{variable2}}')).toBeInTheDocument();
  });

  it('shows variable inputs for prompt variables', () => {
    render(
      <TestWrapper>
        <PromptExecutor prompt={mockPrompt} onExecutionComplete={mockOnExecutionComplete} />
      </TestWrapper>
    );

    expect(screen.getByLabelText('variable1 *')).toBeInTheDocument();
    expect(screen.getByLabelText('variable2')).toBeInTheDocument();
    expect(screen.getByText('First variable')).toBeInTheDocument();
    expect(screen.getByText('Second variable')).toBeInTheDocument();
  });

  it('validates required variables before execution', async () => {
    render(
      <TestWrapper>
        <PromptExecutor prompt={mockPrompt} onExecutionComplete={mockOnExecutionComplete} />
      </TestWrapper>
    );

    // Try to execute without filling required variable
    const executeButton = screen.getByRole('button', { name: /execute prompt/i });
    fireEvent.click(executeButton);

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/variable1 is required/i)).toBeInTheDocument();
    });
  });

  it('allows execution with valid inputs', async () => {
    const mockExecuteFunction = vi.fn().mockResolvedValue({
      data: {
        output: 'Test response',
        metadata: {
          model: 'test-model',
          tokensUsed: 100,
          executionTime: 1.5,
          cost: 0.001
        }
      }
    });

    const { httpsCallable } = await import('firebase/functions');
    (httpsCallable as vi.Mock).mockReturnValue(mockExecuteFunction);

    render(
      <TestWrapper>
        <PromptExecutor prompt={mockPrompt} onExecutionComplete={mockOnExecutionComplete} />
      </TestWrapper>
    );

    // Fill in required variable
    const variable1Input = screen.getByLabelText('variable1 *');
    fireEvent.change(variable1Input, { target: { value: 'test value 1' } });

    // Execute prompt
    const executeButton = screen.getByRole('button', { name: /execute prompt/i });
    fireEvent.click(executeButton);

    // Should call the execute function
    await waitFor(() => {
      expect(mockExecuteFunction).toHaveBeenCalledWith({
        promptId: 'test-prompt-id',
        inputs: { variable1: 'test value 1', variable2: '' },
        useRag: false,
        ragQuery: '',
        documentIds: []
      });
    });

    // Should show result
    await waitFor(() => {
      expect(screen.getByText('Test response')).toBeInTheDocument();
    });
  });

  it('shows execution settings panel', () => {
    render(
      <TestWrapper>
        <PromptExecutor prompt={mockPrompt} onExecutionComplete={mockOnExecutionComplete} />
      </TestWrapper>
    );

    // Open settings
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);

    expect(screen.getByText('Execution Settings')).toBeInTheDocument();
    expect(screen.getByLabelText(/model/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/temperature/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/max tokens/i)).toBeInTheDocument();
  });

  it('allows enabling RAG and shows document selection', async () => {
    const mockDocuments = [
      {
        id: 'doc1',
        originalName: 'test-doc.pdf',
        size: 1024,
        metadata: { chunk_count: 5 }
      }
    ];

    (DocumentService.getDocumentsByStatus as vi.Mock).mockResolvedValue(mockDocuments);

    render(
      <TestWrapper>
        <PromptExecutor prompt={mockPrompt} onExecutionComplete={mockOnExecutionComplete} />
      </TestWrapper>
    );

    // Open settings
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);

    // Enable RAG
    const ragCheckbox = screen.getByLabelText(/use rag/i);
    fireEvent.click(ragCheckbox);

    // Should show document selection
    await waitFor(() => {
      expect(screen.getByText('Select Documents for Context')).toBeInTheDocument();
      expect(screen.getByText('test-doc.pdf')).toBeInTheDocument();
    });
  });

  it('handles execution errors gracefully', async () => {
    const mockExecuteFunction = vi.fn().mockRejectedValue(new Error('Execution failed'));

    const { httpsCallable } = await import('firebase/functions');
    (httpsCallable as vi.Mock).mockReturnValue(mockExecuteFunction);

    render(
      <TestWrapper>
        <PromptExecutor prompt={mockPrompt} onExecutionComplete={mockOnExecutionComplete} />
      </TestWrapper>
    );

    // Fill in required variable
    const variable1Input = screen.getByLabelText('variable1 *');
    fireEvent.change(variable1Input, { target: { value: 'test value 1' } });

    // Execute prompt
    const executeButton = screen.getByRole('button', { name: /execute prompt/i });
    fireEvent.click(executeButton);

    // Should handle error
    await waitFor(() => {
      expect(screen.getByText(/execution failed/i)).toBeInTheDocument();
    });
  });

  it('tests OpenRouter connection', async () => {
    const mockTestFunction = vi.fn().mockResolvedValue({
      data: {
        status: 'success',
        test_response: {
          content: 'Hello!',
          tokens_used: 10,
          response_time: 1.2
        },
        model_info: {
          model: 'test-model'
        }
      }
    });

    const { httpsCallable } = await import('firebase/functions');
    (httpsCallable as vi.Mock).mockReturnValue(mockTestFunction);

    render(
      <TestWrapper>
        <PromptExecutor prompt={mockPrompt} onExecutionComplete={mockOnExecutionComplete} />
      </TestWrapper>
    );

    // Click test connection button
    const testButton = screen.getByRole('button', { name: /test connection/i });
    fireEvent.click(testButton);

    // Should call test function
    await waitFor(() => {
      expect(mockTestFunction).toHaveBeenCalled();
    });
  });

  it('shows execution results with metadata', async () => {
    const mockExecuteFunction = vi.fn().mockResolvedValue({
      data: {
        output: 'Test response with context',
        context: 'Retrieved context from documents',
        metadata: {
          model: 'llama-3.2-11b',
          tokensUsed: 150,
          executionTime: 2.3,
          cost: 0.0,
          contextMetadata: {
            total_chunks_found: 5,
            chunks_used: 3,
            context_length: 500
          }
        }
      }
    });

    const { httpsCallable } = await import('firebase/functions');
    (httpsCallable as vi.Mock).mockReturnValue(mockExecuteFunction);

    render(
      <TestWrapper>
        <PromptExecutor prompt={mockPrompt} onExecutionComplete={mockOnExecutionComplete} />
      </TestWrapper>
    );

    // Fill in required variable and execute
    const variable1Input = screen.getByLabelText('variable1 *');
    fireEvent.change(variable1Input, { target: { value: 'test value' } });

    const executeButton = screen.getByRole('button', { name: /execute prompt/i });
    fireEvent.click(executeButton);

    // Should show results with metadata
    await waitFor(() => {
      expect(screen.getByText('Test response with context')).toBeInTheDocument();
      expect(screen.getByText('2.30s')).toBeInTheDocument(); // execution time
      expect(screen.getByText('150 tokens')).toBeInTheDocument(); // token count
      expect(screen.getByText('$0.0000')).toBeInTheDocument(); // cost
      expect(screen.getByText(/RAG Context Used/i)).toBeInTheDocument();
    });
  });

  it('requires authentication', () => {
    mockUseAuth.mockReturnValue({
      currentUser: null,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      signInWithGoogle: vi.fn()
    });

    render(
      <TestWrapper>
        <PromptExecutor prompt={mockPrompt} onExecutionComplete={mockOnExecutionComplete} />
      </TestWrapper>
    );

    // Execute button should be disabled without auth
    const executeButton = screen.getByRole('button', { name: /execute prompt/i });
    expect(executeButton).toBeDisabled();
  });
});
