# Enhanced RAG (Retrieval-Augmented Generation) System

## 🎯 **Overview**

This enhanced RAG system provides intelligent document search and retrieval capabilities integrated with your AI personas. It uses **Supabase** for vector storage and **OpenAI** for embeddings and response generation.

## 🚀 **Features**

### **Core Capabilities**

- ✅ **Document Processing**: Smart chunking with overlap
- ✅ **Vector Search**: Semantic similarity using OpenAI embeddings
- ✅ **Multi-format Support**: Text, Markdown, HTML, PDF, URLs
- ✅ **Persona Integration**: Context-aware responses for each AI persona
- ✅ **WhatsApp Integration**: Automatic RAG triggering for relevant queries
- ✅ **Metadata Filtering**: Search by category, document type, persona
- ✅ **Batch Processing**: Efficient bulk document uploads
- ✅ **Analytics**: Document statistics and usage tracking

### **Advanced Features**

- 🧠 **Smart Chunking**: Paragraph, sentence, or token-based splitting
- 🎯 **Confidence Scoring**: Response quality assessment
- 📊 **Source Attribution**: Track document sources in responses
- 🔄 **Continuous Learning**: Add conversations to knowledge base
- 🎨 **WhatsApp Formatting**: Optimized responses for messaging

## 🛠️ **Setup Instructions**

### **1. Environment Variables**

Add these to your `.env` file:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-3.5-turbo  # or gpt-4

# Existing variables (already required)
DATABASE_URL=your_postgresql_url
DIRECT_URL=your_direct_postgresql_url
```

### **2. Supabase Setup**

Execute the SQL schema in your Supabase SQL editor:

```sql
-- Run the complete schema from: src/rag/schemas/supabase-schema.sql
-- This will create:
-- ✅ documents table with vector support
-- ✅ Indexes for performance
-- ✅ Functions for similarity search
-- ✅ Triggers for auto-updates
```

### **3. Install Dependencies**

The required packages are already in `package.json`:

- `@supabase/supabase-js` - Supabase client
- `@langchain/openai` - OpenAI embeddings
- `langchain` - Document processing

## 📚 **API Endpoints**

### **Document Management**

```bash
# Add single document
POST /rag/document
{
  "content": "Your document content here...",
  "metadata": {
    "title": "Document Title",
    "category": "AI",
    "personaType": "THERAPIST",
    "documentType": "text",
    "tags": ["openai", "ai"]
  },
  "options": {
    "chunkSize": 1000,
    "chunkOverlap": 200,
    "customSplitter": "paragraph"
  }
}

# Add multiple documents
POST /rag/documents
{
  "documents": [
    {
      "content": "First document...",
      "metadata": { ... }
    },
    {
      "content": "Second document...",
      "metadata": { ... }
    }
  ]
}

# Delete document
DELETE /rag/document/:id

# Update document metadata
PUT /rag/document/:id/metadata
{
  "metadata": {
    "category": "Updated Category"
  }
}
```

### **Search & Query**

```bash
# Search documents
GET /rag/search?query=openai&limit=5&personaType=THERAPIST&threshold=0.7

# RAG Query (with persona)
POST /rag/query
{
  "query": "What is OpenAI?",
  "personaType": "THERAPIST",
  "searchOptions": {
    "limit": 3,
    "threshold": 0.7,
    "category": "AI"
  }
}

# Simple query (legacy)
POST /rag/query/simple
{
  "query": "What is AI?",
  "context": "Artificial Intelligence is..."
}

# Get statistics
GET /rag/stats

# Health check
GET /rag/health
```

## 🔧 **Integration Examples**

### **1. WhatsApp Integration**

The RAG system automatically integrates with WhatsApp messages:

```typescript
// In your WhatsApp service
import { WhatsAppRAGIntegration } from '../rag/utils/whatsapp-rag.integration';

// Check if message should trigger RAG
const ragResult = await this.ragIntegration.processWhatsAppMessage(
  message.body,
  user.id,
  personaType,
);

if (ragResult.shouldUseRAG) {
  // Use RAG response instead of regular AI response
  return ragResult.ragResponse;
}
```

### **2. Add Documents Programmatically**

```typescript
// Add therapy-related documents
await this.ragService.addDocument(
  `Cognitive Behavioral Therapy (CBT) is a psychotherapy approach...`,
  {
    title: 'CBT Overview',
    category: 'therapy',
    personaType: 'THERAPIST',
    documentType: DocumentType.TEXT,
    tags: ['cbt', 'therapy', 'psychology'],
  },
);

// Add nutrition documents
await this.ragService.addDocument(
  `The Mediterranean diet emphasizes fruits, vegetables...`,
  {
    title: 'Mediterranean Diet Guide',
    category: 'nutrition',
    personaType: 'DIETICIAN',
    documentType: DocumentType.TEXT,
    tags: ['diet', 'nutrition', 'health'],
  },
);
```

### **3. Bulk Document Upload**

```typescript
const documents = [
  {
    content: 'Document 1 content...',
    metadata: { personaType: 'THERAPIST', category: 'wellness' },
  },
  {
    content: 'Document 2 content...',
    metadata: { personaType: 'CAREER', category: 'job-search' },
  },
];

const documentIds = await this.ragService.addDocuments(documents);
```

## 🎨 **WhatsApp RAG Triggers**

The system automatically detects when users want document-based information:

**Trigger Words:**

- "search", "find", "lookup", "document", "file"
- "information about", "tell me about", "what is"
- "explain", "define", "help with"
- "do you know", "can you find", "show me"

**Example Conversations:**

```
User: "Tell me about stress management techniques"
Bot: Uses RAG to search therapy documents and provides evidence-based response

User: "What foods help with weight loss?"
Bot: Searches nutrition documents and provides dietary advice

User: "How do I prepare for job interviews?"
Bot: Finds career-related documents and gives interview tips
```

## 📊 **Document Types & Metadata**

### **Supported Document Types**

- `text` - Plain text documents
- `markdown` - Markdown files
- `html` - HTML content
- `pdf` - PDF documents (content extracted)
- `url` - Web page content
- `conversation` - Chat conversations

### **Metadata Schema**

```typescript
{
  title?: string;           // Document title
  source?: string;          // Source URL or file path
  author?: string;          // Author name
  category?: string;        // Category (therapy, nutrition, career)
  tags?: string[];          // Search tags
  personaType?: string;     // THERAPIST, DIETICIAN, CAREER
  documentType: DocumentType; // Required
  createdAt?: Date;         // Auto-generated
  updatedAt?: Date;         // Auto-updated
}
```

## 📈 **Performance Optimization**

### **Chunking Strategy**

- **Small chunks (500-800 chars)**: Better for specific facts
- **Medium chunks (800-1200 chars)**: Balanced approach (default)
- **Large chunks (1200+ chars)**: Better for context understanding

### **Search Thresholds**

- **0.9+**: Very high similarity (exact matches)
- **0.7-0.9**: High similarity (recommended)
- **0.5-0.7**: Medium similarity (broader results)
- **<0.5**: Low similarity (may include irrelevant results)

### **Indexes Created**

- Vector similarity (ivfflat)
- Metadata fields (GIN)
- Timestamps (B-tree)
- Persona/category filtering

## 🔍 **Monitoring & Analytics**

### **Available Metrics**

- Total documents in knowledge base
- Documents by type/persona/category
- RAG query frequency and confidence
- User interaction patterns
- Search performance metrics

### **Usage Examples**

```typescript
// Get system statistics
const stats = await this.ragService.getDocumentStats();
console.log(`Total docs: ${stats.totalDocuments}`);

// Check RAG usage for a user
const userStats = await this.ragIntegration.getRAGUsageStats(userId);
console.log(`User RAG queries: ${userStats.totalRAGQueries}`);
```

## 🚨 **Troubleshooting**

### **Common Issues**

1. **"No relevant documents found"**

   - Check if documents are added to knowledge base
   - Lower similarity threshold (0.5-0.6)
   - Verify metadata filters

2. **"Low confidence responses"**

   - Add more relevant documents
   - Improve document quality and chunking
   - Check embedding model compatibility

3. **"Slow search performance"**

   - Ensure Supabase indexes are created
   - Consider reducing search limit
   - Check Supabase connection performance

4. **"WhatsApp RAG not triggering"**
   - Check trigger words in message
   - Verify persona type configuration
   - Review integration setup

### **Debug Mode**

Set `LOG_LEVEL=debug` to see detailed RAG processing logs.

## 🎯 **Best Practices**

1. **Document Quality**: Use well-structured, clear content
2. **Metadata**: Always include relevant metadata for filtering
3. **Chunking**: Adjust chunk size based on content type
4. **Thresholds**: Start with 0.7 similarity, adjust based on results
5. **Categories**: Use consistent category names across documents
6. **Updates**: Regularly update and curate your knowledge base

## 🔄 **Continuous Learning**

The system can automatically learn from user conversations:

```typescript
// Add successful conversations to knowledge base
await this.ragIntegration.addConversationToKnowledgeBase(
  userId,
  personaType,
  conversationHistory,
);
```

This creates a self-improving system that gets better over time!

---

## 🎉 **You're Ready to Go!**

Your enhanced RAG system is now fully integrated and ready to provide intelligent, context-aware responses through your AI personas. The system will automatically detect when users need document-based information and provide accurate, sourced responses.

For questions or issues, check the logs or contact the development team.
