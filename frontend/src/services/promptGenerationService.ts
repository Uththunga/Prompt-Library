import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import type { 
  PromptGenerationRequest, 
  PromptGenerationResponse,
  PromptEnhancementSuggestion 
} from '../types';

export class PromptGenerationService {
  private generatePromptFunction = httpsCallable(functions, 'generate_prompt');

  /**
   * Generate an AI-optimized prompt based on user requirements
   */
  async generatePrompt(request: PromptGenerationRequest): Promise<PromptGenerationResponse> {
    try {
      const response = await this.generatePromptFunction(request);
      const data = response.data as any;

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format from prompt generation service');
      }

      // Validate required fields
      if (!data.generatedPrompt) {
        throw new Error('No prompt was generated');
      }

      return {
        generatedPrompt: data.generatedPrompt,
        title: data.title || 'Generated Prompt',
        description: data.description || 'AI-generated prompt',
        category: data.category || 'General',
        tags: Array.isArray(data.tags) ? data.tags : [],
        variables: Array.isArray(data.variables) ? data.variables : [],
        qualityScore: data.qualityScore || {
          overall: 70,
          structure: 70,
          clarity: 70,
          variables: 70,
          ragCompatibility: 70,
          suggestions: []
        },
        suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
        metadata: {
          model: data.metadata?.model || 'unknown',
          tokensUsed: data.metadata?.tokensUsed || 0,
          generationTime: data.metadata?.generationTime || 0,
          confidence: data.metadata?.confidence || 0.7
        }
      };
    } catch (error: any) {
      console.error('Error generating prompt:', error);
      
      // Provide user-friendly error messages
      if (error.code === 'unauthenticated') {
        throw new Error('Please sign in to generate prompts');
      } else if (error.code === 'permission-denied') {
        throw new Error('You do not have permission to generate prompts');
      } else if (error.code === 'unavailable') {
        throw new Error('Prompt generation service is temporarily unavailable');
      } else if (error.message?.includes('quota')) {
        throw new Error('API quota exceeded. Please try again later');
      } else {
        throw new Error(error.message || 'Failed to generate prompt. Please try again');
      }
    }
  }

  /**
   * Enhance an existing prompt with AI suggestions
   */
  async enhancePrompt(
    existingPrompt: string, 
    context: Partial<PromptGenerationRequest>
  ): Promise<PromptEnhancementSuggestion[]> {
    try {
      // Create a request for enhancement
      const enhancementRequest: PromptGenerationRequest = {
        purpose: context.purpose || 'Enhance existing prompt',
        industry: context.industry || 'General',
        useCase: context.useCase || 'General',
        targetAudience: context.targetAudience,
        inputVariables: context.inputVariables || [],
        outputFormat: context.outputFormat || 'paragraph',
        tone: context.tone || 'professional',
        length: context.length || 'medium',
        includeRAG: context.includeRAG || false,
        additionalRequirements: `Please enhance this existing prompt: "${existingPrompt}"`
      };

      const response = await this.generatePrompt(enhancementRequest);
      return response.suggestions;
    } catch (error) {
      console.error('Error enhancing prompt:', error);
      throw new Error('Failed to enhance prompt. Please try again');
    }
  }

  /**
   * Get industry-specific templates and suggestions
   */
  getIndustryTemplates(industry: string): {
    commonUseCases: string[];
    recommendedTones: string[];
    typicalVariables: string[];
    bestPractices: string[];
  } {
    const templates: Record<string, any> = {
      'Healthcare': {
        commonUseCases: [
          'Patient communication',
          'Medical report generation',
          'Treatment plan summaries',
          'Insurance documentation',
          'Clinical decision support'
        ],
        recommendedTones: ['professional', 'formal', 'technical'],
        typicalVariables: [
          'patient_name',
          'diagnosis',
          'treatment_plan',
          'medication',
          'appointment_date',
          'doctor_name'
        ],
        bestPractices: [
          'Use clear, medical terminology',
          'Include patient privacy considerations',
          'Ensure accuracy and compliance',
          'Structure information logically'
        ]
      },
      'Finance': {
        commonUseCases: [
          'Financial analysis',
          'Investment recommendations',
          'Risk assessment',
          'Client communications',
          'Regulatory reporting'
        ],
        recommendedTones: ['professional', 'formal', 'technical'],
        typicalVariables: [
          'client_name',
          'portfolio_value',
          'risk_tolerance',
          'investment_goal',
          'time_horizon',
          'market_data'
        ],
        bestPractices: [
          'Include risk disclaimers',
          'Use precise financial terminology',
          'Ensure regulatory compliance',
          'Provide data-driven insights'
        ]
      },
      'Technology': {
        commonUseCases: [
          'Code documentation',
          'Technical specifications',
          'Bug reports',
          'API documentation',
          'User guides'
        ],
        recommendedTones: ['technical', 'professional', 'casual'],
        typicalVariables: [
          'feature_name',
          'code_snippet',
          'error_message',
          'version_number',
          'user_role',
          'system_requirements'
        ],
        bestPractices: [
          'Use clear technical language',
          'Include code examples',
          'Provide step-by-step instructions',
          'Consider different skill levels'
        ]
      },
      'Marketing': {
        commonUseCases: [
          'Content creation',
          'Campaign copy',
          'Social media posts',
          'Email marketing',
          'Product descriptions'
        ],
        recommendedTones: ['creative', 'friendly', 'casual', 'professional'],
        typicalVariables: [
          'brand_name',
          'product_name',
          'target_audience',
          'key_benefits',
          'call_to_action',
          'campaign_theme'
        ],
        bestPractices: [
          'Focus on benefits over features',
          'Use compelling language',
          'Include clear calls-to-action',
          'Match brand voice and tone'
        ]
      },
      'Education': {
        commonUseCases: [
          'Lesson planning',
          'Student feedback',
          'Assessment creation',
          'Educational content',
          'Learning objectives'
        ],
        recommendedTones: ['friendly', 'professional', 'casual'],
        typicalVariables: [
          'student_name',
          'subject',
          'grade_level',
          'learning_objective',
          'assessment_type',
          'topic'
        ],
        bestPractices: [
          'Use age-appropriate language',
          'Include clear learning outcomes',
          'Provide examples and context',
          'Encourage engagement'
        ]
      }
    };

    return templates[industry] || {
      commonUseCases: ['General purpose', 'Content generation', 'Analysis', 'Communication'],
      recommendedTones: ['professional', 'friendly'],
      typicalVariables: ['input', 'context', 'requirements'],
      bestPractices: [
        'Be clear and specific',
        'Use appropriate tone',
        'Include relevant context',
        'Test with sample inputs'
      ]
    };
  }

  /**
   * Validate prompt generation request
   */
  validateRequest(request: PromptGenerationRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.purpose?.trim()) {
      errors.push('Purpose is required');
    }

    if (!request.industry?.trim()) {
      errors.push('Industry is required');
    }

    if (!request.useCase?.trim()) {
      errors.push('Use case is required');
    }

    // Validate variables
    if (request.inputVariables) {
      request.inputVariables.forEach((variable, index) => {
        if (!variable.name?.trim()) {
          errors.push(`Variable ${index + 1}: Name is required`);
        }
        if (!variable.description?.trim()) {
          errors.push(`Variable ${index + 1}: Description is required`);
        }
        if (variable.name && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable.name)) {
          errors.push(`Variable ${index + 1}: Name must be a valid identifier (letters, numbers, underscore)`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get usage statistics for prompt generation
   */
  async getUsageStats(): Promise<{
    totalGenerated: number;
    averageQuality: number;
    mostUsedIndustry: string;
    recentGenerations: number;
  }> {
    // This would typically fetch from a backend service
    // For now, return mock data
    return {
      totalGenerated: 0,
      averageQuality: 0,
      mostUsedIndustry: 'General',
      recentGenerations: 0
    };
  }
}

// Export singleton instance
export const promptGenerationService = new PromptGenerationService();
