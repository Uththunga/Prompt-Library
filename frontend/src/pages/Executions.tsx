import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { executionService } from '../services/firestore';
import type { PromptExecution } from '../types';
import { Play, Clock, Zap, DollarSign, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const Executions: React.FC = () => {
  const { currentUser } = useAuth();
  const [executions, setExecutions] = useState<PromptExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const loadExecutions = useCallback(async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const userExecutions = await executionService.getUserExecutions(currentUser.uid);
      setExecutions(userExecutions);
    } catch (error) {
      console.error('Error loading executions:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadExecutions();
    }
  }, [currentUser, loadExecutions]);

  const filteredExecutions = executions.filter(execution => {
    const matchesSearch = execution.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         execution.promptId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || execution.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: PromptExecution['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Play className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: PromptExecution['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const totalCost = executions.reduce((sum, exec) => sum + (exec.outputs?.metadata?.cost || 0), 0);
  const totalTokens = executions.reduce((sum, exec) => sum + (exec.outputs?.metadata?.tokensUsed || 0), 0);
  const avgExecutionTime = executions.length > 0 
    ? executions.reduce((sum, exec) => sum + (exec.outputs?.metadata?.executionTime || 0), 0) / executions.length
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Execution History
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          View and analyze your prompt execution history and performance metrics
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Play className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Executions
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {executions.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Cost
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    ${totalCost.toFixed(4)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Zap className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Tokens
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {totalTokens.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Avg Time
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {avgExecutionTime.toFixed(2)}s
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search executions..."
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {filteredExecutions.length} of {executions.length} executions
      </div>

      {/* Execution List */}
      {filteredExecutions.length === 0 ? (
        <div className="text-center py-12">
          <Play className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No executions found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {executions.length === 0 
              ? "Execute your first prompt to see results here."
              : "Try adjusting your search criteria."
            }
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredExecutions.map((execution) => (
              <li key={execution.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getStatusIcon(execution.status)}
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Execution #{execution.id.slice(-8)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Prompt: {execution.promptId.slice(-8)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(execution.status)}`}>
                        {execution.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4" />
                        {execution.timestamp.toLocaleString()}
                      </div>
                    </div>
                    
                    {execution.outputs?.metadata && (
                      <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 sm:mt-0 space-x-4">
                        <div className="flex items-center">
                          <Clock className="flex-shrink-0 mr-1 h-4 w-4" />
                          {execution.outputs.metadata.executionTime.toFixed(2)}s
                        </div>
                        <div className="flex items-center">
                          <Zap className="flex-shrink-0 mr-1 h-4 w-4" />
                          {execution.outputs.metadata.tokensUsed}
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="flex-shrink-0 mr-1 h-4 w-4" />
                          ${execution.outputs.metadata.cost.toFixed(4)}
                        </div>
                      </div>
                    )}
                  </div>

                  {execution.outputs?.content && (
                    <div className="mt-3">
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3">
                        <p className="text-sm text-gray-900 dark:text-white line-clamp-3">
                          {execution.outputs.content}
                        </p>
                      </div>
                    </div>
                  )}

                  {execution.error && (
                    <div className="mt-3">
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                        <p className="text-sm text-red-800 dark:text-red-200">
                          {execution.error}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
