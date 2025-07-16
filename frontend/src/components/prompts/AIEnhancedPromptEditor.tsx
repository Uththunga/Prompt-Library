import React, { useState, useEffect } from 'react';
import type { 
  Prompt, 
  PromptVariable, 
  PromptGenerationRequest, 
  PromptGenerationResponse,
  PromptEnhancementSuggestion 
} from '../../types';
import { Button } from '../common/Button';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { PromptGenerationWizard } from './PromptGenerationWizard';
import { EnhancedPromptEditor } from './EnhancedPromptEditor';
import { promptGenerationService } from '../../services/promptGenerationService';
import { 
  Sparkles, 
  Wand2, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Lightbulb,
  ArrowLeft,
  Save,
  Play
} from 'lucide-react';

interface AIEnhancedPromptEditorProps {
  prompt?: Prompt;
  onSave: (promptData: Partial<Prompt>) => Promise<void>;
  onExecute?: (promptData: Partial<Prompt>) => Promise<void>;
  loading?: boolean;
}

type EditorMode = 'create' | 'wizard' | 'edit' | 'enhance';

export const AIEnhancedPromptEditor: React.FC<AIEnhancedPromptEditorProps> = ({
  prompt,
  onSave,
  onExecute,
  loading = false
}) => {
  const [mode, setMode] = useState<EditorMode>(prompt ? 'edit' : 'create');
  const [generatedData, setGeneratedData] = useState<PromptGenerationResponse | null>(null);
  const [generating, setGenerating] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [suggestions, setSuggestions] = useState<PromptEnhancementSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Current prompt data
  const [promptData, setPromptData] = useState<Partial<Prompt>>({
    title: prompt?.title || '',
    content: prompt?.content || '',
    description: prompt?.description || '',
    category: prompt?.category || '',
    tags: prompt?.tags || [],
    variables: prompt?.variables || [],
    isPublic: prompt?.isPublic || false
  });

  const handleAIGeneration = async (request: PromptGenerationRequest) => {
    setGenerating(true);
    try {
      const response = await promptGenerationService.generatePrompt(request);
      setGeneratedData(response);
      
      // Update prompt data with generated content
      setPromptData({
        title: response.title,
        content: response.generatedPrompt,
        description: response.description,
        category: response.category,
        tags: response.tags,
        variables: response.variables,
        isPublic: false
      });

      setSuggestions(response.suggestions);
      setMode('edit');
    } catch (error: any) {
      console.error('Error generating prompt:', error);
      alert(error.message || 'Failed to generate prompt. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!promptData.content) return;

    setEnhancing(true);
    try {
      const enhancementSuggestions = await promptGenerationService.enhancePrompt(
        promptData.content,
        {
          purpose: promptData.description || 'Enhance prompt',
          industry: promptData.category || 'General',
          useCase: 'Enhancement',
          inputVariables: promptData.variables?.map(v => ({
            name: v.name,
            description: v.description,
            type: v.type,
            required: v.required
          })) || []
        }
      );

      setSuggestions(enhancementSuggestions);
      setShowSuggestions(true);
    } catch (error: any) {
      console.error('Error enhancing prompt:', error);
      alert(error.message || 'Failed to enhance prompt. Please try again.');
    } finally {
      setEnhancing(false);
    }
  };

  const applySuggestion = (suggestion: PromptEnhancementSuggestion) => {
    if (suggestion.autoApplicable && suggestion.suggestedText) {
      setPromptData(prev => ({
        ...prev,
        content: suggestion.originalText 
          ? prev.content?.replace(suggestion.originalText, suggestion.suggestedText!)
          : prev.content + '\n\n' + suggestion.suggestedText
      }));
    }
  };

  const handleSave = async () => {
    await onSave(promptData);
  };

  const handleExecute = async () => {
    if (onExecute) {
      await onExecute(promptData);
    }
  };

  const renderModeSelector = () => {
    if (prompt) return null; // Don't show mode selector when editing existing prompt

    return (
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          How would you like to create your prompt?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setMode('wizard')}
            className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors group"
          >
            <div className="text-center">
              <Sparkles className="w-12 h-12 text-blue-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                AI-Assisted Creation
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Let AI help you create an optimized prompt based on your requirements
              </p>
            </div>
          </button>

          <button
            onClick={() => setMode('edit')}
            className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors group"
          >
            <div className="text-center">
              <Wand2 className="w-12 h-12 text-gray-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Create from Scratch
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Start with a blank prompt and build it yourself
              </p>
            </div>
          </button>
        </div>
      </div>
    );
  };

  const renderGenerationResult = () => {
    if (!generatedData) return null;

    return (
      <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-start">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-green-900 dark:text-green-100">
              Prompt Generated Successfully!
            </h4>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              Quality Score: {generatedData.qualityScore.overall}% | 
              Tokens Used: {generatedData.metadata.tokensUsed} | 
              Generation Time: {generatedData.metadata.generationTime.toFixed(2)}s
            </p>
            {generatedData.suggestions.length > 0 && (
              <button
                onClick={() => setShowSuggestions(true)}
                className="mt-2 text-sm text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200 underline"
              >
                View {generatedData.suggestions.length} improvement suggestions
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSuggestions = () => {
    if (!showSuggestions || suggestions.length === 0) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Enhancement Suggestions
            </h3>
            <Button variant="ghost" onClick={() => setShowSuggestions(false)}>
              ×
            </Button>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-96">
            <div className="space-y-4">
              {suggestions.map((suggestion, index) => (
                <div key={suggestion.id || index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <Lightbulb className="w-4 h-4 text-yellow-500 mr-2" />
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          {suggestion.title}
                        </h4>
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                          suggestion.impact === 'high' 
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            : suggestion.impact === 'medium'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        }`}>
                          {suggestion.impact} impact
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {suggestion.description}
                      </p>
                      {suggestion.suggestedText && (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 text-sm">
                          <strong>Suggested:</strong> {suggestion.suggestedText}
                        </div>
                      )}
                    </div>
                    {suggestion.autoApplicable && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applySuggestion(suggestion)}
                        className="ml-4"
                      >
                        Apply
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (mode === 'wizard') {
    return (
      <PromptGenerationWizard
        onGenerate={handleAIGeneration}
        onCancel={() => setMode('create')}
        loading={generating}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          {mode === 'edit' && !prompt && (
            <Button
              variant="ghost"
              onClick={() => setMode('create')}
              className="flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Options
            </Button>
          )}
          
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {prompt ? 'Edit Prompt' : 'Create New Prompt'}
          </h2>
        </div>

        <div className="flex items-center space-x-3">
          {mode === 'edit' && promptData.content && (
            <Button
              variant="outline"
              onClick={handleEnhancePrompt}
              disabled={enhancing}
              className="flex items-center"
            >
              {enhancing ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {enhancing ? 'Enhancing...' : 'AI Enhance'}
            </Button>
          )}

          {onExecute && (
            <Button
              variant="outline"
              onClick={handleExecute}
              disabled={loading || !promptData.content}
              className="flex items-center"
            >
              <Play className="w-4 h-4 mr-2" />
              Test
            </Button>
          )}

          <Button
            variant="primary"
            onClick={handleSave}
            disabled={loading || !promptData.title || !promptData.content}
            className="flex items-center"
          >
            {loading ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Mode Selector */}
      {renderModeSelector()}

      {/* Generation Result */}
      {renderGenerationResult()}

      {/* Enhanced Prompt Editor */}
      {mode === 'edit' && (
        <EnhancedPromptEditor
          prompt={{
            ...prompt,
            ...promptData,
            id: prompt?.id || '',
            createdAt: prompt?.createdAt || new Date(),
            updatedAt: prompt?.updatedAt || new Date(),
            createdBy: prompt?.createdBy || '',
            version: prompt?.version || 1
          } as Prompt}
          onSave={onSave}
          onExecute={onExecute}
          loading={loading}
        />
      )}

      {/* Suggestions Modal */}
      {renderSuggestions()}
    </div>
  );
};
