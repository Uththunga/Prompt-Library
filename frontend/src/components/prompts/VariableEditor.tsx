import React, { useState } from 'react';
import type { PromptVariable } from '../../types';
import { Button } from '../common/Button';
import { 
  Plus, 
  Trash2, 
  Type, 
  Hash, 
  ToggleLeft, 
  List,
  Settings,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface VariableEditorProps {
  variables: PromptVariable[];
  onChange: (variables: PromptVariable[]) => void;
}

export const VariableEditor: React.FC<VariableEditorProps> = ({
  variables,
  onChange
}) => {
  const [expandedVariable, setExpandedVariable] = useState<number | null>(null);

  const addVariable = () => {
    const newVariable: PromptVariable = {
      name: '',
      type: 'string',
      description: '',
      required: false
    };
    onChange([...variables, newVariable]);
    setExpandedVariable(variables.length);
  };

  const updateVariable = (index: number, updates: Partial<PromptVariable>) => {
    const updatedVariables = variables.map((variable, i) =>
      i === index ? { ...variable, ...updates } : variable
    );
    onChange(updatedVariables);
  };

  const removeVariable = (index: number) => {
    onChange(variables.filter((_, i) => i !== index));
    if (expandedVariable === index) {
      setExpandedVariable(null);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'string': return Type;
      case 'number': return Hash;
      case 'boolean': return ToggleLeft;
      case 'array': return List;
      default: return Type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'string': return 'text-blue-600';
      case 'number': return 'text-green-600';
      case 'boolean': return 'text-purple-600';
      case 'array': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const validateVariable = (variable: PromptVariable) => {
    const errors = [];
    
    if (!variable.name.trim()) {
      errors.push('Name is required');
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable.name)) {
      errors.push('Name must be a valid identifier (letters, numbers, underscore)');
    }
    
    if (!variable.description.trim()) {
      errors.push('Description is required');
    }

    if (variable.validation) {
      if (variable.type === 'string' && variable.validation.pattern) {
        try {
          new RegExp(variable.validation.pattern);
        } catch {
          errors.push('Invalid regex pattern');
        }
      }
      
      if (variable.type === 'number') {
        if (variable.validation.min !== undefined && variable.validation.max !== undefined) {
          if (variable.validation.min >= variable.validation.max) {
            errors.push('Minimum value must be less than maximum value');
          }
        }
      }
    }

    return errors;
  };

  const generateVariableName = (description: string) => {
    return description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 20);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <Settings className="w-5 h-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Variables
          </h3>
          {variables.length > 0 && (
            <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
              {variables.length}
            </span>
          )}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={addVariable}
          className="flex items-center"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Variable
        </Button>
      </div>

      {/* Variables List */}
      <div className="p-4">
        {variables.length === 0 ? (
          <div className="text-center py-8">
            <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No variables defined yet
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
              Variables make your prompts dynamic and reusable. Use {`{{variable_name}}`} in your content.
            </p>
            <Button
              variant="primary"
              onClick={addVariable}
              className="flex items-center mx-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Variable
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {variables.map((variable, index) => {
              const TypeIcon = getTypeIcon(variable.type);
              const errors = validateVariable(variable);
              const isExpanded = expandedVariable === index;
              const isValid = errors.length === 0;

              return (
                <div
                  key={index}
                  className={`border rounded-lg ${isValid ? 'border-gray-200 dark:border-gray-700' : 'border-red-300 dark:border-red-600'}`}
                >
                  {/* Variable Header */}
                  <div 
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={() => setExpandedVariable(isExpanded ? null : index)}
                  >
                    <div className="flex items-center flex-1">
                      <TypeIcon className={`w-4 h-4 mr-2 ${getTypeColor(variable.type)}`} />
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {variable.name || 'Unnamed Variable'}
                          </span>
                          {variable.required && (
                            <span className="ml-2 text-xs text-red-600">*</span>
                          )}
                          {isValid ? (
                            <CheckCircle className="w-4 h-4 ml-2 text-green-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 ml-2 text-red-600" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {variable.description || 'No description'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded ${getTypeColor(variable.type)} bg-opacity-10`}>
                        {variable.type}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeVariable(index);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Variable Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-700">
                      <div className="space-y-4">
                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Variable Name *
                            </label>
                            <input
                              type="text"
                              value={variable.name}
                              onChange={(e) => updateVariable(index, { name: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white text-sm"
                              placeholder="variable_name"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Type
                            </label>
                            <select
                              value={variable.type}
                              onChange={(e) => updateVariable(index, { type: e.target.value as any })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white text-sm"
                            >
                              <option value="string">String (Text)</option>
                              <option value="number">Number</option>
                              <option value="boolean">Boolean (True/False)</option>
                              <option value="array">Array (List)</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description *
                          </label>
                          <textarea
                            value={variable.description}
                            onChange={(e) => {
                              const description = e.target.value;
                              updateVariable(index, { description });
                              
                              // Auto-generate name if empty
                              if (!variable.name && description) {
                                const generatedName = generateVariableName(description);
                                updateVariable(index, { name: generatedName });
                              }
                            }}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white text-sm"
                            placeholder="Describe what this variable represents and how it should be used"
                          />
                        </div>

                        {/* Default Value */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Default Value
                          </label>
                          {variable.type === 'boolean' ? (
                            <select
                              value={variable.defaultValue?.toString() || ''}
                              onChange={(e) => updateVariable(index, { 
                                defaultValue: e.target.value ? e.target.value === 'true' : undefined 
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white text-sm"
                            >
                              <option value="">No default</option>
                              <option value="true">True</option>
                              <option value="false">False</option>
                            </select>
                          ) : (
                            <input
                              type={variable.type === 'number' ? 'number' : 'text'}
                              value={variable.defaultValue?.toString() || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                let defaultValue: any = value || undefined;
                                
                                if (variable.type === 'number' && value) {
                                  defaultValue = parseFloat(value);
                                }
                                
                                updateVariable(index, { defaultValue });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white text-sm"
                              placeholder={`Default ${variable.type} value`}
                            />
                          )}
                        </div>

                        {/* Options */}
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={variable.required}
                              onChange={(e) => updateVariable(index, { required: e.target.checked })}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                              Required
                            </span>
                          </label>
                        </div>

                        {/* Validation Errors */}
                        {errors.length > 0 && (
                          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md p-3">
                            <div className="flex items-center">
                              <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                              <span className="text-sm font-medium text-red-800 dark:text-red-200">
                                Validation Errors:
                              </span>
                            </div>
                            <ul className="mt-2 text-sm text-red-700 dark:text-red-300 list-disc list-inside">
                              {errors.map((error, errorIndex) => (
                                <li key={errorIndex}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
