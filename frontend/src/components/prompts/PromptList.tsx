import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { promptService } from '../../services/firestore';
import type { Prompt } from '../../types';
import { FileText, Edit, Trash2, Play, Calendar, Tag } from 'lucide-react';
import { Button } from '../common/Button';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface PromptListProps {
  onEditPrompt: (prompt: Prompt) => void;
  refreshTrigger?: number;
}

export const PromptList: React.FC<PromptListProps> = ({
  onEditPrompt,
  refreshTrigger
}) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

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

  const loadPrompts = useCallback(async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const userPrompts = await promptService.getUserPrompts(currentUser.uid);
      setPrompts(userPrompts);
    } catch (error) {
      console.error('Error loading prompts:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadPrompts();
    }
  }, [currentUser, refreshTrigger, loadPrompts]);

  const handleDeletePrompt = async (promptId: string) => {
    if (!currentUser) return;

    if (window.confirm('Are you sure you want to delete this prompt?')) {
      try {
        await promptService.deletePrompt(currentUser.uid, promptId);
        setPrompts(prompts.filter(p => p.id !== promptId));
      } catch (error) {
        console.error('Error deleting prompt:', error);
      }
    }
  };

  const filteredPrompts = prompts.filter(prompt => {
    const matchesSearch = prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prompt.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prompt.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || prompt.category === selectedCategory;
    
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.some(tag => prompt.tags.includes(tag));

    return matchesSearch && matchesCategory && matchesTags;
  });

  const allTags = Array.from(new Set(prompts.flatMap(p => p.tags)));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search prompts..."
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              id="category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Tag Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tags
            </label>
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    if (selectedTags.includes(tag)) {
                      setSelectedTags(selectedTags.filter(t => t !== tag));
                    } else {
                      setSelectedTags([...selectedTags, tag]);
                    }
                  }}
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {filteredPrompts.length} of {prompts.length} prompts
      </div>

      {/* Prompt Cards */}
      {filteredPrompts.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No prompts found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {prompts.length === 0 
              ? "Get started by creating your first prompt."
              : "Try adjusting your search criteria."
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPrompts.map((prompt) => (
            <div
              key={prompt.id}
              className="bg-white dark:bg-gray-800 shadow rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <FileText className="h-6 w-6 text-blue-600 mr-2" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                      {prompt.title}
                    </h3>
                  </div>
                  {prompt.isPublic && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Public
                    </span>
                  )}
                </div>

                {prompt.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {prompt.description}
                  </p>
                )}

                <div className="space-y-3">
                  {/* Category */}
                  {prompt.category && (
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <Tag className="h-4 w-4 mr-1" />
                      {prompt.category}
                    </div>
                  )}

                  {/* Tags */}
                  {prompt.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {prompt.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                        >
                          {tag}
                        </span>
                      ))}
                      {prompt.tags.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          +{prompt.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Updated date */}
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Calendar className="h-4 w-4 mr-1" />
                    Updated {prompt.updatedAt.toLocaleDateString()}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/prompts/${prompt.id}/execute`)}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Execute
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditPrompt(prompt)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeletePrompt(prompt.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
