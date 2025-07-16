"""
Text Chunking Module for RAG Pipeline
Splits text into optimal chunks for embedding and retrieval
"""

import logging
import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

import tiktoken
from langchain_text_splitters import RecursiveCharacterTextSplitter, TokenTextSplitter

logger = logging.getLogger(__name__)

@dataclass
class ChunkMetadata:
    """Metadata for a text chunk"""
    chunk_id: str
    start_index: int
    end_index: int
    token_count: int
    character_count: int
    page_number: Optional[int] = None
    section_title: Optional[str] = None

@dataclass
class ChunkingConfig:
    """Configuration for text chunking"""
    chunk_size: int = 1000
    chunk_overlap: int = 200
    min_chunk_size: int = 100
    max_chunk_size: int = 2000
    separators: List[str] = None
    model_name: str = "gpt-3.5-turbo"

class TextChunker:
    """Handles text chunking for RAG processing"""
    
    def __init__(self, config: Optional[ChunkingConfig] = None):
        self.config = config or ChunkingConfig()
        self.encoding = tiktoken.encoding_for_model(self.config.model_name)
        
        # Default separators for recursive splitting
        if self.config.separators is None:
            self.config.separators = [
                "\n\n",  # Paragraphs
                "\n",    # Lines
                ". ",    # Sentences
                "! ",    # Exclamations
                "? ",    # Questions
                "; ",    # Semicolons
                ", ",    # Commas
                " ",     # Words
                ""       # Characters
            ]
    
    def chunk_text(self, text: str, document_id: str, metadata: Dict = None) -> List[Dict]:
        """
        Split text into chunks optimized for RAG retrieval
        
        Args:
            text: Text content to chunk
            document_id: Unique identifier for the source document
            metadata: Additional metadata about the document
            
        Returns:
            List of chunk dictionaries with content and metadata
        """
        if not text or not text.strip():
            return []
        
        try:
            # Preprocess text
            cleaned_text = self._preprocess_text(text)
            
            # Extract structure information
            structure_info = self._extract_structure(cleaned_text)
            
            # Create text splitter
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=self.config.chunk_size,
                chunk_overlap=self.config.chunk_overlap,
                length_function=self._count_tokens,
                separators=self.config.separators,
                keep_separator=True
            )
            
            # Split text into chunks
            text_chunks = splitter.split_text(cleaned_text)
            
            # Process chunks and add metadata
            processed_chunks = []
            current_position = 0
            
            for i, chunk_text in enumerate(text_chunks):
                if len(chunk_text.strip()) < self.config.min_chunk_size:
                    continue
                
                # Find chunk position in original text
                start_index = cleaned_text.find(chunk_text, current_position)
                if start_index == -1:
                    start_index = current_position
                
                end_index = start_index + len(chunk_text)
                current_position = end_index - self.config.chunk_overlap
                
                # Create chunk metadata
                chunk_metadata = ChunkMetadata(
                    chunk_id=f"{document_id}_chunk_{i}",
                    start_index=start_index,
                    end_index=end_index,
                    token_count=self._count_tokens(chunk_text),
                    character_count=len(chunk_text),
                    page_number=self._get_page_number(chunk_text, structure_info),
                    section_title=self._get_section_title(chunk_text, structure_info)
                )
                
                chunk_dict = {
                    'id': chunk_metadata.chunk_id,
                    'content': chunk_text.strip(),
                    'document_id': document_id,
                    'metadata': {
                        'start_index': chunk_metadata.start_index,
                        'end_index': chunk_metadata.end_index,
                        'token_count': chunk_metadata.token_count,
                        'character_count': chunk_metadata.character_count,
                        'page_number': chunk_metadata.page_number,
                        'section_title': chunk_metadata.section_title,
                        'chunk_index': i,
                        **(metadata or {})
                    }
                }
                
                processed_chunks.append(chunk_dict)
            
            logger.info(f"Created {len(processed_chunks)} chunks for document {document_id}")
            return processed_chunks
            
        except Exception as e:
            logger.error(f"Error chunking text for document {document_id}: {str(e)}")
            raise
    
    def _preprocess_text(self, text: str) -> str:
        """Clean and preprocess text before chunking"""
        # Remove excessive whitespace
        text = re.sub(r'\n\s*\n\s*\n', '\n\n', text)
        text = re.sub(r' +', ' ', text)
        
        # Normalize line endings
        text = text.replace('\r\n', '\n').replace('\r', '\n')
        
        # Remove control characters except newlines and tabs
        text = ''.join(char for char in text if ord(char) >= 32 or char in '\n\t')
        
        return text.strip()
    
    def _extract_structure(self, text: str) -> Dict:
        """Extract structural information from text"""
        structure = {
            'pages': [],
            'sections': [],
            'headings': []
        }
        
        # Extract page markers
        page_pattern = r'--- Page (\d+) ---'
        for match in re.finditer(page_pattern, text):
            structure['pages'].append({
                'page_number': int(match.group(1)),
                'start_index': match.start(),
                'end_index': match.end()
            })
        
        # Extract headings (markdown-style)
        heading_pattern = r'^(#{1,6})\s+(.+)$'
        for match in re.finditer(heading_pattern, text, re.MULTILINE):
            level = len(match.group(1))
            title = match.group(2).strip()
            structure['headings'].append({
                'level': level,
                'title': title,
                'start_index': match.start(),
                'end_index': match.end()
            })
        
        return structure
    
    def _get_page_number(self, chunk_text: str, structure_info: Dict) -> Optional[int]:
        """Determine page number for a chunk"""
        # Look for page markers in the chunk
        page_pattern = r'--- Page (\d+) ---'
        match = re.search(page_pattern, chunk_text)
        if match:
            return int(match.group(1))
        
        return None
    
    def _get_section_title(self, chunk_text: str, structure_info: Dict) -> Optional[str]:
        """Determine section title for a chunk"""
        # Look for headings in the chunk
        heading_pattern = r'^(#{1,6})\s+(.+)$'
        match = re.search(heading_pattern, chunk_text, re.MULTILINE)
        if match:
            return match.group(2).strip()
        
        return None
    
    def _count_tokens(self, text: str) -> int:
        """Count tokens in text using tiktoken"""
        try:
            return len(self.encoding.encode(text))
        except Exception:
            # Fallback to approximate token count
            return len(text.split()) * 1.3  # Rough approximation
    
    def optimize_chunks_for_retrieval(self, chunks: List[Dict]) -> List[Dict]:
        """Optimize chunks for better retrieval performance"""
        optimized_chunks = []
        
        for chunk in chunks:
            content = chunk['content']
            
            # Skip very short chunks
            if len(content.strip()) < self.config.min_chunk_size:
                continue
            
            # Split very long chunks
            if chunk['metadata']['token_count'] > self.config.max_chunk_size:
                sub_chunks = self._split_large_chunk(chunk)
                optimized_chunks.extend(sub_chunks)
            else:
                optimized_chunks.append(chunk)
        
        return optimized_chunks
    
    def _split_large_chunk(self, chunk: Dict) -> List[Dict]:
        """Split a chunk that's too large"""
        content = chunk['content']
        document_id = chunk['document_id']
        base_metadata = chunk['metadata']
        
        # Use token-based splitter for large chunks
        token_splitter = TokenTextSplitter(
            chunk_size=self.config.max_chunk_size,
            chunk_overlap=self.config.chunk_overlap
        )
        
        sub_texts = token_splitter.split_text(content)
        sub_chunks = []
        
        for i, sub_text in enumerate(sub_texts):
            sub_chunk_id = f"{chunk['id']}_sub_{i}"
            sub_chunk = {
                'id': sub_chunk_id,
                'content': sub_text.strip(),
                'document_id': document_id,
                'metadata': {
                    **base_metadata,
                    'token_count': self._count_tokens(sub_text),
                    'character_count': len(sub_text),
                    'is_sub_chunk': True,
                    'parent_chunk_id': chunk['id'],
                    'sub_chunk_index': i
                }
            }
            sub_chunks.append(sub_chunk)
        
        return sub_chunks
