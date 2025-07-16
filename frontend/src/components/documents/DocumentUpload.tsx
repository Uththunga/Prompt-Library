import React, { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { useSuccessToast, useErrorToast } from '../common/Toast';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '../../config/firebase';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  documentId?: string;
}

interface DocumentUploadProps {
  onUploadComplete?: (documentId: string) => void;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({ onUploadComplete }) => {
  const { currentUser } = useAuth();
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const successToast = useSuccessToast();
  const errorToast = useErrorToast();

  const acceptedTypes = [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/markdown'
  ];

  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const handleFileSelect = (files: FileList | null) => {
    if (!files || !currentUser) return;

    const newFiles: UploadFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      if (!acceptedTypes.includes(file.type)) {
        alert(`File type ${file.type} is not supported. Please upload PDF, TXT, DOC, DOCX, or MD files.`);
        continue;
      }
      
      // Validate file size
      if (file.size > maxFileSize) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        continue;
      }
      
      newFiles.push({
        file,
        id: `${Date.now()}-${i}`,
        status: 'pending',
        progress: 0
      });
    }
    
    setUploadFiles(prev => [...prev, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id));
  };

  const uploadFile = async (uploadFile: UploadFile) => {
    if (!currentUser) return;

    try {
      // Update status to uploading
      setUploadFiles(prev => prev.map(f =>
        f.id === uploadFile.id ? { ...f, status: 'uploading' as const } : f
      ));

      // Create unique file path
      const timestamp = Date.now();
      const fileName = `${timestamp}_${uploadFile.file.name}`;
      const filePath = `documents/${currentUser.uid}/${fileName}`;

      // Create storage reference
      const storageRef = ref(storage, filePath);

      // Start upload with progress tracking
      const uploadTask = uploadBytesResumable(storageRef, uploadFile.file);

      // Track upload progress
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadFiles(prev => prev.map(f =>
            f.id === uploadFile.id ? { ...f, progress: Math.round(progress) } : f
          ));
        },
        (error) => {
          console.error('Upload error:', error);
          setUploadFiles(prev => prev.map(f =>
            f.id === uploadFile.id ? {
              ...f,
              status: 'error' as const,
              error: error.message || 'Upload failed'
            } : f
          ));

          // Show error toast
          errorToast(
            'Upload failed',
            `Failed to upload ${uploadFile.file.name}: ${error.message || 'Unknown error'}`
          );
        },
        async () => {
          try {
            // Upload completed successfully
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            // Update status to processing
            setUploadFiles(prev => prev.map(f =>
              f.id === uploadFile.id ? { ...f, status: 'processing' as const } : f
            ));

            // Create document metadata in Firestore
            const docRef = await addDoc(collection(db, 'rag_documents'), {
              filename: uploadFile.file.name,
              originalName: uploadFile.file.name,
              filePath: filePath,
              downloadURL: downloadURL,
              uploadedBy: currentUser.uid,
              uploadedAt: serverTimestamp(),
              size: uploadFile.file.size,
              type: uploadFile.file.type,
              status: 'uploaded',
              processingStartedAt: null,
              processedAt: null,
              chunks: [],
              metadata: {
                originalSize: uploadFile.file.size,
                contentType: uploadFile.file.type
              }
            });

            // Mark as completed (processing will be handled by Cloud Function trigger)
            setUploadFiles(prev => prev.map(f =>
              f.id === uploadFile.id ? {
                ...f,
                status: 'completed' as const,
                documentId: docRef.id
              } : f
            ));

            // Show success toast
            successToast(
              'Document uploaded successfully!',
              `${uploadFile.file.name} is now being processed for RAG.`
            );

            if (onUploadComplete) {
              onUploadComplete(docRef.id);
            }

          } catch (firestoreError) {
            console.error('Firestore error:', firestoreError);
            setUploadFiles(prev => prev.map(f =>
              f.id === uploadFile.id ? {
                ...f,
                status: 'error' as const,
                error: 'Failed to save document metadata'
              } : f
            ));
          }
        }
      );

    } catch (error) {
      console.error('Upload initialization error:', error);
      setUploadFiles(prev => prev.map(f =>
        f.id === uploadFile.id ? {
          ...f,
          status: 'error' as const,
          error: error instanceof Error ? error.message : 'Upload failed'
        } : f
      ));
    }
  };

  const uploadAllFiles = async () => {
    const pendingFiles = uploadFiles.filter(f => f.status === 'pending');
    
    for (const file of pendingFiles) {
      await uploadFile(file);
    }
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending':
        return <File className="w-5 h-5 text-gray-400" />;
      case 'uploading':
      case 'processing':
        return <LoadingSpinner size="sm" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusText = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending':
        return 'Ready to upload';
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Processing...';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Upload Documents
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Drag and drop files here, or click to select files
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Supported formats: PDF, TXT, DOC, DOCX, MD (max 10MB each)
        </p>
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          Select Files
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.doc,.docx,.md"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
      </div>

      {/* File List */}
      {uploadFiles.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Files ({uploadFiles.length})
              </h3>
              {uploadFiles.some(f => f.status === 'pending') && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={uploadAllFiles}
                >
                  Upload All
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {uploadFiles.map((fileItem) => (
                <div
                  key={fileItem.id}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-md"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    {getStatusIcon(fileItem.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {fileItem.file.name}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{(fileItem.file.size / 1024 / 1024).toFixed(2)} MB</span>
                        <span>•</span>
                        <span>{getStatusText(fileItem.status)}</span>
                        {fileItem.error && (
                          <>
                            <span>•</span>
                            <span className="text-red-500">{fileItem.error}</span>
                          </>
                        )}
                      </div>
                      {fileItem.status === 'uploading' && (
                        <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${fileItem.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {fileItem.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => uploadFile(fileItem)}
                      >
                        Upload
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(fileItem.id)}
                      disabled={fileItem.status === 'uploading' || fileItem.status === 'processing'}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
