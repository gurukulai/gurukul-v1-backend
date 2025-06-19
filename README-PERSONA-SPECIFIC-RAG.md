# 🎭 Persona-Specific RAG System

## 🎯 Overview

Your RAG system now features **4 separate vector databases** - one for each AI persona. This ensures complete isolation of knowledge bases so when a user selects "AI Girlfriend," only Priya's knowledge base is searched, giving more focused and relevant responses.

## 🏗️ Architecture

### **Before (Unified Database)**

```
Single Table: documents
├── PRIYA documents (filtered by metadata)
├── THERAPIST documents (filtered by metadata)
├── DIETICIAN documents (filtered by metadata)
└── CAREER documents (filtered by metadata)
```

### **After (Persona-Specific Databases)**

```
documents_priya      ← AI Girlfriend knowledge
documents_therapist  ← Therapy knowledge
documents_dietician  ← Nutrition knowledge
documents_career     ← Career knowledge
```

## 📊 Benefits

### ✅ **Complete Isolation**

- No cross-contamination between personas
- Priya won't accidentally reference therapy techniques
- Therapist won't mention dating advice

### ✅ **Better Performance**

- Smaller search spaces = faster queries
- Optimized indexes per persona type
- No unnecessary filtering overhead

### ✅ **Easier Management**

- Clear separation of content types
- Targeted document management
- Persona-specific analytics

## 🚀 Setup Instructions

### **1. Database Setup**

Run the new schema in your Supabase SQL editor:

```bash
# Execute this file in Supabase
backend/src/rag/schemas/persona-specific-schema.sql
```

This creates:

- ✅ 4 separate tables (`documents_priya`, `documents_therapist`, etc.)
- ✅ Optimized indexes for each table
- ✅ Persona-specific search functions
- ✅ Sample data for testing

### **2. Update Your Environment**

Your existing `.env` variables work as-is:

```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-3.5-turbo
```

### **3. API Integration**

The new endpoints are available at `/persona-rag/`:

## 📚 API Endpoints

### **Add Documents to Specific Persona**

```bash
# Add document to Priya's knowledge base
POST /persona-rag/PRIYA/document
{
  "content": "Love languages are important in relationships...",
  "metadata": {
    "category": "relationships",
    "tags": ["love", "communication"]
  }
}

# Add document to Therapist's knowledge base
POST /persona-rag/THERAPIST/document
{
  "content": "Cognitive Behavioral Therapy techniques...",
  "metadata": {
    "category": "therapy",
    "tags": ["CBT", "mental_health"]
  }
}
```

### **Search Within Persona Database**

```bash
# Search only in Priya's database
GET /persona-rag/PRIYA/search?query=relationship advice

# Search only in Therapist's database
GET /persona-rag/THERAPIST/search?query=anxiety management
```

### **RAG Query for Specific Persona**

```bash
# Get response from Priya's knowledge + personality
POST /persona-rag/PRIYA/query
{
  "query": "How do I show love to my partner?",
  "searchOptions": {
    "limit": 3,
    "threshold": 0.7
  }
}

# Get response from Therapist's knowledge + personality
POST /persona-rag/THERAPIST/query
{
  "query": "How do I manage anxiety?",
  "searchOptions": {
    "limit": 5,
    "threshold": 0.8
  }
}
```

### **Persona Management**

```bash
# Get stats for specific persona
GET /persona-rag/PRIYA/stats

# Get stats for all personas
GET /persona-rag/stats

# Check what personas are available
GET /persona-rag/personas

# Clear all documents from a persona
DELETE /persona-rag/PRIYA/documents
```

## 🎨 Frontend Integration

### **Update Your Frontend API Calls**

```typescript
// Old way (unified database)
const response = await fetch('/rag/query', {
  method: 'POST',
  body: JSON.stringify({
    query: userQuestion,
    personaType: selectedPersona,
  }),
});

// New way (persona-specific)
const response = await fetch(`/persona-rag/${selectedPersona}/query`, {
  method: 'POST',
  body: JSON.stringify({
    query: userQuestion,
  }),
});
```

### **Example React Integration**

```typescript
// In your ChatInterface component
const handleRAGQuery = async (query: string, persona: Persona) => {
  try {
    const response = await fetch(`/api/persona-rag/${persona}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();

    if (result.success) {
      return {
        answer: result.answer,
        confidence: result.confidence,
        sources: result.sources,
      };
    }
  } catch (error) {
    console.error(`RAG query failed for ${persona}:`, error);
  }
};
```

## 📖 Usage Examples

### **1. Add Relationship Advice to Priya**

```bash
curl -X POST "http://localhost:3001/persona-rag/PRIYA/document" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "The 5 love languages are: Words of Affirmation, Quality Time, Receiving Gifts, Acts of Service, and Physical Touch. Understanding your partner'\''s love language helps you express love in ways they feel most appreciated.",
    "metadata": {
      "category": "relationships",
      "tags": ["love_languages", "communication", "relationships"],
      "source": "relationship_guide"
    }
  }'
```

### **2. Add Therapy Techniques to Therapist**

```bash
curl -X POST "http://localhost:3001/persona-rag/THERAPIST/document" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "The 5-4-3-2-1 grounding technique helps manage anxiety: Identify 5 things you can see, 4 things you can touch, 3 things you can hear, 2 things you can smell, and 1 thing you can taste.",
    "metadata": {
      "category": "anxiety_management",
      "tags": ["grounding", "anxiety", "coping_strategies"],
      "source": "therapy_handbook"
    }
  }'
```

### **3. Query Priya for Relationship Advice**

```bash
curl -X POST "http://localhost:3001/persona-rag/PRIYA/query" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How can I better communicate with my boyfriend?"
  }'
```

**Response:**

```json
{
  "success": true,
  "answer": "Baby, communication is super important in relationships! 🥰 Based on what I know, understanding love languages really helps. [Source 1] Maybe try expressing love in ways your boyfriend feels most appreciated - like quality time together or words of affirmation. What's his love language?",
  "confidence": 0.89,
  "sources": [...]
}
```

## 🔧 Migration from Old System

If you have existing documents in the old unified system:

```bash
# Check current documents (if any)
GET /rag/stats

# Migrate to persona-specific tables (if needed)
POST /persona-rag/migrate
```

## 📊 Monitoring & Analytics

### **Check Persona Health**

```bash
# Check if Priya has knowledge
GET /persona-rag/PRIYA/health

# Response:
{
  "success": true,
  "health": {
    "personaType": "PRIYA",
    "hasDocuments": true,
    "totalDocuments": 25,
    "categories": ["relationships", "dating", "communication"],
    "lastUpdate": "2024-01-15T10:30:00Z",
    "status": "active"
  }
}
```

### **Get All Personas Status**

```bash
GET /persona-rag/personas

# Response:
{
  "success": true,
  "personas": [
    {
      "personaType": "PRIYA",
      "displayName": "AI Girlfriend (Priya)",
      "totalDocuments": 25,
      "hasDocuments": true
    },
    {
      "personaType": "THERAPIST",
      "displayName": "AI Therapist",
      "totalDocuments": 18,
      "hasDocuments": true
    },
    // ...
  ]
}
```

## 🎯 Best Practices

### **1. Content Categorization**

**Priya (AI Girlfriend):**

- Relationships & dating advice
- Communication tips
- Emotional support
- Romantic gestures

**Therapist:**

- Mental health techniques
- Coping strategies
- Mindfulness practices
- Therapeutic approaches

**Dietician:**

- Nutrition information
- Meal planning
- Health tips
- Exercise guidance

**Career:**

- Professional development
- Interview preparation
- Resume writing
- Industry insights

### **2. Document Metadata**

Always include relevant metadata:

```typescript
{
  "content": "Document content...",
  "metadata": {
    "category": "specific_category",
    "tags": ["relevant", "tags"],
    "source": "content_source",
    "difficulty": "beginner|intermediate|advanced",
    "lastUpdated": "2024-01-15"
  }
}
```

### **3. Query Optimization**

```typescript
// Use appropriate thresholds for each persona
const searchOptions = {
  PRIYA: { threshold: 0.7, limit: 3 }, // More lenient for casual advice
  THERAPIST: { threshold: 0.8, limit: 5 }, // Higher precision for therapy
  DIETICIAN: { threshold: 0.75, limit: 4 }, // Balanced for health info
  CAREER: { threshold: 0.8, limit: 5 }, // Higher precision for career advice
};
```

## ✅ You're Ready!

Your persona-specific RAG system is now set up! Each AI persona has its own dedicated knowledge base, ensuring:

- 🎯 **Focused responses** - No cross-contamination between personas
- ⚡ **Better performance** - Faster searches in smaller, optimized databases
- 📊 **Clear analytics** - Track knowledge base health per persona
- 🔧 **Easy management** - Add/remove content per persona independently

Start by adding documents to each persona's knowledge base and watch your AI personalities become more knowledgeable and focused in their respective domains!
