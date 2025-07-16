"""
Context Retrieval Module for RAG Pipeline
Retrieves relevant document chunks and formats context for prompt execution
"""

import logging
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

from firebase_admin import firestore
from .vector_store import FAISSVectorStore
from .embedding_generator import EmbeddingGenerator

logger = logging.getLogger(__name__)

@dataclass
class RetrievalConfig:
    """Configuration for context retrieval"""
    top_k: int = 5
    similarity_threshold: float = 0.7
    max_context_length: int = 4000
    include_metadata: bool = True
    rerank_results: bool = True

class ContextRetriever:
    """Retrieves and formats context for RAG-enhanced prompt execution"""
    
    def __init__(self, embedding_generator: EmbeddingGenerator, config: Optional[RetrievalConfig] = None):
        self.embedding_generator = embedding_generator
        self.config = config or RetrievalConfig()
        self.db = firestore.client()
    
    async def retrieve_context(self, user_id: str, query: str, document_ids: Optional[List[str]] = None) -> Dict:
        """
        Retrieve relevant context for a query
        
        Args:
            user_id: User ID for accessing their vector store
            query: Search query
            document_ids: Optional list of specific document IDs to search within
            
        Returns:
            Dict containing retrieved context and metadata
        """
        try:
            # Generate query embedding
            query_embedding = await self.embedding_generator.generate_query_embedding(query)
            if not query_embedding:
                logger.error("Failed to generate query embedding")
                return self._empty_context_response()
            
            # Initialize vector store
            vector_store = FAISSVectorStore(user_id)
            if not await vector_store.initialize_index():
                logger.warning(f"No vector index found for user {user_id}")
                return self._empty_context_response()
            
            # Search for similar chunks
            search_results = await vector_store.search(
                query_embedding,
                k=self.config.top_k,
                score_threshold=self.config.similarity_threshold
            )
            
            if not search_results:
                logger.info("No relevant chunks found")
                return self._empty_context_response()
            
            # Filter by document IDs if specified
            if document_ids:
                search_results = [
                    result for result in search_results 
                    if result['document_id'] in document_ids
                ]
            
            # Retrieve full chunk content from Firestore
            enriched_chunks = await self._enrich_chunks_with_content(search_results)
            
            # Rerank results if enabled
            if self.config.rerank_results:
                enriched_chunks = await self._rerank_chunks(query, enriched_chunks)
            
            # Format context
            formatted_context = self._format_context(enriched_chunks)
            
            return {
                'context': formatted_context,
                'chunks': enriched_chunks,
                'metadata': {
                    'query': query,
                    'total_chunks_found': len(search_results),
                    'chunks_used': len(enriched_chunks),
                    'context_length': len(formatted_context),
                    'similarity_scores': [chunk['similarity_score'] for chunk in enriched_chunks],
                    'document_sources': list(set(chunk['document_id'] for chunk in enriched_chunks))
                }
            }
            
        except Exception as e:
            logger.error(f"Error retrieving context: {str(e)}")
            return self._empty_context_response()
    
    async def _enrich_chunks_with_content(self, search_results: List[Dict]) -> List[Dict]:
        """Retrieve full content for chunks from Firestore"""
        enriched_chunks = []
        
        for result in search_results:
            try:
                # Get full chunk content from Firestore
                doc_ref = self.db.collection('rag_documents').document(result['document_id'])
                chunk_ref = doc_ref.collection('chunks').document(result['chunk_id'])
                chunk_doc = chunk_ref.get()
                
                if chunk_doc.exists:
                    chunk_data = chunk_doc.to_dict()
                    enriched_chunk = {
                        **result,
                        'content': chunk_data.get('content', result['content_preview']),
                        'full_metadata': chunk_data.get('metadata', {}),
                        'created_at': chunk_data.get('createdAt')
                    }
                    enriched_chunks.append(enriched_chunk)
                else:
                    logger.warning(f"Chunk {result['chunk_id']} not found in Firestore")
                    # Use preview content as fallback
                    enriched_chunks.append({
                        **result,
                        'content': result['content_preview'],
                        'full_metadata': result.get('metadata', {}),
                        'created_at': None
                    })
                    
            except Exception as e:
                logger.error(f"Error enriching chunk {result['chunk_id']}: {str(e)}")
                continue
        
        return enriched_chunks
    
    async def _rerank_chunks(self, query: str, chunks: List[Dict]) -> List[Dict]:
        """Rerank chunks based on additional relevance criteria"""
        # Simple reranking based on content length and keyword matching
        # In production, you might use a more sophisticated reranking model
        
        query_words = set(query.lower().split())
        
        for chunk in chunks:
            content_words = set(chunk['content'].lower().split())
            keyword_overlap = len(query_words.intersection(content_words))
            
            # Combine similarity score with keyword overlap
            chunk['rerank_score'] = (
                chunk['similarity_score'] * 0.7 + 
                (keyword_overlap / max(len(query_words), 1)) * 0.3
            )
        
        # Sort by rerank score
        chunks.sort(key=lambda x: x['rerank_score'], reverse=True)
        return chunks
    
    def _format_context(self, chunks: List[Dict]) -> str:
        """Format retrieved chunks into context string"""
        if not chunks:
            return ""
        
        context_parts = []
        current_length = 0
        
        for i, chunk in enumerate(chunks):
            content = chunk['content']
            
            # Check if adding this chunk would exceed max context length
            if current_length + len(content) > self.config.max_context_length:
                # Try to fit a truncated version
                remaining_space = self.config.max_context_length - current_length
                if remaining_space > 100:  # Only if we have reasonable space left
                    content = content[:remaining_space - 3] + "..."
                else:
                    break
            
            # Format chunk with metadata if enabled
            if self.config.include_metadata:
                metadata = chunk.get('full_metadata', {})
                source_info = []
                
                if metadata.get('page_number'):
                    source_info.append(f"Page {metadata['page_number']}")
                
                if metadata.get('section_title'):
                    source_info.append(f"Section: {metadata['section_title']}")
                
                source_str = f" ({', '.join(source_info)})" if source_info else ""
                
                context_part = f"[Source {i+1}{source_str}]\n{content}\n"
            else:
                context_part = f"{content}\n\n"
            
            context_parts.append(context_part)
            current_length += len(context_part)
        
        return "\n".join(context_parts).strip()
    
    def _empty_context_response(self) -> Dict:
        """Return empty context response"""
        return {
            'context': "",
            'chunks': [],
            'metadata': {
                'query': "",
                'total_chunks_found': 0,
                'chunks_used': 0,
                'context_length': 0,
                'similarity_scores': [],
                'document_sources': []
            }
        }
    
    async def get_document_chunks(self, user_id: str, document_id: str) -> List[Dict]:
        """Get all chunks for a specific document"""
        try:
            doc_ref = self.db.collection('rag_documents').document(document_id)
            chunks_ref = doc_ref.collection('chunks')
            chunks_docs = chunks_ref.get()
            
            chunks = []
            for chunk_doc in chunks_docs:
                chunk_data = chunk_doc.to_dict()
                chunks.append({
                    'chunk_id': chunk_doc.id,
                    'document_id': document_id,
                    'content': chunk_data.get('content', ''),
                    'metadata': chunk_data.get('metadata', {}),
                    'created_at': chunk_data.get('createdAt')
                })
            
            return chunks
            
        except Exception as e:
            logger.error(f"Error getting document chunks: {str(e)}")
            return []
    
    async def search_within_documents(self, user_id: str, query: str, document_ids: List[str]) -> Dict:
        """Search for context within specific documents only"""
        return await self.retrieve_context(user_id, query, document_ids)
    
    def get_context_stats(self, context_response: Dict) -> Dict:
        """Get statistics about retrieved context"""
        metadata = context_response.get('metadata', {})
        chunks = context_response.get('chunks', [])
        
        return {
            'context_length': metadata.get('context_length', 0),
            'chunks_used': metadata.get('chunks_used', 0),
            'total_chunks_found': metadata.get('total_chunks_found', 0),
            'avg_similarity_score': sum(metadata.get('similarity_scores', [])) / len(metadata.get('similarity_scores', [])) if metadata.get('similarity_scores') else 0,
            'unique_documents': len(metadata.get('document_sources', [])),
            'document_sources': metadata.get('document_sources', []),
            'chunk_lengths': [len(chunk['content']) for chunk in chunks],
            'retrieval_efficiency': metadata.get('chunks_used', 0) / max(metadata.get('total_chunks_found', 1), 1)
        }
