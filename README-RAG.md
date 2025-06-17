# Enhanced RAG System Setup Guide

## 🎯 Overview

Your RAG system has been enhanced with advanced document processing, vector search, and WhatsApp integration.

## 🛠️ Setup Steps

### 1. Environment Variables

Add to your `.env`:

```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-3.5-turbo
```

### 2. Supabase Database

Run the SQL schema from `src/rag/schemas/supabase-schema.sql` in your Supabase SQL editor.

### 3. Install Dependencies

```bash
npm install
```

## 🚀 Key Features Added

### Document Processing

- Smart chunking with overlap
- Multiple format support (text, markdown, HTML)
- Metadata-based filtering

### WhatsApp Integration

- Automatic RAG detection for queries
- Formatted responses for messaging
- Conversation learning

### Enhanced Search

- Vector similarity with OpenAI embeddings
- Persona-specific filtering
- Confidence scoring

## 📚 API Endpoints

```bash
# Add document
POST /rag/document
{
  "content": "Document content...",
  "metadata": {
    "title": "Title",
    "category": "AI",
    "personaType": "THERAPIST"
  }
}

# Search documents
GET /rag/search?query=openai&personaType=THERAPIST

# RAG query with persona
POST /rag/query
{
  "query": "What is OpenAI?",
  "personaType": "THERAPIST"
}

# Get stats
GET /rag/stats
```

## 🔧 Integration

### WhatsApp Auto-Trigger

The system automatically detects when users ask questions like:

- "Tell me about..."
- "What is..."
- "Explain..."
- "Help me understand..."

### Add Documents

```typescript
await ragService.addDocument('Your content here...', {
  title: 'Document Title',
  personaType: 'THERAPIST',
  category: 'wellness',
});
```

## ✅ You're Ready!

Your enhanced RAG system is now fully operational and integrated with your AI personas.
