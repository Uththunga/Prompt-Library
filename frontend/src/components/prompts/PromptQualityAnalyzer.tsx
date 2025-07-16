import React from 'react';
import type { PromptQualityScore, PromptSuggestion } from '../../types';
import { Button } from '../common/Button';
import { 
  X, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Lightbulb,
  Zap,
  Target,
  FileText,
  Database,
  TrendingUp,
  Wand2
} from 'lucide-react';

interface PromptQualityAnalyzerProps {
  qualityScore: PromptQualityScore;
  onClose: () => void;
  onApplySuggestion: (suggestion: PromptSuggestion) => void;
}

export const PromptQualityAnalyzer: React.FC<PromptQualityAnalyzerProps> = ({
  qualityScore,
  onClose,
  onApplySuggestion
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900';
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900';
    return 'bg-red-100 dark:bg-red-900';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return AlertCircle;
      case 'medium': return Info;
      case 'low': return Lightbulb;
      default: return Info;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-200';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'structure': return Target;
      case 'clarity': return FileText;
      case 'variable': return Zap;
      case 'rag': return Database;
      case 'performance': return TrendingUp;
      default: return Lightbulb;
    }
  };

  const scoreMetrics = [
    { 
      label: 'Structure', 
      score: qualityScore.structure, 
      icon: Target,
      description: 'How well-organized and logical your prompt is'
    },
    { 
      label: 'Clarity', 
      score: qualityScore.clarity, 
      icon: FileText,
      description: 'How clear and understandable your instructions are'
    },
    { 
      label: 'Variables', 
      score: qualityScore.variables, 
      icon: Zap,
      description: 'Effective use of variables for flexibility'
    },
    { 
      label: 'RAG Ready', 
      score: qualityScore.ragCompatibility, 
      icon: Database,
      description: 'Compatibility with document context enhancement'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <Lightbulb className="w-6 h-6 text-yellow-500 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Prompt Quality Analysis
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                AI-powered suggestions to improve your prompt
              </p>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Overall Score */}
          <div className="mb-8">
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${getScoreBackground(qualityScore.overall)} mb-4`}>
                <span className={`text-3xl font-bold ${getScoreColor(qualityScore.overall)}`}>
                  {qualityScore.overall}
                </span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Overall Quality Score
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {qualityScore.overall >= 80 && "Excellent! Your prompt is well-structured and clear."}
                {qualityScore.overall >= 60 && qualityScore.overall < 80 && "Good prompt with room for improvement."}
                {qualityScore.overall < 60 && "Your prompt could benefit from some enhancements."}
              </p>
            </div>
          </div>

          {/* Detailed Metrics */}
          <div className="mb-8">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Detailed Analysis
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scoreMetrics.map((metric) => (
                <div key={metric.label} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <metric.icon className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {metric.label}
                      </span>
                    </div>
                    <span className={`font-semibold ${getScoreColor(metric.score)}`}>
                      {metric.score}%
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        metric.score >= 80 ? 'bg-green-500' :
                        metric.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${metric.score}%` }}
                    />
                  </div>
                  
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {metric.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Suggestions */}
          {qualityScore.suggestions.length > 0 && (
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Improvement Suggestions
              </h4>
              <div className="space-y-4">
                {qualityScore.suggestions.map((suggestion, index) => {
                  const SeverityIcon = getSeverityIcon(suggestion.severity);
                  const TypeIcon = getTypeIcon(suggestion.type);
                  
                  return (
                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start">
                          <TypeIcon className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-3 mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center mb-1">
                              <h5 className="font-medium text-gray-900 dark:text-white mr-2">
                                {suggestion.title}
                              </h5>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(suggestion.severity)}`}>
                                <SeverityIcon className="w-3 h-3 mr-1" />
                                {suggestion.severity}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {suggestion.description}
                            </p>
                            <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-md p-3">
                              <p className="text-sm text-blue-800 dark:text-blue-200">
                                <strong>Suggestion:</strong> {suggestion.suggestion}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {suggestion.autoFix && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onApplySuggestion(suggestion)}
                            className="ml-4 flex items-center"
                          >
                            <Wand2 className="w-4 h-4 mr-1" />
                            Apply Fix
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Best Practices */}
          <div className="mt-8 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <h4 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              Prompt Writing Best Practices
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
              <li className="flex items-start">
                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                <span>Be specific and clear about what you want the AI to do</span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                <span>Use variables to make your prompts flexible and reusable</span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                <span>Include context or examples when helpful</span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                <span>Specify the desired output format or structure</span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                <span>Test your prompts with different inputs to ensure consistency</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Analysis powered by AI • Updated in real-time as you edit
            </p>
            <Button variant="primary" onClick={onClose}>
              Continue Editing
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
