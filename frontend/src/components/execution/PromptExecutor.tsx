import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { Prompt, PromptVariable, PromptExecution } from '../../types';
import { Play, Settings, Clock, DollarSign, Zap, Brain, FileText, Search } from 'lucide-react';
import { Button } from '../common/Button';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { DocumentService } from '../../services/documentService';
import type { RAGDocument } from '../../types';

interface PromptExecutorProps {
  prompt: Prompt;
  onExecutionComplete?: (execution: PromptExecution) => void;
}

interface ExecutionSettings {
  useRAG: boolean;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
}

export const PromptExecutor: React.FC<PromptExecutorProps> = ({
  prompt,
  onExecutionComplete
}) => {
  const { currentUser } = useAuth();
  const [variables, setVariables] = useState<Record<string, string | number | boolean | string[]>>({});
  const [settings, setSettings] = useState<ExecutionSettings>({
    useRAG: false,
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 1000,
    topP: 1.0
  });
  const [showSettings, setShowSettings] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<PromptExecution | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [documents, setDocuments] = useState<RAGDocument[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  const models = [
    { id: 'meta-llama/llama-3.2-11b-vision-instruct:free', name: 'Llama 3.2 11B Vision (Free)', cost: 0.0 },
    { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Llama 3.2 3B (Free)', cost: 0.0 },
    { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B (Free)', cost: 0.0 },
    { id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B (Free)', cost: 0.0 },
    { id: 'microsoft/phi-3-mini-128k-instruct:free', name: 'Phi-3 Mini 128K (Free)', cost: 0.0 }
  ];

  // Load user documents for RAG
  const loadUserDocuments = useCallback(async () => {
    if (!currentUser) return;

    try {
      setLoadingDocuments(true);
      const userDocs = await DocumentService.getDocumentsByStatus(currentUser.uid, 'completed');
      setDocuments(userDocs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoadingDocuments(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadUserDocuments();
    }
  }, [currentUser, loadUserDocuments]);

  const handleVariableChange = (variableName: string, value: string | number | boolean | string[]) => {
    setVariables(prev => ({
      ...prev,
      [variableName]: value
    }));
  };

  const validateInputs = () => {
    for (const variable of prompt.variables) {
      if (variable.required && !variables[variable.name]) {
        alert(`Please provide a value for required variable: ${variable.name}`);
        return false;
      }
    }
    return true;
  };

  const executePrompt = async () => {
    if (!currentUser || !validateInputs()) return;

    try {
      setExecuting(true);

      const startTime = Date.now();

      // Prepare RAG query if using RAG
      const ragQuery = settings.useRAG ? variables['query'] || prompt.content : '';

      // Call Firebase Function for prompt execution
      const executePromptFunction = httpsCallable(functions, 'execute_prompt');
      const response = await executePromptFunction({
        promptId: prompt.id,
        inputs: variables,
        useRag: settings.useRAG,
        ragQuery: ragQuery,
        documentIds: selectedDocuments
      });

      const executionData = response.data as any;

      const endTime = Date.now();
      const executionTime = (endTime - startTime) / 1000;

      // Create execution result from Firebase Function response
      const execution: PromptExecution = {
        id: `exec-${Date.now()}`,
        promptId: prompt.id,
        inputs: variables,
        outputs: {
          content: executionData.output || 'No response generated',
          metadata: {
            model: executionData.metadata?.model || settings.model,
            tokensUsed: executionData.metadata?.tokensUsed || 0,
            executionTime: executionData.metadata?.executionTime || executionTime,
            cost: executionData.metadata?.cost || 0
          }
        },
        timestamp: new Date(),
        status: executionData.metadata?.error ? 'failed' : 'completed',
        error: executionData.metadata?.error
      };

      setResult(execution);

      if (onExecutionComplete) {
        onExecutionComplete(execution);
      }

    } catch (error) {
      console.error('Execution error:', error);
      alert('Failed to execute prompt. Please try again.');
    } finally {
      setExecuting(false);
    }
  };

  const testOpenRouterConnection = async () => {
    if (!currentUser) return;

    try {
      setTestingConnection(true);

      const testFunction = httpsCallable(functions, 'test_openrouter_connection');
      const response = await testFunction({});
      const testData = response.data as any;

      if (testData.status === 'success') {
        alert(`✅ OpenRouter Connection Successful!\n\nModel: ${testData.model_info?.model}\nTest Response: ${testData.test_response?.content}\nTokens Used: ${testData.test_response?.tokens_used}\nResponse Time: ${testData.test_response?.response_time?.toFixed(2)}s`);
      } else {
        alert(`❌ OpenRouter Connection Failed!\n\nError: ${testData.message}`);
      }

    } catch (error) {
      console.error('Connection test error:', error);
      alert('❌ Failed to test OpenRouter connection. Please check the console for details.');
    } finally {
      setTestingConnection(false);
    }
  };

  const renderVariableInput = (variable: PromptVariable) => {
    const value = variables[variable.name] || variable.defaultValue || '';

    switch (variable.type) {
      case 'boolean':
        return (
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => handleVariableChange(variable.name, e.target.checked)}
            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={typeof value === 'number' ? value : ''}
            onChange={(e) => handleVariableChange(variable.name, parseFloat(e.target.value) || 0)}
            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder={`Enter ${variable.name}`}
          />
        );
      case 'array':
        return (
          <textarea
            value={Array.isArray(value) ? value.join('\n') : String(value)}
            onChange={(e) => handleVariableChange(variable.name, e.target.value.split('\n').filter(Boolean))}
            rows={3}
            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Enter one item per line"
          />
        );
      default:
        return (
          <input
            type="text"
            value={String(value)}
            onChange={(e) => handleVariableChange(variable.name, e.target.value)}
            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder={`Enter ${variable.name}`}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Prompt Info */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {prompt.title}
        </h2>
        {prompt.description && (
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {prompt.description}
          </p>
        )}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
          <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-white font-mono">
            {prompt.content}
          </pre>
        </div>
      </div>

      {/* Variables */}
      {prompt.variables.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Variables
          </h3>
          <div className="space-y-4">
            {prompt.variables.map((variable) => (
              <div key={variable.name}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {variable.name}
                  {variable.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {variable.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {variable.description}
                  </p>
                )}
                {renderVariableInput(variable)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Execution Settings
            </h3>
            <Settings className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        
        {showSettings && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Model
                </label>
                <select
                  value={settings.model}
                  onChange={(e) => setSettings(prev => ({ ...prev, model: e.target.value }))}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {models.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name} (${model.cost}/1K tokens)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Temperature: {settings.temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={settings.temperature}
                  onChange={(e) => setSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max Tokens
                </label>
                <input
                  type="number"
                  value={settings.maxTokens}
                  onChange={(e) => setSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 1000 }))}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.useRAG}
                    onChange={(e) => setSettings(prev => ({ ...prev, useRAG: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Use RAG (Retrieval Augmented Generation)
                  </span>
                </label>
              </div>

              {/* Document Selection for RAG */}
              {settings.useRAG && (
                <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Documents for Context
                  </label>

                  {loadingDocuments ? (
                    <div className="flex items-center justify-center py-4">
                      <LoadingSpinner size="sm" />
                      <span className="ml-2 text-sm text-gray-600">Loading documents...</span>
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="text-sm text-gray-500 py-4 text-center">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      No processed documents available.
                      <br />
                      <a href="/documents" className="text-blue-600 hover:text-blue-700">
                        Upload documents
                      </a> to use RAG.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      <div className="flex items-center mb-2">
                        <button
                          type="button"
                          onClick={() => setSelectedDocuments(
                            selectedDocuments.length === documents.length ? [] : documents.map(d => d.id)
                          )}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          {selectedDocuments.length === documents.length ? 'Deselect All' : 'Select All'}
                        </button>
                        <span className="ml-2 text-xs text-gray-500">
                          ({selectedDocuments.length} of {documents.length} selected)
                        </span>
                      </div>

                      {documents.map((doc) => (
                        <label key={doc.id} className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                          <input
                            type="checkbox"
                            checked={selectedDocuments.includes(doc.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDocuments(prev => [...prev, doc.id]);
                              } else {
                                setSelectedDocuments(prev => prev.filter(id => id !== doc.id));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                          />
                          <div className="ml-2 flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {doc.originalName}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {DocumentService.formatFileSize(doc.size)} •
                              {doc.metadata.chunk_count || 0} chunks
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Execute Buttons */}
      <div className="flex justify-center space-x-4">
        <Button
          variant="secondary"
          size="md"
          onClick={testOpenRouterConnection}
          loading={testingConnection}
          disabled={testingConnection || executing}
        >
          {testingConnection ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Testing...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4 mr-2" />
              Test Connection
            </>
          )}
        </Button>

        <Button
          variant="primary"
          size="lg"
          onClick={executePrompt}
          loading={executing}
          disabled={executing || testingConnection}
        >
          {executing ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Executing...
            </>
          ) : (
            <>
              <Play className="w-5 h-5 mr-2" />
              Execute Prompt
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Execution Result
            </h3>
            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {result.outputs.metadata.executionTime.toFixed(2)}s
              </div>
              <div className="flex items-center">
                <Zap className="w-4 h-4 mr-1" />
                {result.outputs.metadata.tokensUsed} tokens
              </div>
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 mr-1" />
                ${result.outputs.metadata.cost.toFixed(4)}
              </div>
              {result.outputs.metadata.model && (
                <div className="flex items-center">
                  <Brain className="w-4 h-4 mr-1" />
                  {result.outputs.metadata.model.split('/').pop()?.split(':')[0] || 'Unknown'}
                </div>
              )}
            </div>
          </div>

          {/* RAG Context Information */}
          {result.context && result.ragMetadata && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <div className="flex items-center mb-2">
                <Search className="w-4 h-4 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  RAG Context Used
                </span>
              </div>
              <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                <div>
                  Found {result.ragMetadata.total_chunks_found || 0} relevant chunks,
                  used {result.ragMetadata.chunks_used || 0} for context
                </div>
                {result.ragMetadata.document_sources && result.ragMetadata.document_sources.length > 0 && (
                  <div>
                    Sources: {result.ragMetadata.document_sources.length} document(s)
                  </div>
                )}
                {result.ragMetadata.context_length && (
                  <div>
                    Context length: {result.ragMetadata.context_length} characters
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {result.error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <div className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                Execution Error
              </div>
              <div className="text-sm text-red-800 dark:text-red-200">
                {result.error}
              </div>
            </div>
          )}

          <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
            <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-white">
              {result.outputs.content}
            </pre>
          </div>

          {/* Show RAG Context Details (Collapsible) */}
          {result.context && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                View Retrieved Context ({result.context.length} characters)
              </summary>
              <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-600 rounded text-xs text-gray-700 dark:text-gray-300 max-h-40 overflow-y-auto">
                <pre className="whitespace-pre-wrap">{result.context}</pre>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
};
