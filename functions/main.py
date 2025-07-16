from firebase_functions import https_fn, firestore_fn, storage_fn
from firebase_admin import initialize_app, firestore, storage
import json
import os
import asyncio
from typing import Any, Dict, List
import logging

# Import RAG components
from src.rag.document_processor import DocumentProcessor
from src.rag.text_chunker import TextChunker, ChunkingConfig
from src.rag.embedding_generator import EmbeddingGenerator, EmbeddingConfig
from src.rag.vector_store import FAISSVectorStore
from src.rag.context_retriever import ContextRetriever, RetrievalConfig

# Import LLM components
from src.llm.openrouter_client import OpenRouterClient, OpenRouterConfig
from src.llm.token_counter import TokenCounter

# Initialize Firebase Admin
initialize_app()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize RAG components
document_processor = DocumentProcessor()
text_chunker = TextChunker()
embedding_generator = EmbeddingGenerator(api_key=os.environ.get('OPENAI_API_KEY'))
context_retriever = ContextRetriever(embedding_generator)

# Initialize LLM components
openrouter_config = OpenRouterConfig(
    api_key=os.environ.get('OPENROUTER_API_KEY', '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'),
    model="meta-llama/llama-3.2-11b-vision-instruct:free"
)
token_counter = TokenCounter(model=openrouter_config.model)

@https_fn.on_call()
def execute_prompt(req: https_fn.CallableRequest) -> Dict[str, Any]:
    """Execute a prompt with optional RAG context"""
    # Verify authentication
    if not req.auth:
        raise https_fn.HttpsError('unauthenticated', 'User must be authenticated')

    try:
        prompt_id = req.data.get('promptId')
        inputs = req.data.get('inputs', {})
        use_rag = req.data.get('useRag', False)
        rag_query = req.data.get('ragQuery', '')
        document_ids = req.data.get('documentIds', [])

        if not prompt_id:
            raise https_fn.HttpsError('invalid-argument', 'promptId is required')

        # Get prompt from Firestore
        db = firestore.client()
        prompt_ref = db.collection('users').document(req.auth.uid).collection('prompts').document(prompt_id)
        prompt_doc = prompt_ref.get()

        if not prompt_doc.exists:
            raise https_fn.HttpsError('not-found', 'Prompt not found')

        prompt_data = prompt_doc.to_dict()

        # Run async execution
        result = asyncio.run(_execute_prompt_async(
            req.auth.uid, prompt_data, inputs, use_rag, rag_query, document_ids
        ))

        # Save execution to Firestore
        execution_ref = prompt_ref.collection('executions').document()
        execution_ref.set({
            'inputs': inputs,
            'outputs': result,
            'timestamp': firestore.SERVER_TIMESTAMP,
            'useRag': use_rag,
            'ragQuery': rag_query if use_rag else None,
            'documentIds': document_ids if use_rag else None,
            'status': 'completed'
        })

        return result

    except Exception as e:
        logger.error(f"Error executing prompt: {str(e)}")
        raise https_fn.HttpsError('internal', str(e))

async def _execute_prompt_async(user_id: str, prompt_data: Dict, inputs: Dict,
                               use_rag: bool, rag_query: str, document_ids: List[str]) -> Dict[str, Any]:
    """Async prompt execution implementation with OpenRouter LLM"""
    try:
        prompt_content = prompt_data.get('content', '')
        prompt_title = prompt_data.get('title', 'Untitled')

        # Replace variables in prompt
        for var_name, var_value in inputs.items():
            placeholder = f"{{{var_name}}}"
            prompt_content = prompt_content.replace(placeholder, str(var_value))

        context = ""
        context_metadata = {}

        # Retrieve RAG context if requested
        if use_rag and rag_query:
            logger.info(f"Retrieving RAG context for query: {rag_query}")
            context_response = await context_retriever.retrieve_context(
                user_id, rag_query, document_ids if document_ids else None
            )
            context = context_response.get('context', '')
            context_metadata = context_response.get('metadata', {})

        # Create system prompt for better responses
        system_prompt = f"""You are an AI assistant helping with the prompt titled "{prompt_title}".
Provide helpful, accurate, and well-structured responses. If context information is provided, use it to enhance your response while being clear about what information comes from the context versus your general knowledge."""

        # Generate response using OpenRouter
        async with OpenRouterClient(openrouter_config) as llm_client:
            if context:
                # Use context-enhanced generation
                llm_response = await llm_client.generate_with_context(
                    prompt=prompt_content,
                    context=context,
                    system_prompt=system_prompt
                )
            else:
                # Standard generation without context
                llm_response = await llm_client.generate_response(
                    prompt=prompt_content,
                    system_prompt=system_prompt
                )

        # Prepare result
        result = {
            'output': llm_response.content,
            'context': context,
            'metadata': {
                'model': llm_response.model,
                'executionTime': llm_response.response_time,
                'tokensUsed': llm_response.usage.get('total_tokens', 0),
                'promptTokens': llm_response.usage.get('prompt_tokens', 0),
                'completionTokens': llm_response.usage.get('completion_tokens', 0),
                'cost': llm_response.cost_estimate,
                'finishReason': llm_response.finish_reason,
                'useRag': use_rag,
                'contextMetadata': context_metadata
            }
        }

        logger.info(f"Successfully executed prompt with {llm_response.usage.get('total_tokens', 0)} tokens")
        return result

    except Exception as e:
        logger.error(f"Error in async prompt execution: {str(e)}")
        # Return error response instead of raising
        return {
            'output': f"Error executing prompt: {str(e)}",
            'context': context if 'context' in locals() else "",
            'metadata': {
                'model': openrouter_config.model,
                'executionTime': 0,
                'tokensUsed': 0,
                'cost': 0,
                'error': str(e),
                'useRag': use_rag,
                'contextMetadata': context_metadata if 'context_metadata' in locals() else {}
            }
        }

@firestore_fn.on_document_created(document="rag_documents/{doc_id}")
def process_document(event: firestore_fn.Event[firestore_fn.DocumentSnapshot]):
    """Process uploaded documents for RAG"""
    try:
        doc_data = event.data.to_dict()
        doc_id = event.params['doc_id']

        logger.info(f"Processing document: {doc_id}")

        # Run async processing
        asyncio.run(_process_document_async(doc_id, doc_data))

    except Exception as e:
        logger.error(f"Error in document processing trigger: {str(e)}")
        # Update document status to failed
        db = firestore.client()
        doc_ref = db.collection('rag_documents').document(doc_id)
        doc_ref.update({
            'status': 'failed',
            'error': str(e),
            'processedAt': firestore.SERVER_TIMESTAMP
        })

async def _process_document_async(doc_id: str, doc_data: Dict):
    """Async document processing implementation"""
    db = firestore.client()
    doc_ref = db.collection('rag_documents').document(doc_id)

    try:
        # Update status to processing
        doc_ref.update({
            'status': 'processing',
            'processingStartedAt': firestore.SERVER_TIMESTAMP
        })

        # Extract file path from document data
        file_path = doc_data.get('filePath')
        if not file_path:
            raise ValueError("No file path found in document data")

        # Step 1: Process document and extract text
        logger.info(f"Extracting text from document: {doc_id}")
        processed_doc = await document_processor.process_document(doc_id, file_path)

        # Step 2: Chunk the text
        logger.info(f"Chunking text for document: {doc_id}")
        chunks = text_chunker.chunk_text(
            processed_doc['text_content'],
            doc_id,
            processed_doc['metadata']
        )

        if not chunks:
            raise ValueError("No chunks generated from document")

        # Step 3: Generate embeddings
        logger.info(f"Generating embeddings for {len(chunks)} chunks")
        chunks_with_embeddings = await embedding_generator.generate_embeddings(chunks)

        # Step 4: Store chunks in Firestore
        logger.info(f"Storing chunks in Firestore")
        chunk_refs = []
        for chunk in chunks_with_embeddings:
            chunk_ref = doc_ref.collection('chunks').document(chunk['id'])
            chunk_ref.set({
                'content': chunk['content'],
                'metadata': chunk['metadata'],
                'embedding': chunk.get('embedding'),
                'createdAt': firestore.SERVER_TIMESTAMP
            })
            chunk_refs.append(chunk_ref.id)

        # Step 5: Add chunks to vector store
        logger.info(f"Adding chunks to vector store")
        user_id = doc_data.get('uploadedBy')
        if user_id:
            vector_store = FAISSVectorStore(user_id)
            await vector_store.add_chunks(chunks_with_embeddings)
        else:
            logger.warning("No user ID found for vector store update")

        # Step 6: Update document status
        embedding_stats = embedding_generator.get_embedding_stats(chunks_with_embeddings)
        doc_ref.update({
            'status': 'completed',
            'processedAt': firestore.SERVER_TIMESTAMP,
            'textContent': processed_doc['text_content'][:1000] + '...' if len(processed_doc['text_content']) > 1000 else processed_doc['text_content'],
            'processingMetadata': {
                **processed_doc['metadata'],
                'chunk_count': len(chunks_with_embeddings),
                'embedding_stats': embedding_stats
            },
            'chunkIds': chunk_refs
        })

        logger.info(f"Successfully processed document {doc_id} with {len(chunks_with_embeddings)} chunks")

    except Exception as e:
        logger.error(f"Error processing document {doc_id}: {str(e)}")
        doc_ref.update({
            'status': 'failed',
            'error': str(e),
            'processedAt': firestore.SERVER_TIMESTAMP
        })
        raise
        
        logger.info(f"Document processed successfully: {doc_id}")
        
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}")
        # Update document status to failed
        try:
            db = firestore.client()
            doc_ref = db.collection('rag_documents').document(event.params['doc_id'])
            doc_ref.update({
                'status': 'failed',
                'error': str(e),
                'processedAt': firestore.SERVER_TIMESTAMP
            })
        except:
            pass

@https_fn.on_call()
def search_prompts(req: https_fn.CallableRequest) -> Dict[str, Any]:
    """Search prompts with filters"""
    if not req.auth:
        raise https_fn.HttpsError('unauthenticated', 'User must be authenticated')
    
    try:
        query = req.data.get('query', '')
        tags = req.data.get('tags', [])
        category = req.data.get('category', '')
        limit = req.data.get('limit', 20)
        
        db = firestore.client()
        prompts_ref = db.collection('users').document(req.auth.uid).collection('prompts')
        
        # Build query
        query_ref = prompts_ref
        
        if category:
            query_ref = query_ref.where('category', '==', category)
        
        if tags:
            query_ref = query_ref.where('tags', 'array-contains-any', tags)
        
        # Order by creation date and limit
        query_ref = query_ref.order_by('createdAt', direction=firestore.Query.DESCENDING).limit(limit)
        
        results = query_ref.get()
        
        prompts = []
        for doc in results:
            prompt_data = doc.to_dict()
            prompt_data['id'] = doc.id
            prompts.append(prompt_data)
        
        return {
            'prompts': prompts,
            'total': len(prompts)
        }

    except Exception as e:
        logger.error(f"Error searching prompts: {str(e)}")
        raise https_fn.HttpsError('internal', str(e))

@https_fn.on_call()
def test_openrouter_connection(req: https_fn.CallableRequest) -> Dict[str, Any]:
    """Test OpenRouter API connection and model info"""
    # Verify authentication
    if not req.auth:
        raise https_fn.HttpsError('unauthenticated', 'User must be authenticated')

    try:
        # Run async test
        result = asyncio.run(_test_openrouter_async())
        return result

    except Exception as e:
        logger.error(f"Error testing OpenRouter connection: {str(e)}")
        raise https_fn.HttpsError('internal', str(e))

async def _test_openrouter_async() -> Dict[str, Any]:
    """Async OpenRouter connection test"""
    try:
        async with OpenRouterClient(openrouter_config) as llm_client:
            # Test API key validation
            is_valid = await llm_client.validate_api_key()

            if not is_valid:
                return {
                    'status': 'error',
                    'message': 'Invalid API key or connection failed',
                    'model_info': llm_client.get_model_info()
                }

            # Test simple generation
            test_response = await llm_client.generate_response(
                prompt="Hello! Please respond with a brief greeting.",
                system_prompt="You are a helpful AI assistant. Keep responses concise."
            )

            return {
                'status': 'success',
                'message': 'OpenRouter connection successful',
                'test_response': {
                    'content': test_response.content,
                    'model': test_response.model,
                    'tokens_used': test_response.usage.get('total_tokens', 0),
                    'response_time': test_response.response_time,
                    'cost': test_response.cost_estimate
                },
                'model_info': llm_client.get_model_info()
            }

    except Exception as e:
        logger.error(f"OpenRouter test failed: {str(e)}")
        return {
            'status': 'error',
            'message': f'Test failed: {str(e)}',
            'model_info': {
                'model': openrouter_config.model,
                'configured': True
            }
        }
        
    except Exception as e:
        logger.error(f"Error searching prompts: {str(e)}")
        raise https_fn.HttpsError('internal', str(e))

@https_fn.on_call()
def get_analytics(req: https_fn.CallableRequest) -> Dict[str, Any]:
    """Get user analytics and usage statistics"""
    if not req.auth:
        raise https_fn.HttpsError('unauthenticated', 'User must be authenticated')
    
    try:
        db = firestore.client()
        user_ref = db.collection('users').document(req.auth.uid)
        
        # Get prompt count
        prompts_ref = user_ref.collection('prompts')
        prompts_count = len(prompts_ref.get())
        
        # Get execution count (simplified - in production, use aggregation)
        executions_count = 0
        for prompt_doc in prompts_ref.get():
            executions = prompt_doc.reference.collection('executions').get()
            executions_count += len(executions)
        
        # TODO: Add more analytics like cost tracking, performance metrics, etc.
        
        return {
            'promptsCount': prompts_count,
            'executionsCount': executions_count,
            'totalCost': 0.0,  # TODO: Calculate actual cost
            'avgExecutionTime': 1.5  # TODO: Calculate actual average
        }
        
    except Exception as e:
        logger.error(f"Error getting analytics: {str(e)}")
        raise https_fn.HttpsError('internal', str(e))
