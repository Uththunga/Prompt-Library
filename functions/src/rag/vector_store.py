"""
Vector Store Module for RAG Pipeline
Handles FAISS vector database operations for document embeddings
"""

import io
import json
import logging
import pickle
from typing import Dict, List, Optional, Tuple
import tempfile
import os

import faiss
import numpy as np
from firebase_admin import storage
from google.cloud.exceptions import NotFound

logger = logging.getLogger(__name__)

class FAISSVectorStore:
    """FAISS-based vector store for document embeddings"""
    
    def __init__(self, user_id: str, embedding_dimension: int = 1536):
        self.user_id = user_id
        self.embedding_dimension = embedding_dimension
        self.index_path = f"vector_indices/{user_id}/faiss_index"
        self.metadata_path = f"vector_indices/{user_id}/metadata.json"
        
        # Initialize FAISS index
        self.index = None
        self.metadata = {}
        self.bucket = storage.bucket()
        
    async def initialize_index(self) -> bool:
        """Initialize or load existing FAISS index"""
        try:
            # Try to load existing index
            if await self._load_index():
                logger.info(f"Loaded existing FAISS index for user {self.user_id}")
                return True
            
            # Create new index if none exists
            self._create_new_index()
            logger.info(f"Created new FAISS index for user {self.user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error initializing FAISS index: {str(e)}")
            return False
    
    def _create_new_index(self):
        """Create a new FAISS index"""
        # Use IndexFlatIP for cosine similarity (after L2 normalization)
        self.index = faiss.IndexFlatIP(self.embedding_dimension)
        self.metadata = {
            'dimension': self.embedding_dimension,
            'total_vectors': 0,
            'document_chunks': {}
        }
    
    async def _load_index(self) -> bool:
        """Load existing FAISS index from Cloud Storage"""
        try:
            # Load index file
            index_blob = self.bucket.blob(f"{self.index_path}.index")
            if not index_blob.exists():
                return False
            
            # Load metadata file
            metadata_blob = self.bucket.blob(self.metadata_path)
            if not metadata_blob.exists():
                return False
            
            # Download and load index
            with tempfile.NamedTemporaryFile() as temp_file:
                index_blob.download_to_filename(temp_file.name)
                self.index = faiss.read_index(temp_file.name)
            
            # Download and load metadata
            metadata_content = metadata_blob.download_as_text()
            self.metadata = json.loads(metadata_content)
            
            return True
            
        except Exception as e:
            logger.error(f"Error loading FAISS index: {str(e)}")
            return False
    
    async def _save_index(self):
        """Save FAISS index to Cloud Storage"""
        try:
            # Save index file
            with tempfile.NamedTemporaryFile() as temp_file:
                faiss.write_index(self.index, temp_file.name)
                
                index_blob = self.bucket.blob(f"{self.index_path}.index")
                index_blob.upload_from_filename(temp_file.name)
            
            # Save metadata file
            metadata_blob = self.bucket.blob(self.metadata_path)
            metadata_blob.upload_from_string(
                json.dumps(self.metadata, indent=2),
                content_type='application/json'
            )
            
            logger.info(f"Saved FAISS index for user {self.user_id}")
            
        except Exception as e:
            logger.error(f"Error saving FAISS index: {str(e)}")
            raise
    
    async def add_chunks(self, chunks: List[Dict]) -> bool:
        """Add document chunks to the vector store"""
        if not self.index:
            await self.initialize_index()
        
        try:
            embeddings = []
            chunk_metadata = []
            
            for chunk in chunks:
                embedding = chunk.get('embedding')
                if embedding is None:
                    logger.warning(f"Skipping chunk {chunk.get('id')} - no embedding")
                    continue
                
                embeddings.append(embedding)
                chunk_metadata.append({
                    'chunk_id': chunk['id'],
                    'document_id': chunk['document_id'],
                    'content': chunk['content'],
                    'metadata': chunk.get('metadata', {})
                })
            
            if not embeddings:
                logger.warning("No valid embeddings to add")
                return False
            
            # Convert to numpy array and normalize for cosine similarity
            embeddings_array = np.array(embeddings, dtype=np.float32)
            faiss.normalize_L2(embeddings_array)
            
            # Add to index
            start_id = self.index.ntotal
            self.index.add(embeddings_array)
            
            # Update metadata
            for i, chunk_meta in enumerate(chunk_metadata):
                vector_id = start_id + i
                document_id = chunk_meta['document_id']
                
                if document_id not in self.metadata['document_chunks']:
                    self.metadata['document_chunks'][document_id] = []
                
                self.metadata['document_chunks'][document_id].append({
                    'vector_id': vector_id,
                    'chunk_id': chunk_meta['chunk_id'],
                    'content_preview': chunk_meta['content'][:200] + '...' if len(chunk_meta['content']) > 200 else chunk_meta['content'],
                    'metadata': chunk_meta['metadata']
                })
            
            self.metadata['total_vectors'] = self.index.ntotal
            
            # Save updated index
            await self._save_index()
            
            logger.info(f"Added {len(embeddings)} chunks to vector store")
            return True
            
        except Exception as e:
            logger.error(f"Error adding chunks to vector store: {str(e)}")
            return False
    
    async def search(self, query_embedding: List[float], k: int = 5, score_threshold: float = 0.0) -> List[Dict]:
        """Search for similar chunks using query embedding"""
        if not self.index or self.index.ntotal == 0:
            return []
        
        try:
            # Normalize query embedding
            query_array = np.array([query_embedding], dtype=np.float32)
            faiss.normalize_L2(query_array)
            
            # Search
            scores, indices = self.index.search(query_array, min(k, self.index.ntotal))
            
            results = []
            for score, idx in zip(scores[0], indices[0]):
                if idx == -1 or score < score_threshold:
                    continue
                
                # Find chunk metadata
                chunk_info = self._get_chunk_by_vector_id(int(idx))
                if chunk_info:
                    results.append({
                        'chunk_id': chunk_info['chunk_id'],
                        'document_id': chunk_info['document_id'],
                        'content_preview': chunk_info['content_preview'],
                        'metadata': chunk_info['metadata'],
                        'similarity_score': float(score),
                        'vector_id': int(idx)
                    })
            
            return results
            
        except Exception as e:
            logger.error(f"Error searching vector store: {str(e)}")
            return []
    
    def _get_chunk_by_vector_id(self, vector_id: int) -> Optional[Dict]:
        """Get chunk information by vector ID"""
        for document_id, chunks in self.metadata['document_chunks'].items():
            for chunk in chunks:
                if chunk['vector_id'] == vector_id:
                    return {
                        'chunk_id': chunk['chunk_id'],
                        'document_id': document_id,
                        'content_preview': chunk['content_preview'],
                        'metadata': chunk['metadata']
                    }
        return None
    
    async def remove_document(self, document_id: str) -> bool:
        """Remove all chunks for a document from the vector store"""
        if not self.index or document_id not in self.metadata['document_chunks']:
            return True
        
        try:
            # Get vector IDs to remove
            chunks_to_remove = self.metadata['document_chunks'][document_id]
            vector_ids = [chunk['vector_id'] for chunk in chunks_to_remove]
            
            # FAISS doesn't support direct removal, so we need to rebuild the index
            # This is a limitation we'll need to address in production
            logger.warning(f"Document removal requires index rebuild - not implemented yet")
            
            # For now, just remove from metadata
            del self.metadata['document_chunks'][document_id]
            await self._save_index()
            
            return True
            
        except Exception as e:
            logger.error(f"Error removing document from vector store: {str(e)}")
            return False
    
    def get_stats(self) -> Dict:
        """Get vector store statistics"""
        if not self.index:
            return {
                'total_vectors': 0,
                'total_documents': 0,
                'dimension': self.embedding_dimension,
                'index_type': 'None'
            }
        
        return {
            'total_vectors': self.index.ntotal,
            'total_documents': len(self.metadata['document_chunks']),
            'dimension': self.embedding_dimension,
            'index_type': 'IndexFlatIP',
            'documents': list(self.metadata['document_chunks'].keys())
        }
    
    async def rebuild_index(self) -> bool:
        """Rebuild the entire index (useful for removing documents)"""
        try:
            # This would require re-fetching all embeddings from Firestore
            # and rebuilding the index - complex operation for production
            logger.info("Index rebuild not implemented - would require full re-indexing")
            return False
            
        except Exception as e:
            logger.error(f"Error rebuilding index: {str(e)}")
            return False
