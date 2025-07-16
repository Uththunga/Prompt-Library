import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { promptService } from '../services/firestore';
import type { Prompt } from '../types';
import { AIEnhancedPromptEditor } from '../components/prompts/AIEnhancedPromptEditor';
import { PromptList } from '../components/prompts/PromptList';
import { Button } from '../components/common/Button';
import { Plus, ArrowLeft, Sparkles } from 'lucide-react';

type ViewMode = 'list' | 'create' | 'edit';

export const Prompts: React.FC = () => {
  const { currentUser } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | undefined>();
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCreatePrompt = () => {
    setSelectedPrompt(undefined);
    setViewMode('create');
  };

  const handleEditPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setViewMode('edit');
  };



  const handleSavePrompt = async (promptData: Partial<Prompt>) => {
    if (!currentUser) return;

    try {
      setLoading(true);

      if (viewMode === 'create') {
        await promptService.createPrompt(currentUser.uid, promptData as Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'version'>);
      } else if (viewMode === 'edit' && selectedPrompt) {
        await promptService.updatePrompt(currentUser.uid, selectedPrompt.id, promptData);
      }

      setViewMode('list');
      setSelectedPrompt(undefined);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error saving prompt:', error);
      alert('Failed to save prompt. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteFromEditor = async (promptData: Partial<Prompt>) => {
    // TODO: Implement prompt execution from editor
    console.log('Executing prompt from editor:', promptData);
    alert('Prompt execution will be implemented in the next phase!');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedPrompt(undefined);
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
                onClick={handleBackToList}
                className="mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {viewMode === 'list' && 'Prompts'}
                {viewMode === 'create' && 'Create New Prompt'}
                {viewMode === 'edit' && 'Edit Prompt'}
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {viewMode === 'list' && 'Manage your AI prompts and templates'}
                {viewMode === 'create' && 'Create a new prompt template'}
                {viewMode === 'edit' && 'Edit your prompt template'}
              </p>
            </div>
          </div>

          {viewMode === 'list' && (
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={handleCreatePrompt}
                className="flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create from Scratch
              </Button>
              <Button
                variant="primary"
                onClick={handleCreatePrompt}
                className="flex items-center"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI-Assisted Creation
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {viewMode === 'list' && (
        <PromptList
          onEditPrompt={handleEditPrompt}
          refreshTrigger={refreshTrigger}
        />
      )}

      {(viewMode === 'create' || viewMode === 'edit') && (
        <AIEnhancedPromptEditor
          prompt={selectedPrompt}
          onSave={handleSavePrompt}
          onExecute={handleExecuteFromEditor}
          loading={loading}
        />
      )}
    </div>
  );
};
