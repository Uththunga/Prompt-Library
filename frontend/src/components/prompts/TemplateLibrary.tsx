import React, { useState, useEffect } from 'react';
import type { PromptTemplate, TemplateCategory } from '../../types';
import { templateService } from '../../services/templateService';
import { Button } from '../common/Button';
import { LoadingSpinner } from '../common/LoadingSpinner';
import {
  X,
  Search,
  Star,
  Users,
  BookOpen,
  Code,
  MessageSquare,
  BarChart,
  Briefcase,
  GraduationCap,
  Sparkles
} from 'lucide-react';

interface TemplateLibraryProps {
  onSelect: (template: PromptTemplate) => void;
  onClose: () => void;
}

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  onSelect,
  onClose
}) => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [sortBy, setSortBy] = useState<'rating' | 'usage' | 'recent'>('rating');

  useEffect(() => {
    loadTemplates();
  }, [searchTerm, selectedCategory, selectedDifficulty, sortBy]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const [templatesData, categoriesData] = await Promise.all([
        templateService.getTemplates({
          category: selectedCategory,
          difficulty: selectedDifficulty,
          searchTerm: searchTerm,
          sortBy: sortBy
        }),
        templateService.getCategories()
      ]);

      setCategories(categoriesData);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Templates are already filtered and sorted by the service
  const sortedTemplates = templates;

  const handleTemplateSelect = async (template: PromptTemplate) => {
    try {
      await templateService.incrementUsage(template.id);
      onSelect(template);
    } catch (error) {
      console.error('Error selecting template:', error);
      onSelect(template); // Still proceed with selection
    }
  };

  const getCategoryIcon = (iconName: string) => {
    const icons = {
      BookOpen, BarChart, MessageSquare, Code, Briefcase, GraduationCap
    };
    return icons[iconName as keyof typeof icons] || BookOpen;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <BookOpen className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Template Library
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose from {templates.length} curated prompt templates
              </p>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'rating' | 'usage' | 'recent')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="rating">Highest Rated</option>
              <option value="usage">Most Used</option>
              <option value="recent">Recently Updated</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : sortedTemplates.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No templates found matching your criteria
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedTemplates.map((template) => {
                const CategoryIcon = getCategoryIcon(template.category.icon);
                
                return (
                  <div
                    key={template.id}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        <CategoryIcon className="w-5 h-5 text-blue-600 mr-2" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {template.category.name}
                        </span>
                      </div>
                      {template.isOfficial && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Official
                        </span>
                      )}
                    </div>

                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      {template.title}
                    </h3>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {template.description}
                    </p>

                    <div className="flex items-center justify-between mb-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(template.difficulty)}`}>
                        {template.difficulty}
                      </span>
                      
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <Star className="w-3 h-3 mr-1 text-yellow-500" />
                        {template.rating}
                        <Users className="w-3 h-3 ml-2 mr-1" />
                        {template.usageCount}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {template.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300"
                        >
                          {tag}
                        </span>
                      ))}
                      {template.tags.length > 3 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          +{template.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
