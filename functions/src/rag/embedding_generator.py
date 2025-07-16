"""
Embedding Generation Module for RAG Pipeline
Generates vector embeddings for text chunks using various embedding models
"""

import asyncio
import logging
import time
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

import numpy as np
import openai
from openai import AsyncOpenAI
import tiktoken

logger = logging.getLogger(__name__)

@dataclass
class EmbeddingConfig:
    """Configuration for embedding generation"""
    model: str = "text-embedding-3-small"
    batch_size: int = 100
    max_retries: int = 3
    retry_delay: float = 1.0
    rate_limit_delay: float = 0.1
    dimensions: Optional[int] = None  # For newer OpenAI models

class EmbeddingGenerator:
    """Generates embeddings for text chunks"""
    
    SUPPORTED_MODELS = {
        "text-embedding-3-small": {"max_tokens": 8191, "dimensions": 1536},
        "text-embedding-3-large": {"max_tokens": 8191, "dimensions": 3072},
        "text-embedding-ada-002": {"max_tokens": 8191, "dimensions": 1536}
    }
    
    def __init__(self, config: Optional[EmbeddingConfig] = None, api_key: Optional[str] = None):
        self.config = config or EmbeddingConfig()
        self.client = AsyncOpenAI(api_key=api_key)
        self.encoding = tiktoken.encoding_for_model("gpt-3.5-turbo")
        
        # Validate model
        if self.config.model not in self.SUPPORTED_MODELS:
            raise ValueError(f"Unsupported embedding model: {self.config.model}")
        
        self.model_info = self.SUPPORTED_MODELS[self.config.model]
    
    async def generate_embeddings(self, chunks: List[Dict]) -> List[Dict]:
        """
        Generate embeddings for a list of text chunks
        
        Args:
            chunks: List of chunk dictionaries with 'content' field
            
        Returns:
            List of chunks with added 'embedding' field
        """
        if not chunks:
            return []
        
        try:
            # Validate and prepare chunks
            valid_chunks = self._validate_chunks(chunks)
            if not valid_chunks:
                logger.warning("No valid chunks to process")
                return []
            
            # Process chunks in batches
            processed_chunks = []
            total_batches = (len(valid_chunks) + self.config.batch_size - 1) // self.config.batch_size
            
            for i in range(0, len(valid_chunks), self.config.batch_size):
                batch = valid_chunks[i:i + self.config.batch_size]
                batch_num = i // self.config.batch_size + 1
                
                logger.info(f"Processing embedding batch {batch_num}/{total_batches} ({len(batch)} chunks)")
                
                try:
                    batch_with_embeddings = await self._process_batch(batch)
                    processed_chunks.extend(batch_with_embeddings)
                    
                    # Rate limiting between batches
                    if i + self.config.batch_size < len(valid_chunks):
                        await asyncio.sleep(self.config.rate_limit_delay)
                        
                except Exception as e:
                    logger.error(f"Error processing batch {batch_num}: {str(e)}")
                    # Add chunks without embeddings to maintain order
                    for chunk in batch:
                        chunk['embedding'] = None
                        chunk['embedding_error'] = str(e)
                    processed_chunks.extend(batch)
            
            logger.info(f"Generated embeddings for {len([c for c in processed_chunks if c.get('embedding') is not None])}/{len(chunks)} chunks")
            return processed_chunks
            
        except Exception as e:
            logger.error(f"Error generating embeddings: {str(e)}")
            raise
    
    async def _process_batch(self, batch: List[Dict]) -> List[Dict]:
        """Process a batch of chunks to generate embeddings"""
        texts = [chunk['content'] for chunk in batch]
        
        # Generate embeddings with retry logic
        embeddings = await self._generate_embeddings_with_retry(texts)
        
        # Add embeddings to chunks
        for chunk, embedding in zip(batch, embeddings):
            if embedding is not None:
                chunk['embedding'] = embedding
                chunk['embedding_model'] = self.config.model
                chunk['embedding_dimensions'] = len(embedding)
            else:
                chunk['embedding'] = None
                chunk['embedding_error'] = "Failed to generate embedding"
        
        return batch
    
    async def _generate_embeddings_with_retry(self, texts: List[str]) -> List[Optional[List[float]]]:
        """Generate embeddings with retry logic"""
        for attempt in range(self.config.max_retries):
            try:
                response = await self.client.embeddings.create(
                    model=self.config.model,
                    input=texts,
                    dimensions=self.config.dimensions
                )
                
                embeddings = [data.embedding for data in response.data]
                return embeddings
                
            except openai.RateLimitError as e:
                wait_time = self.config.retry_delay * (2 ** attempt)
                logger.warning(f"Rate limit hit, waiting {wait_time}s before retry {attempt + 1}/{self.config.max_retries}")
                await asyncio.sleep(wait_time)
                
            except openai.APIError as e:
                if attempt == self.config.max_retries - 1:
                    logger.error(f"API error after {self.config.max_retries} attempts: {str(e)}")
                    return [None] * len(texts)
                
                wait_time = self.config.retry_delay * (2 ** attempt)
                logger.warning(f"API error, retrying in {wait_time}s: {str(e)}")
                await asyncio.sleep(wait_time)
                
            except Exception as e:
                logger.error(f"Unexpected error generating embeddings: {str(e)}")
                return [None] * len(texts)
        
        logger.error(f"Failed to generate embeddings after {self.config.max_retries} attempts")
        return [None] * len(texts)
    
    def _validate_chunks(self, chunks: List[Dict]) -> List[Dict]:
        """Validate chunks before processing"""
        valid_chunks = []
        max_tokens = self.model_info["max_tokens"]
        
        for chunk in chunks:
            if not chunk.get('content'):
                logger.warning(f"Skipping chunk {chunk.get('id', 'unknown')} - no content")
                continue
            
            content = chunk['content'].strip()
            if not content:
                logger.warning(f"Skipping chunk {chunk.get('id', 'unknown')} - empty content")
                continue
            
            # Check token count
            token_count = len(self.encoding.encode(content))
            if token_count > max_tokens:
                logger.warning(f"Chunk {chunk.get('id', 'unknown')} exceeds max tokens ({token_count} > {max_tokens})")
                # Truncate the content
                tokens = self.encoding.encode(content)[:max_tokens]
                chunk['content'] = self.encoding.decode(tokens)
                chunk['metadata'] = chunk.get('metadata', {})
                chunk['metadata']['truncated'] = True
                chunk['metadata']['original_token_count'] = token_count
            
            valid_chunks.append(chunk)
        
        return valid_chunks
    
    async def generate_query_embedding(self, query: str) -> Optional[List[float]]:
        """Generate embedding for a single query"""
        if not query or not query.strip():
            return None
        
        try:
            # Validate query length
            token_count = len(self.encoding.encode(query))
            max_tokens = self.model_info["max_tokens"]
            
            if token_count > max_tokens:
                logger.warning(f"Query exceeds max tokens ({token_count} > {max_tokens}), truncating")
                tokens = self.encoding.encode(query)[:max_tokens]
                query = self.encoding.decode(tokens)
            
            response = await self.client.embeddings.create(
                model=self.config.model,
                input=[query],
                dimensions=self.config.dimensions
            )
            
            return response.data[0].embedding
            
        except Exception as e:
            logger.error(f"Error generating query embedding: {str(e)}")
            return None
    
    def calculate_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """Calculate cosine similarity between two embeddings"""
        try:
            vec1 = np.array(embedding1)
            vec2 = np.array(embedding2)
            
            # Calculate cosine similarity
            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            similarity = dot_product / (norm1 * norm2)
            return float(similarity)
            
        except Exception as e:
            logger.error(f"Error calculating similarity: {str(e)}")
            return 0.0
    
    def get_embedding_stats(self, chunks: List[Dict]) -> Dict:
        """Get statistics about embeddings"""
        total_chunks = len(chunks)
        chunks_with_embeddings = len([c for c in chunks if c.get('embedding') is not None])
        chunks_with_errors = len([c for c in chunks if c.get('embedding_error')])
        
        embedding_dimensions = None
        if chunks_with_embeddings > 0:
            for chunk in chunks:
                if chunk.get('embedding'):
                    embedding_dimensions = len(chunk['embedding'])
                    break
        
        return {
            'total_chunks': total_chunks,
            'chunks_with_embeddings': chunks_with_embeddings,
            'chunks_with_errors': chunks_with_errors,
            'success_rate': chunks_with_embeddings / total_chunks if total_chunks > 0 else 0,
            'embedding_model': self.config.model,
            'embedding_dimensions': embedding_dimensions
        }
