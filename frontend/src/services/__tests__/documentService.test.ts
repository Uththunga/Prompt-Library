import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentService } from '../documentService';

// Mock Firebase modules
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(),
  deleteDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({ seconds: Date.now() / 1000 }))
}));

vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  deleteObject: vi.fn()
}));

vi.mock('../../config/firebase', () => ({
  db: {},
  storage: {}
}));

describe('DocumentService', () => {
  const mockUserId = 'test-user-id';
  const mockDocumentId = 'test-doc-id';

  const mockDocument = {
    id: mockDocumentId,
    filename: 'test.pdf',
    originalName: 'test.pdf',
    filePath: 'documents/test-user/test.pdf',
    downloadURL: 'https://example.com/test.pdf',
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserDocuments', () => {
    it('fetches user documents successfully', async () => {
      const { getDocs, query } = await import('firebase/firestore');
      
      const mockQuerySnapshot = {
        docs: [
          { id: mockDocumentId, data: () => mockDocument }
        ]
      };

      (getDocs as vi.Mock).mockResolvedValue(mockQuerySnapshot);
      (query as vi.Mock).mockReturnValue({});

      const result = await DocumentService.getUserDocuments(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: mockDocumentId, ...mockDocument });
    });

    it('handles errors when fetching documents', async () => {
      const { getDocs } = await import('firebase/firestore');
      
      (getDocs as vi.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(DocumentService.getUserDocuments(mockUserId)).rejects.toThrow('Firestore error');
    });
  });

  describe('getDocument', () => {
    it('fetches single document successfully', async () => {
      const { getDoc } = await import('firebase/firestore');
      
      const mockDocSnap = {
        exists: () => true,
        id: mockDocumentId,
        data: () => mockDocument
      };

      (getDoc as vi.Mock).mockResolvedValue(mockDocSnap);

      const result = await DocumentService.getDocument(mockDocumentId);

      expect(result).toEqual({ id: mockDocumentId, ...mockDocument });
    });

    it('returns null when document does not exist', async () => {
      const { getDoc } = await import('firebase/firestore');
      
      const mockDocSnap = {
        exists: () => false
      };

      (getDoc as vi.Mock).mockResolvedValue(mockDocSnap);

      const result = await DocumentService.getDocument(mockDocumentId);

      expect(result).toBeNull();
    });
  });

  describe('subscribeToUserDocuments', () => {
    it('sets up real-time subscription', () => {
      const { onSnapshot } = vi.mocked(require('firebase/firestore').onSnapshot);
      const mockCallback = vi.fn();
      const mockUnsubscribe = vi.fn();

      onSnapshot.mockReturnValue(mockUnsubscribe);

      const unsubscribe = DocumentService.subscribeToUserDocuments(mockUserId, mockCallback);

      expect(onSnapshot).toHaveBeenCalled();
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('calls callback with documents when snapshot updates', () => {
      const { onSnapshot } = vi.mocked(require('firebase/firestore').onSnapshot);
      const mockCallback = vi.fn();

      onSnapshot.mockImplementation((query, callback) => {
        const mockQuerySnapshot = {
          docs: [
            { id: mockDocumentId, data: () => mockDocument }
          ]
        };
        callback(mockQuerySnapshot);
        return vi.fn();
      });

      DocumentService.subscribeToUserDocuments(mockUserId, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith([
        { id: mockDocumentId, ...mockDocument }
      ]);
    });
  });

  describe('deleteDocument', () => {
    it('deletes document and file successfully', async () => {
      const { getDoc, deleteDoc } = await import('firebase/firestore');
      const { deleteObject } = await import('firebase/storage');

      const mockDocSnap = {
        exists: () => true,
        data: () => mockDocument
      };

      (getDoc as vi.Mock).mockResolvedValue(mockDocSnap);
      (deleteDoc as vi.Mock).mockResolvedValue(undefined);
      (deleteObject as vi.Mock).mockResolvedValue(undefined);

      await DocumentService.deleteDocument(mockDocumentId);

      expect(deleteObject).toHaveBeenCalled();
      expect(deleteDoc).toHaveBeenCalled();
    });

    it('handles file deletion errors gracefully', async () => {
      const { getDoc, deleteDoc } = await import('firebase/firestore');
      const { deleteObject } = await import('firebase/storage');

      const mockDocSnap = {
        exists: () => true,
        data: () => mockDocument
      };

      (getDoc as vi.Mock).mockResolvedValue(mockDocSnap);
      (deleteObject as vi.Mock).mockRejectedValue(new Error('File not found'));
      (deleteDoc as vi.Mock).mockResolvedValue(undefined);

      // Should not throw error even if file deletion fails
      await expect(DocumentService.deleteDocument(mockDocumentId)).resolves.toBeUndefined();
      expect(deleteDoc).toHaveBeenCalled();
    });

    it('throws error when document not found', async () => {
      const { getDoc } = await import('firebase/firestore');

      const mockDocSnap = {
        exists: () => false
      };

      (getDoc as vi.Mock).mockResolvedValue(mockDocSnap);

      await expect(DocumentService.deleteDocument(mockDocumentId)).rejects.toThrow('Document not found');
    });
  });

  describe('getProcessingStats', () => {
    it('calculates processing statistics correctly', async () => {
      const documents = [
        { ...mockDocument, status: 'completed' as const, metadata: { ...mockDocument.metadata, chunk_count: 5 } },
        { ...mockDocument, id: 'doc2', status: 'processing' as const, size: 2048 },
        { ...mockDocument, id: 'doc3', status: 'failed' as const, size: 512 }
      ];

      vi.spyOn(DocumentService, 'getUserDocuments').mockResolvedValue(documents);

      const stats = await DocumentService.getProcessingStats(mockUserId);

      expect(stats).toEqual({
        total: 3,
        completed: 1,
        processing: 1,
        failed: 1,
        totalSize: 1024 + 2048 + 512,
        totalChunks: 5
      });
    });
  });

  describe('searchDocuments', () => {
    it('filters documents by search term', async () => {
      const documents = [
        { ...mockDocument, filename: 'report.pdf', originalName: 'Annual Report.pdf' },
        { ...mockDocument, id: 'doc2', filename: 'invoice.pdf', originalName: 'Invoice 2023.pdf' },
        { ...mockDocument, id: 'doc3', filename: 'contract.docx', originalName: 'Service Contract.docx' }
      ];

      vi.spyOn(DocumentService, 'getUserDocuments').mockResolvedValue(documents);

      const results = await DocumentService.searchDocuments(mockUserId, 'report');

      expect(results).toHaveLength(1);
      expect(results[0].filename).toBe('report.pdf');
    });

    it('searches in both filename and originalName', async () => {
      const documents = [
        { ...mockDocument, filename: 'doc1.pdf', originalName: 'Important Report.pdf' },
        { ...mockDocument, id: 'doc2', filename: 'report_2023.pdf', originalName: 'Document.pdf' }
      ];

      vi.spyOn(DocumentService, 'getUserDocuments').mockResolvedValue(documents);

      const results = await DocumentService.searchDocuments(mockUserId, 'report');

      expect(results).toHaveLength(2);
    });
  });

  describe('utility methods', () => {
    describe('formatFileSize', () => {
      it('formats bytes correctly', () => {
        expect(DocumentService.formatFileSize(0)).toBe('0 Bytes');
        expect(DocumentService.formatFileSize(1024)).toBe('1 KB');
        expect(DocumentService.formatFileSize(1024 * 1024)).toBe('1 MB');
        expect(DocumentService.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
        expect(DocumentService.formatFileSize(1536)).toBe('1.5 KB');
      });
    });

    describe('getFileTypeIcon', () => {
      it('returns correct icons for different file types', () => {
        expect(DocumentService.getFileTypeIcon('application/pdf')).toBe('📄');
        expect(DocumentService.getFileTypeIcon('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('📝');
        expect(DocumentService.getFileTypeIcon('text/plain')).toBe('📃');
        expect(DocumentService.getFileTypeIcon('text/markdown')).toBe('📋');
        expect(DocumentService.getFileTypeIcon('unknown/type')).toBe('📄');
      });
    });
  });

  describe('updateDocumentStatus', () => {
    it('updates document status successfully', async () => {
      const { updateDoc } = await import('firebase/firestore');
      
      (updateDoc as vi.Mock).mockResolvedValue(undefined);

      await DocumentService.updateDocumentStatus(mockDocumentId, 'completed');

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'completed',
          updatedAt: expect.anything(),
          processedAt: expect.anything()
        })
      );
    });

    it('includes error in update when provided', async () => {
      const { updateDoc } = await import('firebase/firestore');
      
      (updateDoc as vi.Mock).mockResolvedValue(undefined);

      await DocumentService.updateDocumentStatus(mockDocumentId, 'failed', 'Processing error');

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'failed',
          error: 'Processing error',
          updatedAt: expect.anything()
        })
      );
    });
  });

  describe('getDocumentChunks', () => {
    it('fetches document chunks successfully', async () => {
      const { getDocs } = await import('firebase/firestore');
      
      const mockChunks = [
        { id: 'chunk1', data: () => ({ content: 'Chunk 1 content' }) },
        { id: 'chunk2', data: () => ({ content: 'Chunk 2 content' }) }
      ];

      const mockQuerySnapshot = { docs: mockChunks };
      (getDocs as vi.Mock).mockResolvedValue(mockQuerySnapshot);

      const result = await DocumentService.getDocumentChunks(mockDocumentId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 'chunk1', content: 'Chunk 1 content' });
    });
  });
});
