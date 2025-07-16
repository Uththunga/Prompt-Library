import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PromptGenerationService } from '../promptGenerationService';
import type { PromptGenerationRequest } from '../../types';

// Mock Firebase functions
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => vi.fn())
}));

vi.mock('../../config/firebase', () => ({
  functions: {}
}));

describe('PromptGenerationService', () => {
  let service: PromptGenerationService;
  let mockGenerateFunction: any;

  beforeEach(() => {
    mockGenerateFunction = vi.fn();
    vi.mocked(require('firebase/functions').httpsCallable).mockReturnValue(mockGenerateFunction);
    service = new PromptGenerationService();
  });

  describe('generatePrompt', () => {
    const validRequest: PromptGenerationRequest = {
      purpose: 'Generate customer support responses',
      industry: 'Technology',
      useCase: 'Customer Support',
      targetAudience: 'Technical users',
      inputVariables: [
        {
          name: 'customer_name',
          description: 'Name of the customer',
          type: 'string',
          required: true,
          example: 'John Smith'
        }
      ],
      outputFormat: 'paragraph',
      tone: 'professional',
      length: 'medium',
      includeRAG: false,
      additionalRequirements: 'Include empathy and solution focus'
    };

    it('should generate a prompt successfully', async () => {
      const mockResponse = {
        data: {
          generatedPrompt: 'You are a helpful customer support agent...',
          title: 'Customer Support Response Generator',
          description: 'Generates empathetic customer support responses',
          category: 'Technology',
          tags: ['customer-support', 'technology'],
          variables: [
            {
              name: 'customer_name',
              type: 'string',
              description: 'Name of the customer',
              required: true
            }
          ],
          qualityScore: {
            overall: 85,
            structure: 80,
            clarity: 90,
            variables: 85,
            ragCompatibility: 70,
            suggestions: []
          },
          suggestions: [],
          metadata: {
            model: 'gpt-4',
            tokensUsed: 150,
            generationTime: 2.5,
            confidence: 0.85
          }
        }
      };

      mockGenerateFunction.mockResolvedValue(mockResponse);

      const result = await service.generatePrompt(validRequest);

      expect(result).toEqual(mockResponse.data);
      expect(mockGenerateFunction).toHaveBeenCalledWith(validRequest);
    });

    it('should handle missing generated prompt', async () => {
      const mockResponse = {
        data: {
          title: 'Test Prompt',
          description: 'Test description'
          // Missing generatedPrompt
        }
      };

      mockGenerateFunction.mockResolvedValue(mockResponse);

      await expect(service.generatePrompt(validRequest))
        .rejects.toThrow('No prompt was generated');
    });

    it('should handle invalid response format', async () => {
      mockGenerateFunction.mockResolvedValue({ data: null });

      await expect(service.generatePrompt(validRequest))
        .rejects.toThrow('Invalid response format from prompt generation service');
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Authentication failed');
      (authError as any).code = 'unauthenticated';
      mockGenerateFunction.mockRejectedValue(authError);

      await expect(service.generatePrompt(validRequest))
        .rejects.toThrow('Please sign in to generate prompts');
    });

    it('should handle permission errors', async () => {
      const permissionError = new Error('Permission denied');
      (permissionError as any).code = 'permission-denied';
      mockGenerateFunction.mockRejectedValue(permissionError);

      await expect(service.generatePrompt(validRequest))
        .rejects.toThrow('You do not have permission to generate prompts');
    });

    it('should handle service unavailable errors', async () => {
      const unavailableError = new Error('Service unavailable');
      (unavailableError as any).code = 'unavailable';
      mockGenerateFunction.mockRejectedValue(unavailableError);

      await expect(service.generatePrompt(validRequest))
        .rejects.toThrow('Prompt generation service is temporarily unavailable');
    });

    it('should handle quota exceeded errors', async () => {
      const quotaError = new Error('Quota exceeded for this request');
      mockGenerateFunction.mockRejectedValue(quotaError);

      await expect(service.generatePrompt(validRequest))
        .rejects.toThrow('API quota exceeded. Please try again later');
    });

    it('should provide default values for missing optional fields', async () => {
      const mockResponse = {
        data: {
          generatedPrompt: 'Test prompt content',
          // Missing optional fields
        }
      };

      mockGenerateFunction.mockResolvedValue(mockResponse);

      const result = await service.generatePrompt(validRequest);

      expect(result.title).toBe('Generated Prompt');
      expect(result.description).toBe('AI-generated prompt');
      expect(result.category).toBe('General');
      expect(result.tags).toEqual([]);
      expect(result.variables).toEqual([]);
      expect(result.suggestions).toEqual([]);
      expect(result.qualityScore).toEqual({
        overall: 70,
        structure: 70,
        clarity: 70,
        variables: 70,
        ragCompatibility: 70,
        suggestions: []
      });
    });
  });

  describe('validateRequest', () => {
    it('should validate a valid request', () => {
      const validRequest: PromptGenerationRequest = {
        purpose: 'Test purpose',
        industry: 'Technology',
        useCase: 'Testing',
        inputVariables: [
          {
            name: 'test_var',
            description: 'Test variable',
            type: 'string',
            required: true
          }
        ],
        outputFormat: 'paragraph',
        tone: 'professional',
        length: 'medium'
      };

      const result = service.validateRequest(validRequest);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject request with missing purpose', () => {
      const invalidRequest = {
        purpose: '',
        industry: 'Technology',
        useCase: 'Testing'
      } as PromptGenerationRequest;

      const result = service.validateRequest(invalidRequest);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Purpose is required');
    });

    it('should reject request with missing industry', () => {
      const invalidRequest = {
        purpose: 'Test purpose',
        industry: '',
        useCase: 'Testing'
      } as PromptGenerationRequest;

      const result = service.validateRequest(invalidRequest);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Industry is required');
    });

    it('should reject request with missing use case', () => {
      const invalidRequest = {
        purpose: 'Test purpose',
        industry: 'Technology',
        useCase: ''
      } as PromptGenerationRequest;

      const result = service.validateRequest(invalidRequest);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Use case is required');
    });

    it('should validate variable names', () => {
      const invalidRequest = {
        purpose: 'Test purpose',
        industry: 'Technology',
        useCase: 'Testing',
        inputVariables: [
          {
            name: '123invalid',
            description: 'Invalid variable name',
            type: 'string',
            required: true
          },
          {
            name: 'valid_name',
            description: '',
            type: 'string',
            required: true
          }
        ]
      } as PromptGenerationRequest;

      const result = service.validateRequest(invalidRequest);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Variable 1: Name must be a valid identifier (letters, numbers, underscore)');
      expect(result.errors).toContain('Variable 2: Description is required');
    });
  });

  describe('getIndustryTemplates', () => {
    it('should return healthcare templates', () => {
      const templates = service.getIndustryTemplates('Healthcare');

      expect(templates.commonUseCases).toContain('Patient communication');
      expect(templates.recommendedTones).toContain('professional');
      expect(templates.typicalVariables).toContain('patient_name');
      expect(templates.bestPractices).toContain('Use clear, medical terminology');
    });

    it('should return technology templates', () => {
      const templates = service.getIndustryTemplates('Technology');

      expect(templates.commonUseCases).toContain('Code documentation');
      expect(templates.recommendedTones).toContain('technical');
      expect(templates.typicalVariables).toContain('feature_name');
      expect(templates.bestPractices).toContain('Use clear technical language');
    });

    it('should return default templates for unknown industry', () => {
      const templates = service.getIndustryTemplates('Unknown Industry');

      expect(templates.commonUseCases).toContain('General purpose');
      expect(templates.recommendedTones).toContain('professional');
      expect(templates.typicalVariables).toContain('input');
      expect(templates.bestPractices).toContain('Be clear and specific');
    });
  });

  describe('enhancePrompt', () => {
    it('should enhance an existing prompt', async () => {
      const existingPrompt = 'You are a helpful assistant.';
      const context = {
        purpose: 'Customer support',
        industry: 'Technology'
      };

      const mockResponse = {
        data: {
          generatedPrompt: 'Enhanced prompt content',
          suggestions: [
            {
              id: 'suggestion-1',
              type: 'clarity',
              title: 'Improve clarity',
              description: 'Add more specific instructions',
              impact: 'medium',
              category: 'Clarity',
              autoApplicable: false
            }
          ]
        }
      };

      mockGenerateFunction.mockResolvedValue(mockResponse);

      const result = await service.enhancePrompt(existingPrompt, context);

      expect(result).toEqual(mockResponse.data.suggestions);
      expect(mockGenerateFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          purpose: 'Customer support',
          industry: 'Technology',
          additionalRequirements: expect.stringContaining(existingPrompt)
        })
      );
    });

    it('should handle enhancement errors', async () => {
      const existingPrompt = 'Test prompt';
      const context = {};

      mockGenerateFunction.mockRejectedValue(new Error('Enhancement failed'));

      await expect(service.enhancePrompt(existingPrompt, context))
        .rejects.toThrow('Failed to enhance prompt. Please try again');
    });
  });
});
