import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { DocumentService } from '../../services/documentService';
import type { RAGDocument } from '../../types';
import {
  File,
  Calendar,
  Database,
  Trash2,
  Download,
  Eye
} from 'lucide-react';
import { Button } from '../common/Button';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface DocumentListProps {
  refreshTrigger?: number;
  onDocumentSelect?: (document: RAGDocument) => void;
  selectedDocuments?: string[];
  multiSelect?: boolean;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  refreshTrigger
}) => {
  const { currentUser } = useAuth();
  const [documents, setDocuments] = useState<RAGDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter] = useState<'all' | RAGDocument['status']>('all');




  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to real-time document updates
    const unsubscribe = DocumentService.subscribeToUserDocuments(
      currentUser.uid,
      (docs) => {
        setDocuments(docs);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [currentUser, refreshTrigger]);

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.originalName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      await DocumentService.deleteDocument(documentId);
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document. Please try again.');
    }
  };



  const handleDownloadDocument = (document: RAGDocument) => {
    // TODO: Implement document download from Firebase Storage
    console.log('Downloading document:', document);
    alert('Document download will be implemented in the next phase!');
  };

  const handleViewDocument = (document: RAGDocument) => {
    // TODO: Implement document viewer
    console.log('Viewing document:', document);
    alert('Document viewer will be implemented in the next phase!');
  };



  const getStatusColor = (status: RAGDocument['status']) => {
    switch (status) {
      case 'uploaded':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search Documents
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by filename or type..."
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {filteredDocuments.length} of {documents.length} documents
      </div>

      {/* Document Cards */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <Database className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No documents found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {documents.length === 0 
              ? "Upload your first document to get started with RAG."
              : "Try adjusting your search criteria."
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((document) => (
            <div
              key={document.id}
              className="bg-white dark:bg-gray-800 shadow rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <File className="h-6 w-6 text-blue-600 mr-2" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                      {document.filename}
                    </h3>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
                    {document.status}
                  </span>
                </div>

                <div className="space-y-3">
                  {/* File info */}
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-medium">{document.type}</span>
                    <span className="mx-2">•</span>
                    <span>{formatFileSize(document.size)}</span>
                  </div>

                  {/* Upload date */}
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Calendar className="h-4 w-4 mr-1" />
                    Uploaded {document.uploadedAt instanceof Date
                      ? document.uploadedAt.toLocaleDateString()
                      : new Date(document.uploadedAt.seconds * 1000).toLocaleDateString()}
                  </div>

                  {/* Processing info */}
                  {document.processedAt && (
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <Database className="h-4 w-4 mr-1" />
                      Processed {document.processedAt instanceof Date
                        ? document.processedAt.toLocaleDateString()
                        : new Date(document.processedAt.seconds * 1000).toLocaleDateString()}
                    </div>
                  )}

                  {/* Chunks info */}
                  {document.chunks && document.chunks.length > 0 && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {document.chunks.length} chunks extracted
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDocument(document)}
                      disabled={document.status !== 'completed'}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadDocument(document)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteDocument(document.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
