import React, { useState } from 'react';
import type { PromptGenerationFormData, PromptGenerationVariable, PromptGenerationRequest } from '../../types';
import { Button } from '../common/Button';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { 
  ArrowLeft, 
  ArrowRight, 
  Sparkles, 
  Target, 
  Settings, 
  Eye,
  Plus,
  Trash2,
  Info
} from 'lucide-react';

interface PromptGenerationWizardProps {
  onGenerate: (request: PromptGenerationRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const INDUSTRIES = [
  'Healthcare', 'Finance', 'Technology', 'Education', 'Marketing', 
  'Legal', 'Retail', 'Manufacturing', 'Real Estate', 'Consulting',
  'Media', 'Non-profit', 'Government', 'Other'
];

const USE_CASES = [
  'Customer Support', 'Content Generation', 'Data Analysis', 'Code Review',
  'Email Writing', 'Report Generation', 'Creative Writing', 'Translation',
  'Summarization', 'Question Answering', 'Research', 'Planning', 'Other'
];

const OUTPUT_FORMATS = [
  { value: 'paragraph', label: 'Paragraph', description: 'Continuous text format' },
  { value: 'bullet_points', label: 'Bullet Points', description: 'Listed items with bullets' },
  { value: 'structured_data', label: 'Structured Data', description: 'Organized sections and headers' },
  { value: 'json', label: 'JSON', description: 'JavaScript Object Notation' },
  { value: 'table', label: 'Table', description: 'Tabular format' },
  { value: 'list', label: 'List', description: 'Numbered or ordered list' }
];

const TONES = [
  { value: 'professional', label: 'Professional', description: 'Formal business tone' },
  { value: 'casual', label: 'Casual', description: 'Relaxed and friendly' },
  { value: 'technical', label: 'Technical', description: 'Precise and detailed' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
  { value: 'formal', label: 'Formal', description: 'Official and structured' },
  { value: 'creative', label: 'Creative', description: 'Imaginative and expressive' }
];

const LENGTHS = [
  { value: 'short', label: 'Short', description: '1-2 sentences' },
  { value: 'medium', label: 'Medium', description: '1-2 paragraphs' },
  { value: 'long', label: 'Long', description: 'Multiple paragraphs' }
];

export const PromptGenerationWizard: React.FC<PromptGenerationWizardProps> = ({
  onGenerate,
  onCancel,
  loading = false
}) => {
  const [formData, setFormData] = useState<PromptGenerationFormData>({
    step: 'basic_info',
    basicInfo: {
      purpose: '',
      industry: '',
      useCase: '',
      targetAudience: ''
    },
    variables: [],
    preferences: {
      outputFormat: 'paragraph',
      tone: 'professional',
      length: 'medium',
      includeRAG: false,
      additionalRequirements: ''
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep = (step: string): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 'basic_info') {
      if (!formData.basicInfo.purpose.trim()) {
        newErrors.purpose = 'Purpose is required';
      }
      if (!formData.basicInfo.industry) {
        newErrors.industry = 'Industry is required';
      }
      if (!formData.basicInfo.useCase) {
        newErrors.useCase = 'Use case is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (!validateStep(formData.step)) return;

    const steps = ['basic_info', 'variables', 'preferences', 'review'];
    const currentIndex = steps.indexOf(formData.step);
    if (currentIndex < steps.length - 1) {
      setFormData(prev => ({ ...prev, step: steps[currentIndex + 1] as any }));
    }
  };

  const prevStep = () => {
    const steps = ['basic_info', 'variables', 'preferences', 'review'];
    const currentIndex = steps.indexOf(formData.step);
    if (currentIndex > 0) {
      setFormData(prev => ({ ...prev, step: steps[currentIndex - 1] as any }));
    }
  };

  const addVariable = () => {
    const newVariable: PromptGenerationVariable = {
      name: '',
      description: '',
      type: 'string',
      required: true,
      example: ''
    };
    setFormData(prev => ({
      ...prev,
      variables: [...prev.variables, newVariable]
    }));
  };

  const updateVariable = (index: number, updates: Partial<PromptGenerationVariable>) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.map((variable, i) =>
        i === index ? { ...variable, ...updates } : variable
      )
    }));
  };

  const removeVariable = (index: number) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.filter((_, i) => i !== index)
    }));
  };

  const handleGenerate = async () => {
    if (!validateStep('review')) return;

    const request: PromptGenerationRequest = {
      purpose: formData.basicInfo.purpose,
      industry: formData.basicInfo.industry,
      useCase: formData.basicInfo.useCase,
      targetAudience: formData.basicInfo.targetAudience,
      inputVariables: formData.variables,
      outputFormat: formData.preferences.outputFormat as any,
      tone: formData.preferences.tone as any,
      length: formData.preferences.length as any,
      includeRAG: formData.preferences.includeRAG,
      additionalRequirements: formData.preferences.additionalRequirements
    };

    await onGenerate(request);
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'basic_info', label: 'Basic Info', icon: Target },
      { key: 'variables', label: 'Variables', icon: Settings },
      { key: 'preferences', label: 'Preferences', icon: Sparkles },
      { key: 'review', label: 'Review', icon: Eye }
    ];

    const currentIndex = steps.findIndex(step => step.key === formData.step);

    return (
      <div className="flex items-center justify-center mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.key === formData.step;
          const isCompleted = index < currentIndex;
          
          return (
            <React.Fragment key={step.key}>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                isActive 
                  ? 'border-blue-500 bg-blue-500 text-white' 
                  : isCompleted
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-gray-300 bg-white text-gray-400'
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-center mt-2">
                <p className={`text-sm font-medium ${
                  isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {step.label}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 ${
                  isCompleted ? 'bg-green-500' : 'bg-gray-300'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          AI-Assisted Prompt Generation
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Let AI help you create the perfect prompt for your needs
        </p>
      </div>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Form Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        {formData.step === 'basic_info' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Tell us about your prompt
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                What is the purpose of your prompt? *
              </label>
              <textarea
                value={formData.basicInfo.purpose}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  basicInfo: { ...prev.basicInfo, purpose: e.target.value }
                }))}
                className={`w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.purpose ? 'border-red-500' : 'border-gray-300'
                }`}
                rows={3}
                placeholder="e.g., Generate customer support responses, Create marketing copy, Analyze data trends..."
              />
              {errors.purpose && (
                <p className="mt-1 text-sm text-red-600">{errors.purpose}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Industry *
                </label>
                <select
                  value={formData.basicInfo.industry}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    basicInfo: { ...prev.basicInfo, industry: e.target.value }
                  }))}
                  className={`w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    errors.industry ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select an industry</option>
                  {INDUSTRIES.map(industry => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>
                {errors.industry && (
                  <p className="mt-1 text-sm text-red-600">{errors.industry}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Use Case *
                </label>
                <select
                  value={formData.basicInfo.useCase}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    basicInfo: { ...prev.basicInfo, useCase: e.target.value }
                  }))}
                  className={`w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    errors.useCase ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select a use case</option>
                  {USE_CASES.map(useCase => (
                    <option key={useCase} value={useCase}>{useCase}</option>
                  ))}
                </select>
                {errors.useCase && (
                  <p className="mt-1 text-sm text-red-600">{errors.useCase}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Audience (Optional)
              </label>
              <input
                type="text"
                value={formData.basicInfo.targetAudience}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  basicInfo: { ...prev.basicInfo, targetAudience: e.target.value }
                }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="e.g., Technical professionals, General consumers, Students..."
              />
            </div>
          </div>
        )}

        {formData.step === 'variables' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Define Input Variables
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={addVariable}
                className="flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Variable
              </Button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    About Variables
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Variables make your prompts dynamic and reusable. They will be represented as {`{{variable_name}}`} in your prompt.
                    You can skip this step if you want a static prompt.
                  </p>
                </div>
              </div>
            </div>

            {formData.variables.length === 0 ? (
              <div className="text-center py-8">
                <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No variables defined yet
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Variables make your prompts flexible and reusable across different inputs.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.variables.map((variable, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        Variable {index + 1}
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVariable(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Variable Name *
                        </label>
                        <input
                          type="text"
                          value={variable.name}
                          onChange={(e) => updateVariable(index, { name: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="e.g., customer_name, product_type"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Type
                        </label>
                        <select
                          value={variable.type}
                          onChange={(e) => updateVariable(index, { type: e.target.value as any })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                          <option value="string">Text</option>
                          <option value="number">Number</option>
                          <option value="boolean">True/False</option>
                          <option value="array">List</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description *
                      </label>
                      <textarea
                        value={variable.description}
                        onChange={(e) => updateVariable(index, { description: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        rows={2}
                        placeholder="Describe what this variable represents..."
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Example Value
                        </label>
                        <input
                          type="text"
                          value={variable.example || ''}
                          onChange={(e) => updateVariable(index, { example: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="e.g., John Smith, Premium Plan"
                        />
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`required-${index}`}
                          checked={variable.required}
                          onChange={(e) => updateVariable(index, { required: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`required-${index}`} className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Required variable
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {formData.step === 'preferences' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Customize Your Prompt
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Output Format
                </label>
                <div className="space-y-2">
                  {OUTPUT_FORMATS.map(format => (
                    <label key={format.value} className="flex items-start cursor-pointer">
                      <input
                        type="radio"
                        name="outputFormat"
                        value={format.value}
                        checked={formData.preferences.outputFormat === format.value}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, outputFormat: e.target.value }
                        }))}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {format.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {format.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Tone & Style
                </label>
                <div className="space-y-2">
                  {TONES.map(tone => (
                    <label key={tone.value} className="flex items-start cursor-pointer">
                      <input
                        type="radio"
                        name="tone"
                        value={tone.value}
                        checked={formData.preferences.tone === tone.value}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, tone: e.target.value }
                        }))}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {tone.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {tone.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Response Length
              </label>
              <div className="grid grid-cols-3 gap-4">
                {LENGTHS.map(length => (
                  <label key={length.value} className="flex flex-col items-center cursor-pointer border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <input
                      type="radio"
                      name="length"
                      value={length.value}
                      checked={formData.preferences.length === length.value}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, length: e.target.value }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mb-2"
                    />
                    <div className="text-sm font-medium text-gray-900 dark:text-white text-center">
                      {length.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      {length.description}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="includeRAG"
                  checked={formData.preferences.includeRAG}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, includeRAG: e.target.checked }
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="includeRAG" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Include RAG (Document Context) Support
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                This will add support for using uploaded documents as context in your prompt responses.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Additional Requirements (Optional)
              </label>
              <textarea
                value={formData.preferences.additionalRequirements}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  preferences: { ...prev.preferences, additionalRequirements: e.target.value }
                }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                rows={3}
                placeholder="Any specific requirements, constraints, or special instructions..."
              />
            </div>
          </div>
        )}

        {formData.step === 'review' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Review Your Requirements
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Basic Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Purpose:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">{formData.basicInfo.purpose}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Industry:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">{formData.basicInfo.industry}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Use Case:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">{formData.basicInfo.useCase}</span>
                    </div>
                    {formData.basicInfo.targetAudience && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Target Audience:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">{formData.basicInfo.targetAudience}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Variables ({formData.variables.length})
                  </h4>
                  {formData.variables.length === 0 ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400">No variables defined</p>
                  ) : (
                    <div className="space-y-2">
                      {formData.variables.map((variable, index) => (
                        <div key={index} className="text-sm">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {`{{${variable.name}}}`}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400 ml-2">
                            ({variable.type}) - {variable.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Preferences
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Output Format:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {OUTPUT_FORMATS.find(f => f.value === formData.preferences.outputFormat)?.label}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Tone:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {TONES.find(t => t.value === formData.preferences.tone)?.label}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Length:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {LENGTHS.find(l => l.value === formData.preferences.length)?.label}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">RAG Support:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {formData.preferences.includeRAG ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                {formData.preferences.additionalRequirements && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Additional Requirements
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formData.preferences.additionalRequirements}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Ready to Generate
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    AI will create an optimized prompt based on your requirements. You can edit and refine it after generation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={formData.step === 'basic_info' ? onCancel : prevStep}
          className="flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {formData.step === 'basic_info' ? 'Cancel' : 'Previous'}
        </Button>

        {formData.step === 'review' ? (
          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center"
          >
            {loading ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {loading ? 'Generating...' : 'Generate Prompt'}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={nextStep}
            className="flex items-center"
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
};
