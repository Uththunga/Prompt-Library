import React, { useState, useEffect, useCallback } from 'react';
import type { Prompt, PromptVariable, PromptTemplate, PromptQualityScore } from '../../types';
import { Button } from '../common/Button';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { TemplateLibrary } from './TemplateLibrary';
import { PromptQualityAnalyzer } from './PromptQualityAnalyzer';
import { VariableEditor } from './VariableEditor';
import { ContentEditor } from './ContentEditor';
import { 
  Save, 
  Play, 
  Eye, 
  EyeOff, 
  BookOpen, 
  Lightbulb, 
  CheckCircle,
  AlertCircle,
  Sparkles
} from 'lucide-react';

interface EnhancedPromptEditorProps {
  prompt?: Prompt;
  onSave: (promptData: Partial<Prompt>) => Promise<void>;
  onExecute?: (promptData: Partial<Prompt>) => Promise<void>;
  loading?: boolean;
}

export const EnhancedPromptEditor: React.FC<EnhancedPromptEditorProps> = ({
  prompt,
  onSave,
  onExecute,
  loading = false
}) => {
  // Form state
  const [title, setTitle] = useState(prompt?.title || '');
  const [content, setContent] = useState(prompt?.content || '');
  const [description, setDescription] = useState(prompt?.description || '');
  const [category, setCategory] = useState(prompt?.category || '');
  const [tags, setTags] = useState<string[]>(prompt?.tags || []);
  const [isPublic, setIsPublic] = useState(prompt?.isPublic || false);
  const [variables, setVariables] = useState<PromptVariable[]>(prompt?.variables || []);

  // UI state
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [showQualityAnalyzer, setShowQualityAnalyzer] = useState(false);
  const [qualityScore, setQualityScore] = useState<PromptQualityScore | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const categories = [
    'General',
    'Content Creation',
    'Data Analysis', 
    'Customer Support',
    'Code Generation',
    'Translation',
    'Summarization',
    'Question Answering',
    'Creative Writing',
    'Business',
    'Education',
    'Research'
  ];

  // Auto-analyze quality when content changes
  useEffect(() => {
    if (content.trim()) {
      const timeoutId = setTimeout(() => {
        analyzePromptQuality();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [content, variables]);

  const analyzePromptQuality = useCallback(async () => {
    if (!content.trim()) return;

    setIsAnalyzing(true);
    try {
      // Simulate quality analysis - in real implementation, this would call an API
      const mockScore: PromptQualityScore = {
        overall: Math.floor(Math.random() * 30) + 70, // 70-100
        structure: Math.floor(Math.random() * 30) + 70,
        clarity: Math.floor(Math.random() * 30) + 70,
        variables: variables.length > 0 ? Math.floor(Math.random() * 30) + 70 : 50,
        ragCompatibility: content.includes('context') || content.includes('document') ? 85 : 60,
        suggestions: generateMockSuggestions()
      };
      
      setQualityScore(mockScore);
    } catch (error) {
      console.error('Error analyzing prompt quality:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [content, variables]);

  const generateMockSuggestions = () => {
    const suggestions = [];
    
    if (!content.includes('{{')) {
      suggestions.push({
        type: 'variable' as const,
        title: 'Add Variables',
        description: 'Consider adding variables to make your prompt more flexible',
        suggestion: 'Use {{variable_name}} syntax to add dynamic content',
        severity: 'medium' as const,
        autoFix: false
      });
    }

    if (content.length < 50) {
      suggestions.push({
        type: 'clarity' as const,
        title: 'Expand Instructions',
        description: 'Your prompt might be too brief for optimal results',
        suggestion: 'Add more specific instructions and context',
        severity: 'high' as const,
        autoFix: false
      });
    }

    if (!content.toLowerCase().includes('context') && !content.toLowerCase().includes('document')) {
      suggestions.push({
        type: 'rag' as const,
        title: 'RAG Compatibility',
        description: 'Consider adding document context support',
        suggestion: 'Add "Based on the provided context: {{context}}" to enable RAG',
        severity: 'low' as const,
        autoFix: true
      });
    }

    return suggestions;
  };

  const handleTemplateSelect = (template: PromptTemplate) => {
    setTitle(template.title);
    setContent(template.content);
    setDescription(template.description);
    setCategory(template.category.name);
    setTags(template.tags);
    setVariables(template.variables);
    setShowTemplateLibrary(false);
  };

  const handleSave = async () => {
    const promptData: Partial<Prompt> = {
      title,
      content,
      description,
      category,
      tags,
      isPublic,
      variables
    };

    await onSave(promptData);
  };

  const handleExecute = async () => {
    if (onExecute) {
      const promptData: Partial<Prompt> = {
        title,
        content,
        description,
        category,
        tags,
        isPublic,
        variables
      };

      await onExecute(promptData);
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityIcon = (score: number) => {
    if (score >= 80) return CheckCircle;
    return AlertCircle;
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header with Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => setShowTemplateLibrary(true)}
            className="flex items-center"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Template Library
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowQualityAnalyzer(!showQualityAnalyzer)}
            className="flex items-center"
          >
            <Lightbulb className="w-4 h-4 mr-2" />
            Quality Analysis
            {qualityScore && (
              <span className={`ml-2 font-semibold ${getQualityColor(qualityScore.overall)}`}>
                {qualityScore.overall}%
              </span>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center"
          >
            {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showPreview ? 'Edit' : 'Preview'}
          </Button>
        </div>

        <div className="flex items-center space-x-3">
          {onExecute && (
            <Button
              variant="outline"
              onClick={handleExecute}
              disabled={loading || !content.trim()}
              className="flex items-center"
            >
              <Play className="w-4 h-4 mr-2" />
              Test Prompt
            </Button>
          )}
          
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={loading || !title.trim() || !content.trim()}
            className="flex items-center"
          >
            {loading ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Prompt
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Basic Information
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter a descriptive title for your prompt"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Describe what this prompt does and when to use it"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Make public
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Content Editor */}
          <ContentEditor
            content={content}
            onChange={setContent}
            showPreview={showPreview}
            variables={variables}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quality Score */}
          {qualityScore && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 dark:text-white">Quality Score</h4>
                {isAnalyzing && <LoadingSpinner size="sm" />}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Overall</span>
                  <div className="flex items-center">
                    {React.createElement(getQualityIcon(qualityScore.overall), {
                      className: `w-4 h-4 mr-1 ${getQualityColor(qualityScore.overall)}`
                    })}
                    <span className={`font-semibold ${getQualityColor(qualityScore.overall)}`}>
                      {qualityScore.overall}%
                    </span>
                  </div>
                </div>
                
                {qualityScore.suggestions.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {qualityScore.suggestions.length} suggestion(s)
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowQualityAnalyzer(true)}
                      className="w-full"
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      View Suggestions
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Variable Editor */}
          <VariableEditor
            variables={variables}
            onChange={setVariables}
          />
        </div>
      </div>

      {/* Template Library Modal */}
      {showTemplateLibrary && (
        <TemplateLibrary
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplateLibrary(false)}
        />
      )}

      {/* Quality Analyzer Modal */}
      {showQualityAnalyzer && qualityScore && (
        <PromptQualityAnalyzer
          qualityScore={qualityScore}
          onClose={() => setShowQualityAnalyzer(false)}
          onApplySuggestion={(suggestion) => {
            if (suggestion.type === 'rag' && suggestion.autoFix) {
              setContent(prev => prev + '\n\nBased on the provided context: {{context}}');
            }
          }}
        />
      )}
    </div>
  );
};
