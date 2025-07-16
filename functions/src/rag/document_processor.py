"""
Document Processing Module for RAG Pipeline
Handles text extraction from various document formats
"""

import io
import logging
import mimetypes
from typing import Dict, List, Optional, Tuple
from pathlib import Path

import PyPDF2
import docx
import chardet
from firebase_admin import storage
from google.cloud.exceptions import NotFound

logger = logging.getLogger(__name__)

class DocumentProcessor:
    """Processes documents and extracts text content for RAG pipeline"""
    
    SUPPORTED_TYPES = {
        'application/pdf': 'pdf',
        'text/plain': 'txt',
        'text/markdown': 'md',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/msword': 'doc'
    }
    
    def __init__(self):
        self.bucket = storage.bucket()
    
    async def process_document(self, document_id: str, file_path: str) -> Dict:
        """
        Process a document and extract text content
        
        Args:
            document_id: Unique identifier for the document
            file_path: Path to the file in Firebase Storage
            
        Returns:
            Dict containing extracted text and metadata
        """
        try:
            # Download file from Firebase Storage
            blob = self.bucket.blob(file_path)
            if not blob.exists():
                raise FileNotFoundError(f"File not found: {file_path}")
            
            # Get file content and metadata
            file_content = blob.download_as_bytes()
            content_type = blob.content_type or self._detect_content_type(file_content, file_path)
            
            # Extract text based on file type
            text_content, metadata = await self._extract_text(
                file_content, content_type, file_path
            )
            
            return {
                'document_id': document_id,
                'text_content': text_content,
                'metadata': {
                    **metadata,
                    'file_path': file_path,
                    'content_type': content_type,
                    'file_size': len(file_content),
                    'character_count': len(text_content),
                    'word_count': len(text_content.split()) if text_content else 0
                }
            }
            
        except Exception as e:
            logger.error(f"Error processing document {document_id}: {str(e)}")
            raise
    
    async def _extract_text(self, file_content: bytes, content_type: str, file_path: str) -> Tuple[str, Dict]:
        """Extract text from file content based on content type"""
        
        file_type = self.SUPPORTED_TYPES.get(content_type)
        if not file_type:
            raise ValueError(f"Unsupported file type: {content_type}")
        
        try:
            if file_type == 'pdf':
                return self._extract_from_pdf(file_content)
            elif file_type == 'docx':
                return self._extract_from_docx(file_content)
            elif file_type in ['txt', 'md']:
                return self._extract_from_text(file_content)
            else:
                raise ValueError(f"Handler not implemented for file type: {file_type}")
                
        except Exception as e:
            logger.error(f"Error extracting text from {file_path}: {str(e)}")
            raise
    
    def _extract_from_pdf(self, file_content: bytes) -> Tuple[str, Dict]:
        """Extract text from PDF file"""
        try:
            pdf_file = io.BytesIO(file_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            text_content = ""
            page_count = len(pdf_reader.pages)
            
            for page_num, page in enumerate(pdf_reader.pages):
                try:
                    page_text = page.extract_text()
                    if page_text:
                        text_content += f"\n--- Page {page_num + 1} ---\n{page_text}\n"
                except Exception as e:
                    logger.warning(f"Error extracting text from page {page_num + 1}: {str(e)}")
                    continue
            
            metadata = {
                'page_count': page_count,
                'extraction_method': 'PyPDF2'
            }
            
            return text_content.strip(), metadata
            
        except Exception as e:
            logger.error(f"PDF extraction error: {str(e)}")
            raise ValueError(f"Failed to extract text from PDF: {str(e)}")
    
    def _extract_from_docx(self, file_content: bytes) -> Tuple[str, Dict]:
        """Extract text from DOCX file"""
        try:
            doc_file = io.BytesIO(file_content)
            doc = docx.Document(doc_file)
            
            text_content = ""
            paragraph_count = 0
            
            for paragraph in doc.paragraphs:
                if paragraph.text.strip():
                    text_content += paragraph.text + "\n"
                    paragraph_count += 1
            
            metadata = {
                'paragraph_count': paragraph_count,
                'extraction_method': 'python-docx'
            }
            
            return text_content.strip(), metadata
            
        except Exception as e:
            logger.error(f"DOCX extraction error: {str(e)}")
            raise ValueError(f"Failed to extract text from DOCX: {str(e)}")
    
    def _extract_from_text(self, file_content: bytes) -> Tuple[str, Dict]:
        """Extract text from plain text or markdown files"""
        try:
            # Detect encoding
            encoding_result = chardet.detect(file_content)
            encoding = encoding_result.get('encoding', 'utf-8')
            confidence = encoding_result.get('confidence', 0.0)
            
            # Decode text content
            text_content = file_content.decode(encoding)
            
            metadata = {
                'encoding': encoding,
                'encoding_confidence': confidence,
                'extraction_method': 'direct_text'
            }
            
            return text_content.strip(), metadata
            
        except Exception as e:
            logger.error(f"Text extraction error: {str(e)}")
            raise ValueError(f"Failed to extract text from file: {str(e)}")
    
    def _detect_content_type(self, file_content: bytes, file_path: str) -> str:
        """Detect content type from file content and path"""
        # Try to detect from file extension
        file_ext = Path(file_path).suffix.lower()
        ext_to_mime = {
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
            '.md': 'text/markdown',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.doc': 'application/msword'
        }
        
        if file_ext in ext_to_mime:
            return ext_to_mime[file_ext]
        
        # Fallback to content detection (basic)
        if file_content.startswith(b'%PDF'):
            return 'application/pdf'
        elif file_content.startswith(b'PK'):  # ZIP-based formats like DOCX
            return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        else:
            return 'text/plain'
    
    def validate_document(self, content_type: str, file_size: int) -> bool:
        """Validate document before processing"""
        # Check if content type is supported
        if content_type not in self.SUPPORTED_TYPES:
            return False
        
        # Check file size (10MB limit)
        max_size = 10 * 1024 * 1024  # 10MB
        if file_size > max_size:
            return False
        
        return True
