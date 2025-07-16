import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DocumentUpload } from '../components/documents/DocumentUpload';
import { DocumentList } from '../components/documents/DocumentList';
import { DocumentService } from '../services/documentService';
import type { RAGDocument } from '../types';
import { Button } from '../components/common/Button';
import { Upload, List, ArrowLeft, BarChart3, FileText } from 'lucide-react';

type ViewMode = 'list' | 'upload';

export const Documents: React.FC = () => {
  const { currentUser } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [stats, setStats] = useState<{
    total: number;
    completed: number;
    processing: number;
    failed: number;
    totalSize: number;
    totalChunks: number;
  } | null>(null);

  const loadStats = useCallback(async () => {
    if (!currentUser) return;

    try {
      const processingStats = await DocumentService.getProcessingStats(currentUser.uid);
      setStats(processingStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadStats();
    }
  }, [currentUser, refreshTrigger, loadStats]);

  const handleUploadComplete = (documentId: string) => {
    console.log('Document uploaded:', documentId);
    setRefreshTrigger(prev => prev + 1);
    setViewMode('list');
  };

  const handleDocumentSelect = (document: RAGDocument) => {
    setSelectedDocument(document);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {viewMode !== 'list' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('list')}
                className="mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {viewMode === 'list' && 'Documents'}
                {viewMode === 'upload' && 'Upload Documents'}
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {viewMode === 'list' && 'Manage your documents for RAG processing'}
                {viewMode === 'upload' && 'Upload documents to enhance your prompts with relevant context'}
              </p>
            </div>
          </div>

          {viewMode === 'list' && (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
              >
                <List className="w-4 h-4 mr-2" />
                View Documents
              </Button>
              <Button
                variant="primary"
                onClick={() => setViewMode('upload')}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Documents
              </Button>
            </div>
          )}
        </div>

        {/* Stats */}
        {viewMode === 'list' && stats && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <FileText className="w-8 h-8 text-blue-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Documents</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <BarChart3 className="w-8 h-8 text-green-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ready for Use</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.completed}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="w-8 h-8 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Processing</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.processing}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <Upload className="w-8 h-8 text-purple-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Size</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {DocumentService.formatFileSize(stats.totalSize)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {viewMode === 'list' && (
        <DocumentList
          refreshTrigger={refreshTrigger}
          onDocumentSelect={handleDocumentSelect}
        />
      )}

      {viewMode === 'upload' && (
        <DocumentUpload onUploadComplete={handleUploadComplete} />
      )}

      {/* Info Section */}
      {viewMode === 'list' && (
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">
            About RAG Documents
          </h3>
          <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <p>
              Upload documents to create a knowledge base for your prompts. Supported formats include:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>PDF files (.pdf)</li>
              <li>Text files (.txt)</li>
              <li>Word documents (.doc, .docx)</li>
              <li>Markdown files (.md)</li>
            </ul>
            <p className="mt-3">
              Once uploaded, documents are processed and split into chunks that can be retrieved 
              to provide relevant context for your AI prompts.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
