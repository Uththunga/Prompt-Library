import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Database, Play, TrendingUp } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { userProfile } = useAuth();

  const stats = [
    {
      name: 'Total Prompts',
      value: '12',
      icon: FileText,
      change: '+2 this week',
      changeType: 'positive'
    },
    {
      name: 'Documents',
      value: '8',
      icon: Database,
      change: '+1 this week',
      changeType: 'positive'
    },
    {
      name: 'Executions',
      value: '156',
      icon: Play,
      change: '+23 today',
      changeType: 'positive'
    },
    {
      name: 'Success Rate',
      value: '98.2%',
      icon: TrendingUp,
      change: '+0.5% this week',
      changeType: 'positive'
    }
  ];

  return (
    <div>
      {/* Welcome section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {userProfile?.displayName || 'User'}!
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Here's what's happening with your prompts today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
              <div className="text-sm">
                <span className="text-green-600 dark:text-green-400 font-medium">
                  {stat.change}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent prompts */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Recent Prompts
            </h3>
            <div className="mt-5">
              <div className="flow-root">
                <ul className="-my-5 divide-y divide-gray-200 dark:divide-gray-700">
                  {[1, 2, 3].map((item) => (
                    <li key={item} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <FileText className="h-8 w-8 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            Customer Support Template {item}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Updated 2 hours ago
                          </p>
                        </div>
                        <div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Active
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Recent executions */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Recent Executions
            </h3>
            <div className="mt-5">
              <div className="flow-root">
                <ul className="-my-5 divide-y divide-gray-200 dark:divide-gray-700">
                  {[1, 2, 3].map((item) => (
                    <li key={item} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <Play className="h-8 w-8 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            Execution #{1000 + item}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {item * 5} minutes ago • 1.2s • 150 tokens
                          </p>
                        </div>
                        <div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Success
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
