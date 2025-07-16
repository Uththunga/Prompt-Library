import React, { useState, useEffect, useMemo } from 'react';
import type { PromptVariable, PromptSuggestion } from '../../types';
import { Button } from '../common/Button';
import { 
  Lightbulb, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Target,
  FileText,
  Settings,
  Database,
  TrendingUp,
  Wand2,
  X
} from 'lucide-react';

interface PromptQualityAssistantProps {
  content: string;
  variables: PromptVariable[];
  category?: string;
  onApplySuggestion?: (suggestion: PromptSuggestion) => void;
  className?: string;
}

interface QualityMetrics {
  clarity: number;
  structure: number;
  variables: number;
  ragCompatibility: number;
  industryOptimization: number;
  overall: number;
}

export const PromptQualityAssistant: React.FC<PromptQualityAssistantProps> = ({
  content,
  variables,
  category = 'General',
  onApplySuggestion,
  className = ''
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Calculate quality metrics
  const qualityMetrics = useMemo((): QualityMetrics => {
    if (!content.trim()) {
      return {
        clarity: 0,
        structure: 0,
        variables: 0,
        ragCompatibility: 0,
        industryOptimization: 0,
        overall: 0
      };
    }

    // Clarity analysis
    const wordCount = content.split(/\s+/).length;
    const sentenceCount = content.split(/[.!?]+/).filter(s => s.trim()).length;
    const avgWordsPerSentence = wordCount / Math.max(sentenceCount, 1);
    const hasInstructions = /\b(please|you are|your task|analyze|generate|create|write)\b/i.test(content);
    const hasContext = /\b(context|background|information|data)\b/i.test(content);
    
    let clarity = 50;
    if (wordCount >= 10) clarity += 15;
    if (avgWordsPerSentence < 25) clarity += 15; // Not too complex
    if (hasInstructions) clarity += 10;
    if (hasContext) clarity += 10;

    // Structure analysis
    const hasMultipleLines = content.includes('\n');
    const hasSections = /\d+\.|•|-|\*/.test(content);
    const hasHeaders = /^#+\s/m.test(content) || /^[A-Z][^a-z]*:/.test(content);
    const hasExamples = /\b(example|for instance|such as)\b/i.test(content);
    
    let structure = 60;
    if (hasMultipleLines) structure += 10;
    if (hasSections) structure += 15;
    if (hasHeaders) structure += 10;
    if (hasExamples) structure += 5;

    // Variables analysis
    const variableMatches = content.match(/\{\{[^}]+\}\}/g) || [];
    const uniqueVariables = new Set(variableMatches);
    const definedVariableNames = variables.map(v => `{{${v.name}}}`);
    const usedDefinedVariables = definedVariableNames.filter(name => content.includes(name));
    
    let variableScore = 50;
    if (variables.length > 0) {
      variableScore = 70;
      const usageRatio = usedDefinedVariables.length / variables.length;
      variableScore += usageRatio * 20;
      if (usageRatio === 1) variableScore += 10; // All variables used
    }
    if (uniqueVariables.size > 0 && variables.length === 0) {
      variableScore = 30; // Variables used but not defined
    }

    // RAG compatibility
    const hasContextVariable = content.includes('{{context}}') || content.includes('{{document}}');
    const hasContextInstructions = /\b(based on|using the|from the document|context provided)\b/i.test(content);
    const hasDocumentReferences = /\b(document|source|reference|citation)\b/i.test(content);
    
    let ragScore = 40;
    if (hasContextVariable) ragScore += 30;
    if (hasContextInstructions) ragScore += 20;
    if (hasDocumentReferences) ragScore += 10;

    // Industry optimization
    const industryKeywords = getIndustryKeywords(category);
    const hasIndustryTerms = industryKeywords.some(keyword => 
      content.toLowerCase().includes(keyword.toLowerCase())
    );
    const hasProfessionalTone = /\b(please|kindly|ensure|verify|confirm)\b/i.test(content);
    const hasSpecificInstructions = content.length > 100;
    
    let industryScore = 60;
    if (hasIndustryTerms) industryScore += 20;
    if (hasProfessionalTone) industryScore += 10;
    if (hasSpecificInstructions) industryScore += 10;

    const overall = Math.round((clarity + structure + variableScore + ragScore + industryScore) / 5);

    return {
      clarity: Math.min(clarity, 100),
      structure: Math.min(structure, 100),
      variables: Math.min(variableScore, 100),
      ragCompatibility: Math.min(ragScore, 100),
      industryOptimization: Math.min(industryScore, 100),
      overall: Math.min(overall, 100)
    };
  }, [content, variables, category]);

  // Generate suggestions based on quality metrics
  const suggestions = useMemo((): PromptSuggestion[] => {
    const suggestions: PromptSuggestion[] = [];

    if (qualityMetrics.clarity < 70) {
      suggestions.push({
        type: 'clarity',
        title: 'Improve Clarity',
        description: 'Add more specific instructions or examples to make your prompt clearer',
        suggestion: 'Consider adding: "Please provide a detailed response that includes..." or specific examples',
        severity: 'medium',
        autoFix: false
      });
    }

    if (qualityMetrics.structure < 70) {
      suggestions.push({
        type: 'structure',
        title: 'Enhance Structure',
        description: 'Organize your prompt with clear sections or numbered steps',
        suggestion: 'Break down your prompt into numbered steps or use bullet points for better organization',
        severity: 'medium',
        autoFix: false
      });
    }

    if (qualityMetrics.variables < 70 && variables.length > 0) {
      const unusedVariables = variables.filter(v => !content.includes(`{{${v.name}}}`));
      if (unusedVariables.length > 0) {
        suggestions.push({
          type: 'variables',
          title: 'Use Defined Variables',
          description: `You have ${unusedVariables.length} unused variables: ${unusedVariables.map(v => v.name).join(', ')}`,
          suggestion: `Include these variables in your prompt: ${unusedVariables.map(v => `{{${v.name}}}`).join(', ')}`,
          severity: 'high',
          autoFix: true
        });
      }
    }

    if (qualityMetrics.ragCompatibility < 70) {
      suggestions.push({
        type: 'rag',
        title: 'Add RAG Support',
        description: 'Include document context support for enhanced responses',
        suggestion: 'Add: "Based on the provided context: {{context}}" to enable document-enhanced responses',
        severity: 'low',
        autoFix: true
      });
    }

    if (qualityMetrics.industryOptimization < 70) {
      const industryTerms = getIndustryKeywords(category);
      suggestions.push({
        type: 'performance',
        title: `Optimize for ${category}`,
        description: `Include industry-specific terminology and best practices for ${category}`,
        suggestion: `Consider including terms like: ${industryTerms.slice(0, 3).join(', ')}`,
        severity: 'low',
        autoFix: false
      });
    }

    return suggestions;
  }, [qualityMetrics, variables, content, category]);

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBackground = (score: number): string => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/20';
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  };

  const handleApplySuggestion = (suggestion: PromptSuggestion) => {
    if (onApplySuggestion) {
      onApplySuggestion(suggestion);
    }
  };

  const metrics = [
    { 
      label: 'Clarity', 
      score: qualityMetrics.clarity, 
      icon: FileText,
      description: 'How clear and understandable your instructions are'
    },
    { 
      label: 'Structure', 
      score: qualityMetrics.structure, 
      icon: Target,
      description: 'How well-organized and logical your prompt is'
    },
    { 
      label: 'Variables', 
      score: qualityMetrics.variables, 
      icon: Settings,
      description: 'Effective use of variables for flexibility'
    },
    { 
      label: 'RAG Ready', 
      score: qualityMetrics.ragCompatibility, 
      icon: Database,
      description: 'Compatibility with document context enhancement'
    },
    { 
      label: `${category} Optimized`, 
      score: qualityMetrics.industryOptimization, 
      icon: TrendingUp,
      description: `Optimization for ${category} industry standards`
    }
  ];

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center">
          <Lightbulb className="w-5 h-5 text-yellow-500 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Quality Assistant
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Overall Score: <span className={getScoreColor(qualityMetrics.overall)}>
                {qualityMetrics.overall}%
              </span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {suggestions.length > 0 && (
            <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 text-xs px-2 py-1 rounded-full">
              {suggestions.length} suggestions
            </span>
          )}
          <Button variant="ghost" size="sm">
            {expanded ? '−' : '+'}
          </Button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          {/* Quality Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div 
                  key={metric.label}
                  className={`p-3 rounded-lg ${getScoreBackground(metric.score)}`}
                  title={metric.description}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className={`text-sm font-medium ${getScoreColor(metric.score)}`}>
                      {metric.score}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {metric.label}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                Improvement Suggestions
              </h4>
              {suggestions.map((suggestion, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        {suggestion.severity === 'high' && <AlertTriangle className="w-4 h-4 text-red-500 mr-2" />}
                        {suggestion.severity === 'medium' && <Info className="w-4 h-4 text-yellow-500 mr-2" />}
                        {suggestion.severity === 'low' && <CheckCircle className="w-4 h-4 text-green-500 mr-2" />}
                        <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                          {suggestion.title}
                        </h5>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {suggestion.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 italic">
                        {suggestion.suggestion}
                      </p>
                    </div>
                    {suggestion.autoFix && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApplySuggestion(suggestion)}
                        className="ml-3"
                      >
                        <Wand2 className="w-3 h-3 mr-1" />
                        Apply
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {suggestions.length === 0 && (
            <div className="text-center py-4">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Great job! Your prompt looks good.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function getIndustryKeywords(industry: string): string[] {
  const keywords: Record<string, string[]> = {
    'Healthcare': ['patient', 'medical', 'diagnosis', 'treatment', 'clinical', 'healthcare', 'symptoms', 'medication'],
    'Finance': ['financial', 'investment', 'portfolio', 'risk', 'analysis', 'market', 'revenue', 'profit'],
    'Technology': ['software', 'development', 'system', 'technical', 'code', 'implementation', 'architecture', 'performance'],
    'Marketing': ['campaign', 'brand', 'audience', 'engagement', 'conversion', 'strategy', 'content', 'promotion'],
    'Education': ['learning', 'student', 'curriculum', 'assessment', 'educational', 'teaching', 'knowledge', 'skills'],
    'Legal': ['legal', 'compliance', 'regulation', 'contract', 'policy', 'law', 'agreement', 'terms'],
    'Retail': ['customer', 'product', 'sales', 'inventory', 'merchandise', 'shopping', 'purchase', 'service']
  };

  return keywords[industry] || ['professional', 'business', 'analysis', 'strategy', 'process', 'quality'];
}
