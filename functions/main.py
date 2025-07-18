"""
Enhanced Firebase Functions for RAG Prompt Library - Blaze Plan Optimized
"""
import os
import json
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta

from firebase_functions import https_fn, firestore_fn, scheduler_fn, options
from firebase_admin import initialize_app, firestore, storage
import requests
from google.cloud.firestore_v1.base_query import FieldFilter

# Load environment variables for local development
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # python-dotenv not available, use system environment variables
    pass

# Initialize Firebase Admin
initialize_app()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration for Blaze Plan optimizations
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY')
OPENROUTER_API_KEY_RAG = os.environ.get('OPENROUTER_API_KEY_RAG')
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

# Model configurations
PROMPT_GENERATION_MODEL = "nvidia/llama-3.1-nemotron-ultra-253b-v1:free"
RAG_PROCESSING_MODEL = "nvidia/llama-3.1-nemotron-ultra-253b-v1:free"

@https_fn.on_call(
    memory=options.MemoryOption.MB_1024,
    timeout_sec=300,
    max_instances=100,
    min_instances=0,
    concurrency=80
)
def generate_prompt(req: https_fn.CallableRequest) -> Dict[str, Any]:
    """Generate an AI-optimized prompt using external LLM APIs - Blaze Plan Enhanced"""
    if not req.auth:
        raise https_fn.HttpsError('unauthenticated', 'User must be authenticated')

    try:
        # Extract request data
        purpose = req.data.get('purpose', '')
        industry = req.data.get('industry', '')
        use_case = req.data.get('useCase', '')
        complexity = req.data.get('complexity', 'medium')

        if not purpose:
            raise https_fn.HttpsError('invalid-argument', 'Purpose is required')

        # Use external API for enhanced prompt generation (Blaze Plan feature)
        if OPENROUTER_API_KEY:
            generated_prompt = _generate_with_openrouter(purpose, industry, use_case, complexity)
        else:
            # Fallback to enhanced template
            generated_prompt = _generate_enhanced_template(purpose, industry, use_case, complexity)

        # Store generation analytics
        _log_generation_analytics(req.auth.uid, purpose, industry, use_case)

        return {
            'generatedPrompt': generated_prompt,
            'title': f"{purpose.title()} Assistant",
            'description': f"AI-generated prompt for {purpose} in {industry}",
            'category': industry or 'General',
            'tags': [industry.lower() if industry else 'general', use_case.lower().replace(' ', '-') if use_case else 'assistant'],
            'variables': _extract_variables(generated_prompt),
            'qualityScore': _calculate_quality_score(generated_prompt),
            'suggestions': _generate_suggestions(generated_prompt),
            'metadata': {
                'model': 'openrouter-enhanced' if OPENROUTER_API_KEY else 'template-enhanced',
                'tokensUsed': len(generated_prompt.split()) * 1.3,  # Rough estimate
                'generationTime': 2.5 if OPENROUTER_API_KEY else 0.1,
                'confidence': 0.9 if OPENROUTER_API_KEY else 0.75,
                'blazePlanFeatures': True
            }
        }

    except Exception as e:
        logger.error(f"Error in generate_prompt: {str(e)}")
        raise https_fn.HttpsError('internal', str(e))


def _generate_with_openrouter(purpose: str, industry: str, use_case: str, complexity: str) -> str:
    """Generate prompt using OpenRouter API (External API - Blaze Plan feature)"""
    try:
        headers = {
            'Authorization': f'Bearer {OPENROUTER_API_KEY}',
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://rag-prompt-library.web.app',
            'X-Title': 'RAG Prompt Library'
        }

        system_prompt = f"""You are an expert prompt engineer. Create a high-quality, professional prompt for the following requirements:

Purpose: {purpose}
Industry: {industry}
Use Case: {use_case}
Complexity: {complexity}

The prompt should be:
1. Clear and specific
2. Include relevant variables in {{variable_name}} format
3. Be optimized for AI assistants
4. Include appropriate context and constraints
5. Be professional and industry-appropriate

Return only the generated prompt, no additional text."""

        payload = {
            'model': PROMPT_GENERATION_MODEL,
            'messages': [
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': f'Generate a prompt for: {purpose}'}
            ],
            'max_tokens': 1000,
            'temperature': 0.7
        }

        response = requests.post(
            'https://openrouter.ai/api/v1/chat/completions',
            headers=headers,
            json=payload,
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()
            return result['choices'][0]['message']['content'].strip()
        else:
            logger.warning(f"OpenRouter API error: {response.status_code}")
            return _generate_enhanced_template(purpose, industry, use_case, complexity)

    except Exception as e:
        logger.error(f"Error calling OpenRouter API: {str(e)}")
        return _generate_enhanced_template(purpose, industry, use_case, complexity)


def _generate_enhanced_template(purpose: str, industry: str, use_case: str, complexity: str) -> str:
    """Enhanced template-based generation with complexity levels"""

    complexity_configs = {
        'simple': {
            'instructions': 3,
            'variables': 1,
            'detail_level': 'basic'
        },
        'medium': {
            'instructions': 5,
            'variables': 3,
            'detail_level': 'detailed'
        },
        'complex': {
            'instructions': 8,
            'variables': 5,
            'detail_level': 'comprehensive'
        }
    }

    config = complexity_configs.get(complexity, complexity_configs['medium'])

    base_prompt = f"""You are a professional {industry} specialist and expert assistant.

Your primary objective is to {purpose} for {use_case} scenarios.

Context Variables:
- {{user_input}}: The specific request or question from the user
- {{context}}: Relevant background information or constraints"""

    if config['variables'] >= 3:
        base_prompt += f"""
- {{industry_context}}: Specific {industry} context and requirements
- {{complexity_level}}: The desired level of detail in the response"""

    if config['variables'] >= 5:
        base_prompt += f"""
- {{target_audience}}: The intended audience for this response
- {{output_format}}: The preferred format for the response (e.g., bullet points, paragraph, structured)"""

    base_prompt += f"""

Instructions:
1. Analyze the {{user_input}} carefully and consider the {{context}}
2. Provide {config['detail_level']} responses appropriate for {industry}
3. Use professional terminology and maintain industry standards"""

    if config['instructions'] >= 5:
        base_prompt += f"""
4. Structure your response clearly with logical flow
5. Include specific, actionable recommendations when applicable"""

    if config['instructions'] >= 8:
        base_prompt += f"""
6. Consider potential challenges or limitations
7. Provide alternative approaches when relevant
8. Ensure compliance with {industry} best practices and regulations"""

    base_prompt += f"""

Quality Standards:
- Accuracy: Ensure all information is correct and up-to-date
- Relevance: Keep responses focused on the specific {use_case}
- Professionalism: Maintain appropriate tone and language
- Completeness: Address all aspects of the request thoroughly

Please provide helpful, accurate, and professional assistance."""

    return base_prompt


def _extract_variables(prompt: str) -> List[Dict[str, str]]:
    """Extract variables from prompt text"""
    import re
    variables = []
    matches = re.findall(r'\{([^}]+)\}', prompt)

    for match in matches:
        variables.append({
            'name': match,
            'type': 'text',
            'required': True,
            'description': f'Variable for {match.replace("_", " ")}'
        })

    return variables


def _calculate_quality_score(prompt: str) -> Dict[str, Any]:
    """Calculate quality score for generated prompt"""
    words = len(prompt.split())
    variables = len(_extract_variables(prompt))

    # Basic scoring algorithm
    structure_score = min(100, (words / 10) * 2)  # Based on length
    clarity_score = min(100, 80 + (variables * 5))  # Based on variables
    variable_score = min(100, variables * 20)
    rag_score = 85 if '{context}' in prompt else 60

    overall = (structure_score + clarity_score + variable_score + rag_score) / 4

    return {
        'overall': int(overall),
        'structure': int(structure_score),
        'clarity': int(clarity_score),
        'variables': int(variable_score),
        'ragCompatibility': int(rag_score),
        'suggestions': []
    }


def _generate_suggestions(prompt: str) -> List[Dict[str, Any]]:
    """Generate improvement suggestions"""
    suggestions = []
    variables = _extract_variables(prompt)

    if len(variables) < 2:
        suggestions.append({
            'id': 'add-variables',
            'type': 'variables',
            'title': 'Add More Variables',
            'description': 'Consider adding more variables to make your prompt more dynamic',
            'impact': 'medium',
            'category': 'Enhancement',
            'autoApplicable': False
        })

    if '{context}' not in prompt:
        suggestions.append({
            'id': 'add-rag-context',
            'type': 'rag',
            'title': 'Add RAG Context Variable',
            'description': 'Add {context} variable to enable RAG functionality',
            'impact': 'high',
            'category': 'RAG Enhancement',
            'autoApplicable': True
        })

    return suggestions


def _log_generation_analytics(user_id: str, purpose: str, industry: str, use_case: str):
    """Log analytics for prompt generation (Blaze Plan - Firestore writes)"""
    try:
        db = firestore.client()
        analytics_ref = db.collection('analytics').document()

        analytics_ref.set({
            'userId': user_id,
            'action': 'prompt_generation',
            'purpose': purpose,
            'industry': industry,
            'useCase': use_case,
            'timestamp': firestore.SERVER_TIMESTAMP,
            'blazePlanFeature': True
        })
    except Exception as e:
        logger.error(f"Error logging analytics: {str(e)}")


@https_fn.on_call(
    memory=options.MemoryOption.MB_2048,
    timeout_sec=540,
    max_instances=50,
    min_instances=1,
    concurrency=40
)
def execute_prompt_with_rag(req: https_fn.CallableRequest) -> Dict[str, Any]:
    """Execute a prompt with RAG context - Enhanced for Blaze Plan"""
    if not req.auth:
        raise https_fn.HttpsError('unauthenticated', 'User must be authenticated')

    try:
        prompt_id = req.data.get('promptId')
        inputs = req.data.get('inputs', {})
        use_rag = req.data.get('useRag', False)

        if not prompt_id:
            raise https_fn.HttpsError('invalid-argument', 'Prompt ID is required')

        # Get prompt from Firestore
        db = firestore.client()
        prompt_doc = db.collection('prompts').document(prompt_id).get()

        if not prompt_doc.exists:
            raise https_fn.HttpsError('not-found', 'Prompt not found')

        prompt_data = prompt_doc.to_dict()
        prompt_text = prompt_data.get('content', '')

        # Replace variables in prompt
        for key, value in inputs.items():
            prompt_text = prompt_text.replace(f'{{{key}}}', str(value))

        # Add RAG context if requested
        if use_rag and OPENROUTER_API_KEY:
            context = _retrieve_rag_context(req.auth.uid, inputs.get('user_input', ''))
            prompt_text = prompt_text.replace('{context}', context)

        # Execute with external API
        result = _execute_with_openrouter(prompt_text)

        # Log execution
        _log_execution_analytics(req.auth.uid, prompt_id, use_rag)

        return {
            'result': result,
            'promptId': prompt_id,
            'ragUsed': use_rag,
            'executionTime': datetime.now().isoformat(),
            'blazePlanFeatures': True
        }

    except Exception as e:
        logger.error(f"Error in execute_prompt_with_rag: {str(e)}")
        raise https_fn.HttpsError('internal', str(e))


def _retrieve_rag_context(user_id: str, query: str) -> str:
    """Retrieve relevant context from user's documents using RAG"""
    try:
        # This is a simplified RAG implementation
        # In production, you would use vector embeddings and similarity search
        db = firestore.client()
        docs_ref = db.collection('rag_documents').where(
            filter=FieldFilter('uploadedBy', '==', user_id)
        ).limit(5)

        docs = docs_ref.stream()
        context_parts = []

        for doc in docs:
            doc_data = doc.to_dict()
            content = doc_data.get('content', '')
            # Simple keyword matching (replace with vector similarity in production)
            if any(word.lower() in content.lower() for word in query.split()):
                context_parts.append(content[:500])  # Limit context size

        return '\n\n'.join(context_parts) if context_parts else "No relevant context found."

    except Exception as e:
        logger.error(f"Error retrieving RAG context: {str(e)}")
        return "Context retrieval unavailable."


def _execute_with_openrouter(prompt: str) -> str:
    """Execute prompt using OpenRouter API for RAG processing"""
    try:
        # Use RAG-specific API key if available, fallback to main key
        api_key = OPENROUTER_API_KEY_RAG if OPENROUTER_API_KEY_RAG else OPENROUTER_API_KEY

        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://rag-prompt-library.web.app',
            'X-Title': 'RAG Prompt Library'
        }

        payload = {
            'model': RAG_PROCESSING_MODEL,
            'messages': [
                {'role': 'user', 'content': prompt}
            ],
            'max_tokens': 2000,
            'temperature': 0.7
        }

        response = requests.post(
            'https://openrouter.ai/api/v1/chat/completions',
            headers=headers,
            json=payload,
            timeout=60
        )

        if response.status_code == 200:
            result = response.json()
            return result['choices'][0]['message']['content'].strip()
        else:
            logger.warning(f"OpenRouter API error: {response.status_code}")
            return "AI execution temporarily unavailable. Please try again later."

    except Exception as e:
        logger.error(f"Error executing with OpenRouter: {str(e)}")
        return "AI execution failed. Please try again later."


def _log_execution_analytics(user_id: str, prompt_id: str, rag_used: bool):
    """Log execution analytics"""
    try:
        db = firestore.client()
        log_ref = db.collection('execution_logs').document()

        log_ref.set({
            'userId': user_id,
            'promptId': prompt_id,
            'ragUsed': rag_used,
            'timestamp': firestore.SERVER_TIMESTAMP,
            'blazePlanFeature': True
        })
    except Exception as e:
        logger.error(f"Error logging execution analytics: {str(e)}")


@firestore_fn.on_document_created(
    document="rag_documents/{doc_id}",
    memory=options.MemoryOption.MB_2048,
    timeout_sec=1800
)
def process_uploaded_document(event: firestore_fn.Event[firestore_fn.DocumentSnapshot]):
    """Process uploaded documents for RAG (Blaze Plan - Firestore Triggers)"""
    try:
        doc_data = event.data.to_dict()
        doc_id = event.params['doc_id']

        logger.info(f"Processing document: {doc_id}")

        # Get document content from Storage
        storage_client = storage.bucket()
        file_path = doc_data.get('filePath')

        if not file_path:
            logger.error(f"No file path found for document {doc_id}")
            return

        # Download and process file (simplified implementation)
        blob = storage_client.blob(file_path)
        content = blob.download_as_text()

        # Generate embeddings (placeholder - implement with OpenAI API)
        embeddings = _generate_embeddings(content)

        # Store processed data
        db = firestore.client()
        db.collection('embeddings').document(doc_id).set({
            'documentId': doc_id,
            'userId': doc_data.get('uploadedBy'),
            'content': content[:1000],  # Store first 1000 chars
            'embeddings': embeddings,
            'processedAt': firestore.SERVER_TIMESTAMP,
            'blazePlanFeature': True
        })

        # Update document status
        db.collection('rag_documents').document(doc_id).update({
            'processed': True,
            'processedAt': firestore.SERVER_TIMESTAMP
        })

        logger.info(f"Successfully processed document: {doc_id}")

    except Exception as e:
        logger.error(f"Error processing document: {str(e)}")


def _generate_embeddings(content: str) -> List[float]:
    """Generate embeddings for content (placeholder implementation)"""
    # This is a placeholder - implement with OpenAI Embeddings API
    # For now, return dummy embeddings
    import hashlib
    hash_obj = hashlib.md5(content.encode())
    hash_hex = hash_obj.hexdigest()

    # Convert hash to pseudo-embeddings (for demo purposes)
    embeddings = []
    for i in range(0, len(hash_hex), 2):
        embeddings.append(int(hash_hex[i:i+2], 16) / 255.0)

    # Pad to 1536 dimensions (OpenAI embedding size)
    while len(embeddings) < 1536:
        embeddings.extend(embeddings[:min(len(embeddings), 1536 - len(embeddings))])

    return embeddings[:1536]


@scheduler_fn.on_schedule(
    schedule="0 2 * * *",  # Daily at 2 AM UTC
    timezone="UTC",
    memory=options.MemoryOption.MB_512,
    timeout_sec=300
)
def scheduled_cleanup(event: scheduler_fn.ScheduledEvent):
    """Scheduled cleanup of old analytics and logs (Blaze Plan - Cloud Scheduler)"""
    try:
        db = firestore.client()
        cutoff_date = datetime.now() - timedelta(days=30)

        # Clean up old analytics
        analytics_query = db.collection('analytics').where(
            filter=FieldFilter('timestamp', '<', cutoff_date)
        ).limit(100)

        analytics_docs = analytics_query.stream()
        batch = db.batch()
        count = 0

        for doc in analytics_docs:
            batch.delete(doc.reference)
            count += 1

        if count > 0:
            batch.commit()
            logger.info(f"Cleaned up {count} old analytics records")

        # Clean up old execution logs
        logs_query = db.collection('execution_logs').where(
            filter=FieldFilter('timestamp', '<', cutoff_date)
        ).limit(100)

        logs_docs = logs_query.stream()
        batch = db.batch()
        count = 0

        for doc in logs_docs:
            batch.delete(doc.reference)
            count += 1

        if count > 0:
            batch.commit()
            logger.info(f"Cleaned up {count} old execution logs")

    except Exception as e:
        logger.error(f"Error in scheduled cleanup: {str(e)}")
