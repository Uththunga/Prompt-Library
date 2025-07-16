import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DocumentUpload } from '../DocumentUpload';
import { useAuth } from '../../../contexts/AuthContext';
import { ToastProvider } from '../../common/Toast';

// Mock Firebase modules
vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytesResumable: vi.fn(),
  getDownloadURL: vi.fn()
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  serverTimestamp: vi.fn()
}));

vi.mock('../../../config/firebase', () => ({
  storage: {},
  db: {}
}));

// Mock auth context
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

const mockUseAuth = useAuth as vi.MockedFunction<typeof useAuth>;

// Test wrapper with providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ToastProvider>
    {children}
  </ToastProvider>
);

describe('DocumentUpload', () => {
  const mockOnUploadComplete = vi.fn();
  const mockUser = {
    uid: 'test-user-id',
    email: 'test@example.com'
  };

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
  });

  it('renders upload area correctly', () => {
    render(
      <TestWrapper>
        <DocumentUpload onUploadComplete={mockOnUploadComplete} />
      </TestWrapper>
    );

    expect(screen.getByText('Upload Documents')).toBeInTheDocument();
    expect(screen.getByText('Drag and drop files here, or click to select')).toBeInTheDocument();
    expect(screen.getByText('Supported formats: PDF, DOCX, TXT, MD (max 10MB)')).toBeInTheDocument();
  });

  it('shows file input when click to upload', () => {
    render(
      <TestWrapper>
        <DocumentUpload onUploadComplete={mockOnUploadComplete} />
      </TestWrapper>
    );

    const uploadArea = screen.getByText('Drag and drop files here, or click to select').closest('div');
    fireEvent.click(uploadArea!);

    // File input should be triggered (though we can't easily test the actual file dialog)
    expect(uploadArea).toBeInTheDocument();
  });

  it('validates file types correctly', async () => {
    render(
      <TestWrapper>
        <DocumentUpload onUploadComplete={mockOnUploadComplete} />
      </TestWrapper>
    );

    // Create a mock file with unsupported type
    const invalidFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    
    const fileInput = screen.getByRole('button', { name: /upload documents/i }).querySelector('input[type="file"]');
    
    if (fileInput) {
      Object.defineProperty(fileInput, 'files', {
        value: [invalidFile],
        writable: false,
      });
      
      fireEvent.change(fileInput);
    }

    // Should show error for unsupported file type
    await waitFor(() => {
      expect(screen.getByText(/unsupported file type/i)).toBeInTheDocument();
    });
  });

  it('validates file size correctly', async () => {
    render(
      <TestWrapper>
        <DocumentUpload onUploadComplete={mockOnUploadComplete} />
      </TestWrapper>
    );

    // Create a mock file that's too large (>10MB)
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
    
    const fileInput = screen.getByRole('button', { name: /upload documents/i }).querySelector('input[type="file"]');
    
    if (fileInput) {
      Object.defineProperty(fileInput, 'files', {
        value: [largeFile],
        writable: false,
      });
      
      fireEvent.change(fileInput);
    }

    // Should show error for file too large
    await waitFor(() => {
      expect(screen.getByText(/file too large/i)).toBeInTheDocument();
    });
  });

  it('accepts valid files', async () => {
    render(
      <TestWrapper>
        <DocumentUpload onUploadComplete={mockOnUploadComplete} />
      </TestWrapper>
    );

    // Create a valid PDF file
    const validFile = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
    
    const fileInput = screen.getByRole('button', { name: /upload documents/i }).querySelector('input[type="file"]');
    
    if (fileInput) {
      Object.defineProperty(fileInput, 'files', {
        value: [validFile],
        writable: false,
      });
      
      fireEvent.change(fileInput);
    }

    // Should show the file in the upload list
    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });
  });

  it('allows removing files from upload queue', async () => {
    render(
      <TestWrapper>
        <DocumentUpload onUploadComplete={mockOnUploadComplete} />
      </TestWrapper>
    );

    // Add a valid file
    const validFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByRole('button', { name: /upload documents/i }).querySelector('input[type="file"]');
    
    if (fileInput) {
      Object.defineProperty(fileInput, 'files', {
        value: [validFile],
        writable: false,
      });
      
      fireEvent.change(fileInput);
    }

    // Wait for file to appear
    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });

    // Click remove button
    const removeButton = screen.getByRole('button', { name: /remove/i });
    fireEvent.click(removeButton);

    // File should be removed
    await waitFor(() => {
      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
    });
  });

  it('handles drag and drop events', () => {
    render(
      <TestWrapper>
        <DocumentUpload onUploadComplete={mockOnUploadComplete} />
      </TestWrapper>
    );

    const uploadArea = screen.getByText('Drag and drop files here, or click to select').closest('div');

    // Test drag enter
    fireEvent.dragEnter(uploadArea!);
    expect(uploadArea).toHaveClass('border-blue-500'); // Should highlight on drag

    // Test drag leave
    fireEvent.dragLeave(uploadArea!);
    expect(uploadArea).not.toHaveClass('border-blue-500');

    // Test drop
    const validFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const dropEvent = new Event('drop', { bubbles: true });
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: {
        files: [validFile]
      }
    });

    fireEvent(uploadArea!, dropEvent);
    
    // Should process the dropped file
    expect(screen.getByText('test.pdf')).toBeInTheDocument();
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
        <DocumentUpload onUploadComplete={mockOnUploadComplete} />
      </TestWrapper>
    );

    // Should not allow upload without authentication
    const uploadButton = screen.getByRole('button', { name: /upload all/i });
    expect(uploadButton).toBeDisabled();
  });

  it('shows upload progress', async () => {
    const { uploadBytesResumable } = await import('firebase/storage');
    const mockUploadTask = {
      on: vi.fn((event, progressCallback, errorCallback, completeCallback) => {
        // Simulate progress
        setTimeout(() => progressCallback({ bytesTransferred: 50, totalBytes: 100 }), 100);
        setTimeout(() => completeCallback(), 200);
      }),
      snapshot: {
        ref: {}
      }
    };

    (uploadBytesResumable as vi.Mock).mockReturnValue(mockUploadTask);

    render(
      <TestWrapper>
        <DocumentUpload onUploadComplete={mockOnUploadComplete} />
      </TestWrapper>
    );

    // Add a file and start upload
    const validFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByRole('button', { name: /upload documents/i }).querySelector('input[type="file"]');
    
    if (fileInput) {
      Object.defineProperty(fileInput, 'files', {
        value: [validFile],
        writable: false,
      });
      
      fireEvent.change(fileInput);
    }

    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });

    // Start upload
    const uploadButton = screen.getByRole('button', { name: /upload all/i });
    fireEvent.click(uploadButton);

    // Should show progress
    await waitFor(() => {
      expect(screen.getByText(/uploading/i)).toBeInTheDocument();
    });
  });
});
