import React, { useState } from 'react';
import { Save, Play, Eye, EyeOff, Plus, X } from 'lucide-react';
import { Button } from '../common/Button';
import type { Prompt, PromptVariable } from '../../types';

interface PromptEditorProps {
  prompt?: Prompt;
  onSave: (promptData: Partial<Prompt>) => Promise<void>;
  onExecute?: (promptData: Partial<Prompt>) => Promise<void>;
  loading?: boolean;
}

export const PromptEditor: React.FC<PromptEditorProps> = ({
  prompt,
  onSave,
  onExecute,
  loading = false
}) => {
  const [title, setTitle] = useState(prompt?.title || '');
  const [content, setContent] = useState(prompt?.content || '');
  const [description, setDescription] = useState(prompt?.description || '');
  const [category, setCategory] = useState(prompt?.category || '');
  const [tags, setTags] = useState<string[]>(prompt?.tags || []);
  const [isPublic, setIsPublic] = useState(prompt?.isPublic || false);
  const [variables, setVariables] = useState<PromptVariable[]>(prompt?.variables || []);
  const [newTag, setNewTag] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const categories = [
    'General',
    'Customer Support',
    'Content Creation',
    'Data Analysis',
    'Code Generation',
    'Translation',
    'Summarization',
    'Question Answering'
  ];

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleAddVariable = () => {
    const newVariable: PromptVariable = {
      name: '',
      type: 'string',
      description: '',
      required: false
    };
    setVariables([...variables, newVariable]);
  };

  const handleUpdateVariable = (index: number, updates: Partial<PromptVariable>) => {
    const updatedVariables = variables.map((variable, i) =>
      i === index ? { ...variable, ...updates } : variable
    );
    setVariables(updatedVariables);
  };

  const handleRemoveVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
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

  const renderPreview = () => {
    let previewContent = content;
    
    // Replace variables with placeholder values
    variables.forEach(variable => {
      const placeholder = `{{${variable.name}}}`;
      const replacement = `[${variable.name}: ${variable.type}]`;
      previewContent = previewContent.replace(new RegExp(placeholder, 'g'), replacement);
    });

    return previewContent;
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              {prompt ? 'Edit Prompt' : 'Create New Prompt'}
            </h3>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
              {onExecute && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExecute}
                  loading={loading}
                >
                  <Play className="w-4 h-4 mr-1" />
                  Execute
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                loading={loading}
              >
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Title *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter prompt title"
                required
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Describe what this prompt does"
            />
          </div>

          {/* Content */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Prompt Content *
            </label>
            <div className="mt-1">
              {showPreview ? (
                <div className="min-h-[200px] p-3 border border-gray-300 rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                  <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-white">
                    {renderPreview()}
                  </pre>
                </div>
              ) : (
                <textarea
                  id="content"
                  rows={10}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono"
                  placeholder="Enter your prompt content here. Use {{variable_name}} for variables."
                  required
                />
              )}
            </div>
          </div>

          {/* Variables */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Variables
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddVariable}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Variable
              </Button>
            </div>
            
            {variables.length > 0 && (
              <div className="space-y-3">
                {variables.map((variable, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-md">
                    <input
                      type="text"
                      value={variable.name}
                      onChange={(e) => handleUpdateVariable(index, { name: e.target.value })}
                      placeholder="Variable name"
                      className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <select
                      value={variable.type}
                      onChange={(e) => handleUpdateVariable(index, { type: e.target.value as any })}
                      className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                      <option value="array">Array</option>
                    </select>
                    <input
                      type="text"
                      value={variable.description}
                      onChange={(e) => handleUpdateVariable(index, { description: e.target.value })}
                      placeholder="Description"
                      className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={variable.required}
                        onChange={(e) => handleUpdateVariable(index, { required: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Required</span>
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveVariable(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Add a tag"
                className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddTag}
              >
                Add
              </Button>
            </div>
          </div>

          {/* Settings */}
          <div className="flex items-center">
            <input
              id="isPublic"
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900 dark:text-white">
              Make this prompt public
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
