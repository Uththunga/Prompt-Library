"""
OpenRouter.ai LLM Client for RAG Prompt Library
Handles LLM API calls using OpenRouter.ai with Llama models
"""

import asyncio
import json
import logging
import time
from typing import Dict, List, Optional, AsyncGenerator, Any
from dataclasses import dataclass
import aiohttp
import tiktoken

logger = logging.getLogger(__name__)

@dataclass
class OpenRouterConfig:
    """Configuration for OpenRouter API"""
    api_key: str
    base_url: str = "https://openrouter.ai/api/v1"
    model: str = "meta-llama/llama-3.2-11b-vision-instruct:free"
    max_tokens: int = 4000
    temperature: float = 0.7
    top_p: float = 1.0
    max_retries: int = 3
    retry_delay: float = 1.0
    timeout: int = 60

@dataclass
class LLMResponse:
    """Response from LLM API"""
    content: str
    model: str
    usage: Dict[str, int]
    finish_reason: str
    response_time: float
    cost_estimate: float

class OpenRouterClient:
    """Client for OpenRouter.ai LLM API"""
    
    # Model pricing (per 1M tokens) - approximate for cost estimation
    MODEL_PRICING = {
        "meta-llama/llama-3.2-11b-vision-instruct:free": {"input": 0.0, "output": 0.0},
        "meta-llama/llama-3.2-3b-instruct:free": {"input": 0.0, "output": 0.0},
        "meta-llama/llama-3.1-8b-instruct:free": {"input": 0.0, "output": 0.0},
        "google/gemma-2-9b-it:free": {"input": 0.0, "output": 0.0},
        "microsoft/phi-3-mini-128k-instruct:free": {"input": 0.0, "output": 0.0}
    }
    
    def __init__(self, config: OpenRouterConfig):
        self.config = config
        self.session = None
        
        # Initialize tokenizer for token counting
        try:
            self.tokenizer = tiktoken.encoding_for_model("gpt-3.5-turbo")  # Use as approximation
        except Exception:
            self.tokenizer = tiktoken.get_encoding("cl100k_base")
        
        # Validate model
        if config.model not in self.MODEL_PRICING:
            logger.warning(f"Model {config.model} not in pricing table, using default pricing")
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=self.config.timeout),
            headers={
                "Authorization": f"Bearer {self.config.api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://promptlibrary.dev",  # Optional: your site URL
                "X-Title": "RAG Prompt Library"  # Optional: app name
            }
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    async def generate_response(self, prompt: str, system_prompt: Optional[str] = None, 
                              stream: bool = False) -> LLMResponse:
        """
        Generate response from LLM
        
        Args:
            prompt: User prompt
            system_prompt: Optional system prompt
            stream: Whether to stream the response
            
        Returns:
            LLMResponse object with generated content and metadata
        """
        if not self.session:
            raise RuntimeError("Client not initialized. Use async context manager.")
        
        start_time = time.time()
        
        try:
            # Prepare messages
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            # Prepare request payload
            payload = {
                "model": self.config.model,
                "messages": messages,
                "max_tokens": self.config.max_tokens,
                "temperature": self.config.temperature,
                "top_p": self.config.top_p,
                "stream": stream
            }
            
            # Make API request with retry logic
            response_data = await self._make_request_with_retry(payload)
            
            # Process response
            if stream:
                # Handle streaming response (not implemented in this version)
                raise NotImplementedError("Streaming not implemented yet")
            else:
                return self._process_response(response_data, start_time)
                
        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            raise
    
    async def _make_request_with_retry(self, payload: Dict) -> Dict:
        """Make API request with retry logic"""
        last_exception = None
        
        for attempt in range(self.config.max_retries):
            try:
                async with self.session.post(
                    f"{self.config.base_url}/chat/completions",
                    json=payload
                ) as response:
                    
                    if response.status == 200:
                        return await response.json()
                    
                    elif response.status == 429:  # Rate limit
                        wait_time = self.config.retry_delay * (2 ** attempt)
                        logger.warning(f"Rate limited, waiting {wait_time}s (attempt {attempt + 1})")
                        await asyncio.sleep(wait_time)
                        continue
                    
                    elif response.status >= 500:  # Server error
                        wait_time = self.config.retry_delay * (2 ** attempt)
                        logger.warning(f"Server error {response.status}, retrying in {wait_time}s")
                        await asyncio.sleep(wait_time)
                        continue
                    
                    else:
                        # Client error - don't retry
                        error_text = await response.text()
                        raise Exception(f"API error {response.status}: {error_text}")
                        
            except aiohttp.ClientError as e:
                last_exception = e
                if attempt < self.config.max_retries - 1:
                    wait_time = self.config.retry_delay * (2 ** attempt)
                    logger.warning(f"Request failed, retrying in {wait_time}s: {str(e)}")
                    await asyncio.sleep(wait_time)
                    continue
                else:
                    break
        
        raise Exception(f"Failed after {self.config.max_retries} attempts: {str(last_exception)}")
    
    def _process_response(self, response_data: Dict, start_time: float) -> LLMResponse:
        """Process API response into LLMResponse object"""
        try:
            # Extract content
            choices = response_data.get("choices", [])
            if not choices:
                raise ValueError("No choices in response")
            
            choice = choices[0]
            content = choice.get("message", {}).get("content", "")
            finish_reason = choice.get("finish_reason", "unknown")
            
            # Extract usage information
            usage = response_data.get("usage", {})
            prompt_tokens = usage.get("prompt_tokens", 0)
            completion_tokens = usage.get("completion_tokens", 0)
            total_tokens = usage.get("total_tokens", prompt_tokens + completion_tokens)
            
            # Calculate response time
            response_time = time.time() - start_time
            
            # Estimate cost
            cost_estimate = self._calculate_cost(prompt_tokens, completion_tokens)
            
            return LLMResponse(
                content=content,
                model=self.config.model,
                usage={
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "total_tokens": total_tokens
                },
                finish_reason=finish_reason,
                response_time=response_time,
                cost_estimate=cost_estimate
            )
            
        except Exception as e:
            logger.error(f"Error processing response: {str(e)}")
            raise ValueError(f"Invalid response format: {str(e)}")
    
    def _calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        """Calculate estimated cost for the request"""
        pricing = self.MODEL_PRICING.get(self.config.model, {"input": 0.0, "output": 0.0})
        
        input_cost = (prompt_tokens / 1_000_000) * pricing["input"]
        output_cost = (completion_tokens / 1_000_000) * pricing["output"]
        
        return input_cost + output_cost
    
    def count_tokens(self, text: str) -> int:
        """Count tokens in text"""
        try:
            return len(self.tokenizer.encode(text))
        except Exception:
            # Fallback to word-based estimation
            return int(len(text.split()) * 1.3)
    
    async def generate_with_context(self, prompt: str, context: str, 
                                  system_prompt: Optional[str] = None) -> LLMResponse:
        """
        Generate response with RAG context
        
        Args:
            prompt: User prompt
            context: Retrieved context from RAG
            system_prompt: Optional system prompt
            
        Returns:
            LLMResponse with context-enhanced generation
        """
        # Create context-enhanced prompt
        if context.strip():
            enhanced_prompt = f"""Context Information:
{context}

Based on the above context, please respond to the following:
{prompt}

Please use the context information to provide a comprehensive and accurate response. If the context doesn't contain relevant information for the question, please indicate that."""
        else:
            enhanced_prompt = prompt
        
        return await self.generate_response(enhanced_prompt, system_prompt)
    
    async def validate_api_key(self) -> bool:
        """Validate API key by making a test request"""
        try:
            if not self.session:
                async with self:
                    return await self._test_api_connection()
            else:
                return await self._test_api_connection()
        except Exception as e:
            logger.error(f"API key validation failed: {str(e)}")
            return False
    
    async def _test_api_connection(self) -> bool:
        """Test API connection with minimal request"""
        try:
            payload = {
                "model": self.config.model,
                "messages": [{"role": "user", "content": "Hello"}],
                "max_tokens": 10
            }
            
            async with self.session.post(
                f"{self.config.base_url}/chat/completions",
                json=payload
            ) as response:
                return response.status == 200
                
        except Exception:
            return False
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the current model"""
        return {
            "model": self.config.model,
            "max_tokens": self.config.max_tokens,
            "temperature": self.config.temperature,
            "top_p": self.config.top_p,
            "pricing": self.MODEL_PRICING.get(self.config.model, {"input": 0.0, "output": 0.0}),
            "is_free": self.config.model.endswith(":free")
        }
