"""
Token Counting Utilities for LLM Integration
Provides accurate token counting for various models and use cases
"""

import logging
from typing import Dict, List, Optional, Union
import tiktoken

logger = logging.getLogger(__name__)

class TokenCounter:
    """Utility class for counting tokens across different models"""
    
    # Model to encoding mapping
    MODEL_ENCODINGS = {
        # OpenRouter Llama models (use GPT-3.5 as approximation)
        "meta-llama/llama-3.2-11b-vision-instruct:free": "cl100k_base",
        "meta-llama/llama-3.2-3b-instruct:free": "cl100k_base",
        "meta-llama/llama-3.1-8b-instruct:free": "cl100k_base",
        "google/gemma-2-9b-it:free": "cl100k_base",
        "microsoft/phi-3-mini-128k-instruct:free": "cl100k_base",
        
        # OpenAI models (for reference)
        "gpt-3.5-turbo": "cl100k_base",
        "gpt-4": "cl100k_base",
        "gpt-4-turbo": "cl100k_base",
        "text-embedding-3-small": "cl100k_base",
        "text-embedding-3-large": "cl100k_base",
        "text-embedding-ada-002": "cl100k_base"
    }
    
    # Token multipliers for different model families (approximation)
    MODEL_MULTIPLIERS = {
        "meta-llama": 1.2,  # Llama models tend to use slightly more tokens
        "google/gemma": 1.1,
        "microsoft/phi": 1.0,
        "default": 1.0
    }
    
    def __init__(self, model: str = "meta-llama/llama-3.2-11b-vision-instruct:free"):
        self.model = model
        self.encoding_name = self.MODEL_ENCODINGS.get(model, "cl100k_base")
        self.multiplier = self._get_model_multiplier(model)
        
        try:
            self.encoding = tiktoken.get_encoding(self.encoding_name)
        except Exception as e:
            logger.warning(f"Failed to load encoding {self.encoding_name}: {e}")
            self.encoding = tiktoken.get_encoding("cl100k_base")
    
    def _get_model_multiplier(self, model: str) -> float:
        """Get token count multiplier for model family"""
        for family, multiplier in self.MODEL_MULTIPLIERS.items():
            if family in model:
                return multiplier
        return self.MODEL_MULTIPLIERS["default"]
    
    def count_tokens(self, text: str) -> int:
        """
        Count tokens in text for the current model
        
        Args:
            text: Text to count tokens for
            
        Returns:
            Estimated token count
        """
        if not text:
            return 0
        
        try:
            base_count = len(self.encoding.encode(text))
            return int(base_count * self.multiplier)
        except Exception as e:
            logger.warning(f"Token encoding failed, using fallback: {e}")
            return self._fallback_token_count(text)
    
    def count_message_tokens(self, messages: List[Dict[str, str]]) -> int:
        """
        Count tokens for a list of messages (chat format)
        
        Args:
            messages: List of message dictionaries with 'role' and 'content'
            
        Returns:
            Total token count including message formatting overhead
        """
        total_tokens = 0
        
        for message in messages:
            # Count content tokens
            content = message.get('content', '')
            role = message.get('role', 'user')
            
            content_tokens = self.count_tokens(content)
            
            # Add overhead for message formatting
            # This is an approximation based on OpenAI's format
            overhead_tokens = 4  # Base overhead per message
            if role == 'system':
                overhead_tokens += 2
            elif role == 'assistant':
                overhead_tokens += 1
            
            total_tokens += content_tokens + overhead_tokens
        
        # Add conversation overhead
        total_tokens += 2
        
        return total_tokens
    
    def count_prompt_with_context_tokens(self, prompt: str, context: str, 
                                       system_prompt: Optional[str] = None) -> Dict[str, int]:
        """
        Count tokens for RAG-enhanced prompt
        
        Args:
            prompt: User prompt
            context: Retrieved context
            system_prompt: Optional system prompt
            
        Returns:
            Dictionary with token counts for each component
        """
        counts = {
            'prompt_tokens': self.count_tokens(prompt),
            'context_tokens': self.count_tokens(context),
            'system_tokens': self.count_tokens(system_prompt) if system_prompt else 0
        }
        
        # Create messages to get accurate total
        messages = []
        if system_prompt:
            messages.append({'role': 'system', 'content': system_prompt})
        
        # Enhanced prompt with context
        if context.strip():
            enhanced_prompt = f"""Context Information:
{context}

Based on the above context, please respond to the following:
{prompt}

Please use the context information to provide a comprehensive and accurate response. If the context doesn't contain relevant information for the question, please indicate that."""
        else:
            enhanced_prompt = prompt
        
        messages.append({'role': 'user', 'content': enhanced_prompt})
        
        counts['total_input_tokens'] = self.count_message_tokens(messages)
        counts['enhancement_overhead'] = counts['total_input_tokens'] - counts['prompt_tokens'] - counts['context_tokens'] - counts['system_tokens']
        
        return counts
    
    def _fallback_token_count(self, text: str) -> int:
        """Fallback token counting method"""
        # Simple word-based estimation
        words = text.split()
        # Rough approximation: 1 token ≈ 0.75 words for English
        return int(len(words) * 1.33 * self.multiplier)
    
    def estimate_response_tokens(self, max_tokens: int, prompt_tokens: int) -> int:
        """
        Estimate likely response token count
        
        Args:
            max_tokens: Maximum tokens allowed for response
            prompt_tokens: Tokens used in prompt
            
        Returns:
            Estimated response token count
        """
        # Most responses use 20-80% of available tokens
        available_tokens = max_tokens
        
        # Conservative estimate: 50% of max tokens
        estimated_tokens = min(available_tokens // 2, 1000)
        
        return max(estimated_tokens, 10)  # Minimum 10 tokens
    
    def validate_token_limits(self, text: str, max_tokens: int) -> Dict[str, Union[bool, int]]:
        """
        Validate text against token limits
        
        Args:
            text: Text to validate
            max_tokens: Maximum allowed tokens
            
        Returns:
            Validation result with token count and status
        """
        token_count = self.count_tokens(text)
        
        return {
            'valid': token_count <= max_tokens,
            'token_count': token_count,
            'max_tokens': max_tokens,
            'excess_tokens': max(0, token_count - max_tokens),
            'utilization': token_count / max_tokens if max_tokens > 0 else 0
        }
    
    def truncate_to_token_limit(self, text: str, max_tokens: int, 
                               preserve_end: bool = False) -> str:
        """
        Truncate text to fit within token limit
        
        Args:
            text: Text to truncate
            max_tokens: Maximum allowed tokens
            preserve_end: If True, preserve end of text instead of beginning
            
        Returns:
            Truncated text
        """
        if not text:
            return text
        
        current_tokens = self.count_tokens(text)
        if current_tokens <= max_tokens:
            return text
        
        try:
            tokens = self.encoding.encode(text)
            
            if preserve_end:
                # Keep the end of the text
                truncated_tokens = tokens[-max_tokens:]
            else:
                # Keep the beginning of the text
                truncated_tokens = tokens[:max_tokens]
            
            return self.encoding.decode(truncated_tokens)
            
        except Exception as e:
            logger.warning(f"Token truncation failed, using character-based fallback: {e}")
            return self._fallback_truncate(text, max_tokens, preserve_end)
    
    def _fallback_truncate(self, text: str, max_tokens: int, preserve_end: bool = False) -> str:
        """Fallback text truncation method"""
        # Rough character-to-token ratio
        chars_per_token = len(text) / max(self.count_tokens(text), 1)
        max_chars = int(max_tokens * chars_per_token * 0.9)  # 90% safety margin
        
        if preserve_end:
            return text[-max_chars:] if len(text) > max_chars else text
        else:
            return text[:max_chars] if len(text) > max_chars else text
    
    def get_model_info(self) -> Dict[str, Union[str, float, int]]:
        """Get information about the current model configuration"""
        return {
            'model': self.model,
            'encoding': self.encoding_name,
            'multiplier': self.multiplier,
            'model_family': next((family for family in self.MODEL_MULTIPLIERS.keys() 
                                if family in self.model), 'default')
        }
    
    def calculate_cost_estimate(self, prompt_tokens: int, completion_tokens: int, 
                              input_price_per_1m: float = 0.0, 
                              output_price_per_1m: float = 0.0) -> Dict[str, float]:
        """
        Calculate cost estimate for token usage
        
        Args:
            prompt_tokens: Input tokens used
            completion_tokens: Output tokens generated
            input_price_per_1m: Price per 1M input tokens
            output_price_per_1m: Price per 1M output tokens
            
        Returns:
            Cost breakdown dictionary
        """
        input_cost = (prompt_tokens / 1_000_000) * input_price_per_1m
        output_cost = (completion_tokens / 1_000_000) * output_price_per_1m
        total_cost = input_cost + output_cost
        
        return {
            'input_cost': input_cost,
            'output_cost': output_cost,
            'total_cost': total_cost,
            'input_tokens': prompt_tokens,
            'output_tokens': completion_tokens,
            'total_tokens': prompt_tokens + completion_tokens
        }
