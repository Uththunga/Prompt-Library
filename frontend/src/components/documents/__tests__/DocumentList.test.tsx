import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DocumentList } from '../DocumentList';
import { DocumentService } from '../../../services/documentService';
import { ToastProvider } from '../../common/Toast';

// Mock DocumentService
vi.mock('../../../services/documentService', () => ({
  DocumentService: {
    subscribeToUserDocuments: vi.fn(),
    deleteDocument: vi.fn(),
    formatFileSize: vi.fn((size) => `${size} bytes`),
    getFileTypeIcon: vi.fn(() => '📄')
  }
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ToastProvider>
    {children}
  </ToastProvider>
);

describe('DocumentList', () => {
  const mockUserId = 'test-user-id';
  const mockOnDocumentSelect = vi.fn();

  const mockDocuments = [
    {
      id: 'doc1',
      filename: 'document1.pdf',
      originalName: 'Document 1.pdf',
      filePath: 'documents/user/document1.pdf',
      downloadURL: 'https://example.com/doc1.pdf',
      uploadedBy: mockUserId,
      uploadedAt: { seconds: Date.now() / 1000, toDate: () => new Date() },
      size: 1024,
      type: 'application/pdf',
      status: 'completed' as const,
      chunks: ['chunk1', 'chunk2'],
      metadata: {
        originalSize: 1024,
        contentType: 'application/pdf',
        chunk_count: 2,
        character_count: 500,
        word_count: 100
      }
    },
    {
      id: 'doc2',
      filename: 'document2.docx',
      originalName: 'Document 2.docx',
      filePath: 'documents/user/document2.docx',
      downloadURL: 'https://example.com/doc2.docx',
      uploadedBy: mockUserId,
      uploadedAt: { seconds: Date.now() / 1000, toDate: () => new Date() },
      size: 2048,
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      status: 'processing' as const,
      chunks: [],
      metadata: {
        originalSize: 2048,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }
    },
    {
      id: 'doc3',
      filename: 'document3.txt',
      originalName: 'Document 3.txt',
      filePath: 'documents/user/document3.txt',
      downloadURL: 'https://example.com/doc3.txt',
      uploadedBy: mockUserId,
      uploadedAt: { seconds: Date.now() / 1000, toDate: () => new Date() },
      size: 512,
      type: 'text/plain',
      status: 'failed' as const,
      chunks: [],
      metadata: {
        originalSize: 512,
        contentType: 'text/plain'
      },
      error: 'Processing failed'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the subscription to return documents
    (DocumentService.subscribeToUserDocuments as vi.Mock).mockImplementation((userId, callback) => {
      callback(mockDocuments);
      return vi.fn(); // unsubscribe function
    });
  });

  it('renders document list with documents', async () => {
    render(
      <TestWrapper>
        <DocumentList userId={mockUserId} onDocumentSelect={mockOnDocumentSelect} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Document 1.pdf')).toBeInTheDocument();
      expect(screen.getByText('Document 2.docx')).toBeInTheDocument();
      expect(screen.getByText('Document 3.txt')).toBeInTheDocument();
    });
  });

  it('shows document status indicators', async () => {
    render(
      <TestWrapper>
        <DocumentList userId={mockUserId} onDocumentSelect={mockOnDocumentSelect} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Processing')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  it('displays file sizes correctly', async () => {
    render(
      <TestWrapper>
        <DocumentList userId={mockUserId} onDocumentSelect={mockOnDocumentSelect} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('1024 bytes')).toBeInTheDocument();
      expect(screen.getByText('2048 bytes')).toBeInTheDocument();
      expect(screen.getByText('512 bytes')).toBeInTheDocument();
    });
  });

  it('shows search functionality', async () => {
    render(
      <TestWrapper>
        <DocumentList userId={mockUserId} onDocumentSelect={mockOnDocumentSelect} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText(/search documents/i);
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'Document 1' } });

    await waitFor(() => {
      expect(screen.getByText('Document 1.pdf')).toBeInTheDocument();
      expect(screen.queryByText('Document 2.docx')).not.toBeInTheDocument();
      expect(screen.queryByText('Document 3.txt')).not.toBeInTheDocument();
    });
  });

  it('filters documents by status', async () => {
    render(
      <TestWrapper>
        <DocumentList userId={mockUserId} onDocumentSelect={mockOnDocumentSelect} />
      </TestWrapper>
    );

    // Filter by completed status
    const statusFilter = screen.getByDisplayValue('all');
    fireEvent.change(statusFilter, { target: { value: 'completed' } });

    await waitFor(() => {
      expect(screen.getByText('Document 1.pdf')).toBeInTheDocument();
      expect(screen.queryByText('Document 2.docx')).not.toBeInTheDocument();
      expect(screen.queryByText('Document 3.txt')).not.toBeInTheDocument();
    });
  });

  it('handles document deletion', async () => {
    (DocumentService.deleteDocument as vi.Mock).mockResolvedValue(undefined);

    render(
      <TestWrapper>
        <DocumentList userId={mockUserId} onDocumentSelect={mockOnDocumentSelect} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Document 1.pdf')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(DocumentService.deleteDocument).toHaveBeenCalledWith('doc1');
    });
  });

  it('shows error message for failed documents', async () => {
    render(
      <TestWrapper>
        <DocumentList userId={mockUserId} onDocumentSelect={mockOnDocumentSelect} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Processing failed')).toBeInTheDocument();
    });
  });

  it('handles document selection', async () => {
    render(
      <TestWrapper>
        <DocumentList userId={mockUserId} onDocumentSelect={mockOnDocumentSelect} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Document 1.pdf')).toBeInTheDocument();
    });

    // Click on document
    const documentCard = screen.getByText('Document 1.pdf').closest('div');
    fireEvent.click(documentCard!);

    expect(mockOnDocumentSelect).toHaveBeenCalledWith(mockDocuments[0]);
  });

  it('shows empty state when no documents', async () => {
    (DocumentService.subscribeToUserDocuments as vi.Mock).mockImplementation((userId, callback) => {
      callback([]);
      return vi.fn();
    });

    render(
      <TestWrapper>
        <DocumentList userId={mockUserId} onDocumentSelect={mockOnDocumentSelect} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/no documents found/i)).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    (DocumentService.subscribeToUserDocuments as vi.Mock).mockImplementation(() => {
      // Don't call callback immediately
      return vi.fn();
    });

    render(
      <TestWrapper>
        <DocumentList userId={mockUserId} onDocumentSelect={mockOnDocumentSelect} />
      </TestWrapper>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('displays chunk count for completed documents', async () => {
    render(
      <TestWrapper>
        <DocumentList userId={mockUserId} onDocumentSelect={mockOnDocumentSelect} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('2 chunks')).toBeInTheDocument();
    });
  });

  it('shows download links for documents', async () => {
    render(
      <TestWrapper>
        <DocumentList userId={mockUserId} onDocumentSelect={mockOnDocumentSelect} />
      </TestWrapper>
    );

    await waitFor(() => {
      const downloadLinks = screen.getAllByRole('link', { name: /download/i });
      expect(downloadLinks).toHaveLength(3);
      expect(downloadLinks[0]).toHaveAttribute('href', 'https://example.com/doc1.pdf');
    });
  });

  it('handles subscription cleanup on unmount', () => {
    const mockUnsubscribe = vi.fn();
    (DocumentService.subscribeToUserDocuments as vi.Mock).mockReturnValue(mockUnsubscribe);

    const { unmount } = render(
      <TestWrapper>
        <DocumentList userId={mockUserId} onDocumentSelect={mockOnDocumentSelect} />
      </TestWrapper>
    );

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('updates when userId changes', async () => {
    const { rerender } = render(
      <TestWrapper>
        <DocumentList userId={mockUserId} onDocumentSelect={mockOnDocumentSelect} />
      </TestWrapper>
    );

    expect(DocumentService.subscribeToUserDocuments).toHaveBeenCalledWith(mockUserId, expect.any(Function));

    // Change userId
    rerender(
      <TestWrapper>
        <DocumentList userId="new-user-id" onDocumentSelect={mockOnDocumentSelect} />
      </TestWrapper>
    );

    expect(DocumentService.subscribeToUserDocuments).toHaveBeenCalledWith('new-user-id', expect.any(Function));
  });
});
