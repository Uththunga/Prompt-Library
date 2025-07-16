// User types
export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
  settings: UserSettings;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'auto';
  defaultModel: string;
  autoSave: boolean;
  notifications: boolean;
}

// Prompt types
export interface Prompt {
  id: string;
  title: string;
  content: string;
  description?: string;
  tags: string[];
  category: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  version: number;
  variables: PromptVariable[];
}

export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  description: string;
  required: boolean;
  defaultValue?: string | number | boolean;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    options?: string[];
  };
}

// Template types for the enhanced prompt library
export interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  content: string;
  category: TemplateCategory;
  tags: string[];
  variables: PromptVariable[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  useCase: string[];
  industry: string[];
  rating: number;
  usageCount: number;
  author: string;
  isOfficial: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface PromptSuggestion {
  type: 'structure' | 'clarity' | 'variable' | 'rag' | 'performance';
  title: string;
  description: string;
  suggestion: string;
  severity: 'low' | 'medium' | 'high';
  autoFix?: boolean;
}

export interface PromptQualityScore {
  overall: number;
  structure: number;
  clarity: number;
  variables: number;
  ragCompatibility: number;
  suggestions: PromptSuggestion[];
}

export interface PromptExecution {
  id: string;
  promptId: string;
  inputs: Record<string, string | number | boolean>;
  outputs: {
    content: string;
    metadata: {
      model: string;
      tokensUsed: number;
      executionTime: number;
      cost: number;
      promptTokens?: number;
      completionTokens?: number;
      finishReason?: string;
    };
  };
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
  error?: string;
  context?: string;
  ragMetadata?: {
    query?: string;
    total_chunks_found?: number;
    chunks_used?: number;
    context_length?: number;
    similarity_scores?: number[];
    document_sources?: string[];
  };
}

// RAG types
export interface RAGDocument {
  id: string;
  filename: string;
  originalName: string;
  filePath: string;
  downloadURL: string;
  uploadedBy: string;
  uploadedAt: { seconds: number; toDate: () => Date } | Date;
  size: number;
  type: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  processingStartedAt?: { seconds: number; toDate: () => Date } | Date;
  processedAt?: { seconds: number; toDate: () => Date } | Date;
  chunks: string[];
  metadata: {
    originalSize: number;
    contentType: string;
    chunk_count?: number;
    character_count?: number;
    word_count?: number;
    page_count?: number;
    extraction_method?: string;
    embedding_stats?: {
      total_chunks: number;
      chunks_with_embeddings: number;
      chunks_with_errors: number;
      success_rate: number;
      embedding_model: string;
    };
  };
  error?: string;
}

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    page?: number;
    section?: string;
    startIndex: number;
    endIndex: number;
  };
  embedding?: number[];
}

// Workspace types
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  members: WorkspaceMember[];
  settings: WorkspaceSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: Date;
}

export interface WorkspaceSettings {
  isPublic: boolean;
  allowInvites: boolean;
  defaultPermissions: 'read' | 'write' | 'admin';
}
