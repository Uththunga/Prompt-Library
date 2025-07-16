import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Firebase
vi.mock('../config/firebase', () => ({
  auth: {},
  db: {},
  storage: {},
  functions: {},
}))

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_FIREBASE_API_KEY: 'test-api-key',
    VITE_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
    VITE_FIREBASE_PROJECT_ID: 'test-project',
    VITE_FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
    VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
    VITE_FIREBASE_APP_ID: 'test-app-id',
  },
  writable: true,
})

// Global test utilities
export const createMockUser = (overrides = {}) => ({
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
  ...overrides
});

export const createMockDocument = (overrides = {}) => ({
  id: 'test-doc-id',
  filename: 'test.pdf',
  originalName: 'test.pdf',
  filePath: 'documents/test-user/test.pdf',
  downloadURL: 'https://example.com/test.pdf',
  uploadedBy: 'test-user-id',
  uploadedAt: { seconds: Date.now() / 1000, toDate: () => new Date() },
  size: 1024,
  type: 'application/pdf',
  status: 'completed' as const,
  chunks: [],
  metadata: {
    originalSize: 1024,
    contentType: 'application/pdf'
  },
  ...overrides
});

export const createMockPrompt = (overrides = {}) => ({
  id: 'test-prompt-id',
  title: 'Test Prompt',
  content: 'This is a test prompt',
  variables: [],
  tags: ['test'],
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 'test-user-id',
  ...overrides
});
