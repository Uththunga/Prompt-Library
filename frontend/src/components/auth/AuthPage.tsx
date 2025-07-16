import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { Brain } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start mb-6">
            <Brain className="w-12 h-12 text-blue-400 mr-3" />
            <h1 className="text-3xl font-bold text-white">
              PromptLibrary
            </h1>
          </div>

          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Smart Prompt Management with RAG
          </h2>

          <p className="text-xl text-gray-200 mb-8">
            Create, manage, and execute AI prompts with powerful retrieval-augmented generation capabilities. 
            Build better AI applications faster.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <div>
                <h3 className="font-semibold text-white">Prompt Library</h3>
                <p className="text-sm text-gray-300">Organize and version your prompts</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <div>
                <h3 className="font-semibold text-white">RAG Integration</h3>
                <p className="text-sm text-gray-300">Connect your documents and data</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <div>
                <h3 className="font-semibold text-white">Team Collaboration</h3>
                <p className="text-sm text-gray-300">Share and collaborate on prompts</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <div>
                <h3 className="font-semibold text-white">Analytics</h3>
                <p className="text-sm text-gray-300">Track performance and costs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Auth Form */}
        <div className="flex items-center justify-center">
          {isLogin ? (
            <LoginForm onSwitchToSignup={() => setIsLogin(false)} />
          ) : (
            <SignupForm onSwitchToLogin={() => setIsLogin(true)} />
          )}
        </div>
      </div>
    </div>
  );
};
