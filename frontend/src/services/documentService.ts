/**
 * Document Service for RAG Document Management
 * Handles document operations including upload, retrieval, and status tracking
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  deleteDoc,
  updateDoc,
  serverTimestamp,

} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';

import type { RAGDocument } from '../types';

export class DocumentService {
  /**
   * Get all documents for a user
   */
  static async getUserDocuments(userId: string): Promise<RAGDocument[]> {
    try {
      const q = query(
        collection(db, 'rag_documents'),
        where('uploadedBy', '==', userId),
        orderBy('uploadedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as RAGDocument));
      
    } catch (error) {
      console.error('Error fetching user documents:', error);
      throw error;
    }
  }

  /**
   * Get a specific document by ID
   */
  static async getDocument(documentId: string): Promise<RAGDocument | null> {
    try {
      const docRef = doc(db, 'rag_documents', documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as RAGDocument;
      }
      
      return null;
      
    } catch (error) {
      console.error('Error fetching document:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time document updates
   */
  static subscribeToUserDocuments(
    userId: string, 
    callback: (documents: RAGDocument[]) => void
  ): () => void {
    const q = query(
      collection(db, 'rag_documents'),
      where('uploadedBy', '==', userId),
      orderBy('uploadedAt', 'desc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const documents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as RAGDocument));
      
      callback(documents);
    }, (error) => {
      console.error('Error in document subscription:', error);
    });
  }

  /**
   * Subscribe to a specific document's updates
   */
  static subscribeToDocument(
    documentId: string,
    callback: (document: RAGDocument | null) => void
  ): () => void {
    const docRef = doc(db, 'rag_documents', documentId);
    
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({
          id: docSnap.id,
          ...docSnap.data()
        } as RAGDocument);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Error in document subscription:', error);
    });
  }

  /**
   * Delete a document and its associated files
   */
  static async deleteDocument(documentId: string): Promise<void> {
    try {
      // Get document data first
      const document = await this.getDocument(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      // Delete file from Storage
      if (document.filePath) {
        const fileRef = ref(storage, document.filePath);
        try {
          await deleteObject(fileRef);
        } catch (storageError) {
          console.warn('File may already be deleted from storage:', storageError);
        }
      }

      // Delete document from Firestore (this will also trigger cleanup of chunks)
      await deleteDoc(doc(db, 'rag_documents', documentId));
      
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Update document status
   */
  static async updateDocumentStatus(
    documentId: string, 
    status: RAGDocument['status'],
    error?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updatedAt: serverTimestamp()
      };

      if (error) {
        updateData.error = error;
      }

      if (status === 'processing') {
        updateData.processingStartedAt = serverTimestamp();
      } else if (status === 'completed') {
        updateData.processedAt = serverTimestamp();
      }

      await updateDoc(doc(db, 'rag_documents', documentId), updateData);
      
    } catch (error) {
      console.error('Error updating document status:', error);
      throw error;
    }
  }

  /**
   * Get document chunks
   */
  static async getDocumentChunks(documentId: string): Promise<any[]> {
    try {
      const chunksRef = collection(db, 'rag_documents', documentId, 'chunks');
      const querySnapshot = await getDocs(chunksRef);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
    } catch (error) {
      console.error('Error fetching document chunks:', error);
      throw error;
    }
  }

  /**
   * Get processing statistics for user's documents
   */
  static async getProcessingStats(userId: string): Promise<{
    total: number;
    completed: number;
    processing: number;
    failed: number;
    totalSize: number;
    totalChunks: number;
  }> {
    try {
      const documents = await this.getUserDocuments(userId);
      
      const stats = documents.reduce((acc, doc) => {
        acc.total++;
        acc.totalSize += doc.size;
        
        if (doc.status === 'completed') {
          acc.completed++;
          acc.totalChunks += doc.metadata.chunk_count || 0;
        } else if (doc.status === 'processing') {
          acc.processing++;
        } else if (doc.status === 'failed') {
          acc.failed++;
        }
        
        return acc;
      }, {
        total: 0,
        completed: 0,
        processing: 0,
        failed: 0,
        totalSize: 0,
        totalChunks: 0
      });
      
      return stats;
      
    } catch (error) {
      console.error('Error calculating processing stats:', error);
      throw error;
    }
  }

  /**
   * Search documents by filename
   */
  static async searchDocuments(userId: string, searchTerm: string): Promise<RAGDocument[]> {
    try {
      const documents = await this.getUserDocuments(userId);
      
      return documents.filter(doc => 
        doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.originalName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
    } catch (error) {
      console.error('Error searching documents:', error);
      throw error;
    }
  }

  /**
   * Get documents by status
   */
  static async getDocumentsByStatus(
    userId: string, 
    status: RAGDocument['status']
  ): Promise<RAGDocument[]> {
    try {
      const q = query(
        collection(db, 'rag_documents'),
        where('uploadedBy', '==', userId),
        where('status', '==', status),
        orderBy('uploadedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as RAGDocument));
      
    } catch (error) {
      console.error('Error fetching documents by status:', error);
      throw error;
    }
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file type icon
   */
  static getFileTypeIcon(contentType: string): string {
    if (contentType.includes('pdf')) return '📄';
    if (contentType.includes('word') || contentType.includes('document')) return '📝';
    if (contentType.includes('text')) return '📃';
    if (contentType.includes('markdown')) return '📋';
    return '📄';
  }
}
