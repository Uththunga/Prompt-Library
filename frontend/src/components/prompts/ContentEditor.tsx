import React, { useState, useRef, useEffect } from 'react';
import type { PromptVariable } from '../../types';
import { Button } from '../common/Button';
import {
  Type,
  Hash,
  List,
  Plus,
  Wand2,
  FileText,
  Lightbulb
} from 'lucide-react';

interface ContentEditorProps {
  content: string;
  onChange: (content: string) => void;
  showPreview: boolean;
  variables: PromptVariable[];
}

export const ContentEditor: React.FC<ContentEditorProps> = ({
  content,
  onChange,
  showPreview,
  variables
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [showVariableHelper, setShowVariableHelper] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [content]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    // setCursorPosition(e.target.selectionStart);
  };

  const insertVariable = (variableName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const variableText = `{{${variableName}}}`;
    
    const newContent = content.substring(0, start) + variableText + content.substring(end);
    onChange(newContent);

    // Set cursor position after the inserted variable
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variableText.length, start + variableText.length);
    }, 0);
  };

  const insertTemplate = (template: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const newContent = content.substring(0, start) + template + content.substring(end);
    onChange(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + template.length, start + template.length);
    }, 0);
  };

  const renderHighlightedContent = () => {
    if (!content) return '';

    // Simple syntax highlighting for variables
    return content.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
      const isValidVariable = variables.some(v => v.name === variableName.trim());
      const className = isValidVariable 
        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-1 rounded'
        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-1 rounded';
      
      return `<span class="${className}">${match}</span>`;
    });
  };

  const renderPreview = () => {
    let preview = content;
    
    // Replace variables with sample values
    variables.forEach(variable => {
      const placeholder = `{{${variable.name}}}`;
      let sampleValue = '';
      
      switch (variable.type) {
        case 'string':
          sampleValue = variable.defaultValue as string || `[${variable.name}]`;
          break;
        case 'number':
          sampleValue = String(variable.defaultValue || 42);
          break;
        case 'boolean':
          sampleValue = String(variable.defaultValue || true);
          break;
        case 'array':
          sampleValue = variable.defaultValue as string || `[item1, item2, item3]`;
          break;
        default:
          sampleValue = `[${variable.name}]`;
      }
      
      preview = preview.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), sampleValue);
    });

    return preview;
  };

  const quickTemplates = [
    {
      name: 'Role Definition',
      template: 'You are a helpful assistant that specializes in {{expertise_area}}.',
      icon: Type
    },
    {
      name: 'Context Section',
      template: '\n\nContext:\n{{context}}\n\nBased on the above context, ',
      icon: FileText
    },
    {
      name: 'Step-by-Step',
      template: '\n\nPlease provide a step-by-step approach:\n1. \n2. \n3. ',
      icon: List
    },
    {
      name: 'Output Format',
      template: '\n\nFormat your response as:\n- Summary: \n- Key Points: \n- Recommendations: ',
      icon: Hash
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Prompt Content
        </h3>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowVariableHelper(!showVariableHelper)}
            className="flex items-center"
          >
            <Wand2 className="w-4 h-4 mr-1" />
            Helpers
          </Button>
        </div>
      </div>

      {/* Quick Templates */}
      {showVariableHelper && (
        <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <div className="mb-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Quick Templates
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {quickTemplates.map((template) => (
                <Button
                  key={template.name}
                  variant="outline"
                  size="sm"
                  onClick={() => insertTemplate(template.template)}
                  className="flex items-center justify-start text-left"
                >
                  <template.icon className="w-3 h-3 mr-2" />
                  {template.name}
                </Button>
              ))}
            </div>
          </div>

          {variables.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Available Variables
              </h4>
              <div className="flex flex-wrap gap-2">
                {variables.map((variable) => (
                  <Button
                    key={variable.name}
                    variant="outline"
                    size="sm"
                    onClick={() => insertVariable(variable.name)}
                    className="flex items-center"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {variable.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content Area */}
      <div className="p-4">
        {showPreview ? (
          <div className="min-h-[300px] p-4 border border-gray-300 rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
            <div className="flex items-center mb-3">
              <Lightbulb className="w-4 h-4 text-yellow-500 mr-2" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Preview with sample variable values
              </span>
            </div>
            <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-white font-sans">
              {renderPreview()}
            </pre>
          </div>
        ) : (
          <div className="relative">
            {/* Syntax highlighting overlay */}
            <div 
              className="absolute inset-0 p-3 text-transparent pointer-events-none font-mono text-sm leading-6 whitespace-pre-wrap break-words"
              style={{ 
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                fontSize: '14px',
                lineHeight: '1.5'
              }}
              dangerouslySetInnerHTML={{ __html: renderHighlightedContent() }}
            />
            
            {/* Actual textarea */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleTextareaChange}
              className="relative w-full min-h-[300px] p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-sm resize-none bg-transparent"
              placeholder="Enter your prompt content here. Use {{variable_name}} for variables.

Example:
You are a helpful assistant that {{task_description}}.

Please {{action}} the following {{content_type}}:
{{input_content}}

Provide your response in {{output_format}} format."
              style={{ 
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                fontSize: '14px',
                lineHeight: '1.5'
              }}
            />
          </div>
        )}

        {/* Content Stats */}
        <div className="flex items-center justify-between mt-3 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-4">
            <span>{content.length} characters</span>
            <span>{content.split(/\s+/).filter(word => word.length > 0).length} words</span>
            <span>{content.split('\n').length} lines</span>
          </div>
          
          <div className="flex items-center space-x-4">
            {variables.length > 0 && (
              <span>{variables.length} variable{variables.length !== 1 ? 's' : ''}</span>
            )}
            
            {/* Variable validation */}
            {(() => {
              const usedVariables = (content.match(/\{\{([^}]+)\}\}/g) || [])
                .map(match => match.slice(2, -2).trim());
              const undefinedVariables = usedVariables.filter(
                varName => !variables.some(v => v.name === varName)
              );
              
              if (undefinedVariables.length > 0) {
                return (
                  <span className="text-red-500">
                    {undefinedVariables.length} undefined variable{undefinedVariables.length !== 1 ? 's' : ''}
                  </span>
                );
              }
              
              return null;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
