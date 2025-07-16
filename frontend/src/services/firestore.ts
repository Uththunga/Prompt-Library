import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Prompt, PromptExecution, RAGDocument, Workspace } from '../types';

// Prompt operations
export const promptService = {
  // Create a new prompt
  async createPrompt(userId: string, promptData: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'version'>) {
    const promptsRef = collection(db, 'users', userId, 'prompts');
    const newPrompt = {
      ...promptData,
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      version: 1
    };
    
    const docRef = await addDoc(promptsRef, newPrompt);
    return docRef.id;
  },

  // Get a specific prompt
  async getPrompt(userId: string, promptId: string): Promise<Prompt | null> {
    const promptRef = doc(db, 'users', userId, 'prompts', promptId);
    const promptSnap = await getDoc(promptRef);
    
    if (promptSnap.exists()) {
      const data = promptSnap.data();
      return {
        id: promptSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as Prompt;
    }
    
    return null;
  },

  // Get all prompts for a user
  async getUserPrompts(userId: string, limitCount = 50): Promise<Prompt[]> {
    const promptsRef = collection(db, 'users', userId, 'prompts');
    const q = query(promptsRef, orderBy('updatedAt', 'desc'), limit(limitCount));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as Prompt[];
  },

  // Update a prompt
  async updatePrompt(userId: string, promptId: string, updates: Partial<Prompt>) {
    const promptRef = doc(db, 'users', userId, 'prompts', promptId);
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
      version: (updates.version || 1) + 1
    };
    
    await updateDoc(promptRef, updateData);
  },

  // Delete a prompt
  async deletePrompt(userId: string, promptId: string) {
    const promptRef = doc(db, 'users', userId, 'prompts', promptId);
    await deleteDoc(promptRef);
  },

  // Search prompts
  async searchPrompts(userId: string, searchParams: {
    category?: string;
    tags?: string[];
    isPublic?: boolean;
    limitCount?: number;
  }): Promise<Prompt[]> {
    const promptsRef = collection(db, 'users', userId, 'prompts');
    let q = query(promptsRef, orderBy('updatedAt', 'desc'));

    if (searchParams.category) {
      q = query(q, where('category', '==', searchParams.category));
    }

    if (searchParams.isPublic !== undefined) {
      q = query(q, where('isPublic', '==', searchParams.isPublic));
    }

    if (searchParams.tags && searchParams.tags.length > 0) {
      q = query(q, where('tags', 'array-contains-any', searchParams.tags));
    }

    if (searchParams.limitCount) {
      q = query(q, limit(searchParams.limitCount));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as Prompt[];
  },

  // Subscribe to real-time updates
  subscribeToPrompts(userId: string, callback: (prompts: Prompt[]) => void) {
    const promptsRef = collection(db, 'users', userId, 'prompts');
    const q = query(promptsRef, orderBy('updatedAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const prompts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as Prompt[];
      
      callback(prompts);
    });
  }
};

// Execution operations
export const executionService = {
  // Create a new execution
  async createExecution(userId: string, promptId: string, executionData: Omit<PromptExecution, 'id' | 'timestamp'>) {
    const executionsRef = collection(db, 'users', userId, 'prompts', promptId, 'executions');
    const newExecution = {
      ...executionData,
      timestamp: serverTimestamp()
    };
    
    const docRef = await addDoc(executionsRef, newExecution);
    return docRef.id;
  },

  // Get executions for a prompt
  async getPromptExecutions(userId: string, promptId: string, limitCount = 20): Promise<PromptExecution[]> {
    const executionsRef = collection(db, 'users', userId, 'prompts', promptId, 'executions');
    const q = query(executionsRef, orderBy('timestamp', 'desc'), limit(limitCount));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date()
    })) as PromptExecution[];
  },

  // Get all executions for a user
  async getUserExecutions(userId: string, limitCount = 50): Promise<PromptExecution[]> {
    // Note: This would require a collection group query in a real implementation
    // For now, we'll implement a simplified version
    const executions: PromptExecution[] = [];
    
    // Get all prompts first
    const prompts = await promptService.getUserPrompts(userId);
    
    // Get executions for each prompt (limited approach)
    for (const prompt of prompts.slice(0, 10)) { // Limit to first 10 prompts to avoid too many queries
      const promptExecutions = await this.getPromptExecutions(userId, prompt.id, 5);
      executions.push(...promptExecutions);
    }
    
    // Sort by timestamp and limit
    return executions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limitCount);
  }
};

// RAG Document operations
export const documentService = {
  // Create a new document record
  async createDocument(userId: string, documentData: Omit<RAGDocument, 'id' | 'uploadedAt'>) {
    const documentsRef = collection(db, 'rag_documents');
    const newDocument = {
      ...documentData,
      uploadedBy: userId,
      uploadedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(documentsRef, newDocument);
    return docRef.id;
  },

  // Get user's documents
  async getUserDocuments(userId: string): Promise<RAGDocument[]> {
    const documentsRef = collection(db, 'rag_documents');
    const q = query(documentsRef, where('uploadedBy', '==', userId), orderBy('uploadedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      uploadedAt: doc.data().uploadedAt?.toDate() || new Date(),
      processedAt: doc.data().processedAt?.toDate()
    })) as RAGDocument[];
  },

  // Update document status
  async updateDocumentStatus(documentId: string, status: RAGDocument['status'], error?: string) {
    const documentRef = doc(db, 'rag_documents', documentId);
    const updateData: any = {
      status,
      updatedAt: serverTimestamp()
    };
    
    if (status === 'completed') {
      updateData.processedAt = serverTimestamp();
    }
    
    if (error) {
      updateData.error = error;
    }
    
    await updateDoc(documentRef, updateData);
  }
};

// Workspace operations
export const workspaceService = {
  // Create a new workspace
  async createWorkspace(_userId: string, workspaceData: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>) {
    const workspacesRef = collection(db, 'workspaces');
    const newWorkspace = {
      ...workspaceData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(workspacesRef, newWorkspace);
    return docRef.id;
  },

  // Get user's workspaces
  async getUserWorkspaces(userId: string): Promise<Workspace[]> {
    const workspacesRef = collection(db, 'workspaces');
    const q = query(workspacesRef, where('members', 'array-contains', userId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as Workspace[];
  }
};
