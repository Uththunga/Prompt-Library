import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { promptService } from '../services/firestore';
import type { Prompt, PromptExecution } from '../types';
import { PromptExecutor } from '../components/execution/PromptExecutor';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ArrowLeft } from 'lucide-react';

export const ExecutePrompt: React.FC = () => {
  const { promptId } = useParams<{ promptId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPrompt = useCallback(async () => {
    if (!currentUser || !promptId) return;

    try {
      setLoading(true);
      const promptData = await promptService.getPrompt(currentUser.uid, promptId);

      if (promptData) {
        setPrompt(promptData);
      } else {
        setError('Prompt not found');
      }
    } catch (error) {
      console.error('Error loading prompt:', error);
      setError('Failed to load prompt');
    } finally {
      setLoading(false);
    }
  }, [currentUser, promptId]);

  useEffect(() => {
    if (currentUser && promptId) {
      loadPrompt();
    }
  }, [currentUser, promptId, loadPrompt]);

  const handleExecutionComplete = (execution: PromptExecution) => {
    console.log('Execution completed:', execution);
    // Could navigate to execution details or show success message
  };

  const handleBack = () => {
    navigate('/prompts');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !prompt) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {error || 'Prompt not found'}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          The prompt you're looking for doesn't exist or you don't have permission to access it.
        </p>
        <Button variant="primary" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Prompts
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Execute Prompt
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Configure and execute your prompt with AI models
            </p>
          </div>
        </div>
      </div>

      {/* Executor */}
      <PromptExecutor 
        prompt={prompt} 
        onExecutionComplete={handleExecutionComplete}
      />
    </div>
  );
};
