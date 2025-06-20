# Pinecone Module

A comprehensive Pinecone vector database integration module for the Gurukul Backend, built with LangChain.js and NestJS.

## Features

- 🔍 **Vector Search**: Semantic similarity search using OpenAI embeddings
- 📚 **Document Management**: Add, update, and delete documents with metadata
- 🗂️ **Namespace Support**: Organize documents into separate namespaces
- 📖 **Large Document Processing**: Automatic text chunking for large documents
- 🔄 **Hybrid Search**: Combine vector similarity with metadata filtering
- 📊 **Statistics & Monitoring**: Get index statistics and health checks
- 🛡️ **Error Handling**: Comprehensive error handling with retry logic
- 🧹 **Data Sanitization**: Automatic metadata sanitization for Pinecone storage

## Prerequisites

1. **Pinecone Account**: Sign up at [pinecone.io](https://pinecone.io)
2. **Environment Variables**: Add the following to your `.env` file:

```env
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_pinecone_environment
PINECONE_INDEX_NAME=gurukul-index
OPENAI_API_KEY=your_openai_api_key
```

## Installation

The module is already installed with the required dependencies:

```bash
npm install @pinecone-database/pinecone @langchain/pinecone
```

## Module Structure

```
src/pinecone/
├── pinecone.module.ts          # Main module definition
├── pinecone.service.ts         # Core service with all operations
├── pinecone.controller.ts      # REST API endpoints
├── interfaces/
│   └── pinecone.interface.ts   # TypeScript interfaces
├── utils/
│   └── pinecone.utils.ts       # Utility functions
└── README.md                   # This documentation
```

## Usage

### 1. Import the Module

Add `PineconeModule` to your app module:

```typescript
import { PineconeModule } from './pinecone/pinecone.module';

@Module({
  imports: [
    // ... other modules
    PineconeModule,
  ],
})
export class AppModule {}
```

### 2. Inject the Service

```typescript
import { PineconeService } from './pinecone/pinecone.service';

@Injectable()
export class YourService {
  constructor(private readonly pineconeService: PineconeService) {}
}
```

### 3. Basic Operations

#### Add a Single Document

```typescript
await this.pineconeService.addDocument({
  id: 'doc-1',
  content: 'This is the document content',
  metadata: { category: 'education', author: 'John Doe' },
  namespace: 'academic',
});
```

#### Add Multiple Documents

```typescript
await this.pineconeService.addDocuments([
  {
    id: 'doc-1',
    content: 'First document content',
    metadata: { category: 'science' },
  },
  {
    id: 'doc-2',
    content: 'Second document content',
    metadata: { category: 'history' },
  },
]);
```

#### Add Large Document with Chunking

```typescript
await this.pineconeService.addLargeDocument(
  'large-doc-1',
  'Very long document content...',
  { category: 'research' },
  'research-namespace',
  1000, // chunk size
  200, // chunk overlap
);
```

#### Search Documents

```typescript
const results = await this.pineconeService.search(
  'What is machine learning?',
  5, // number of results
  'academic', // namespace
  { category: 'science' }, // metadata filter
);
```

#### Hybrid Search

```typescript
const results = await this.pineconeService.hybridSearch(
  'machine learning algorithms',
  5,
  'academic',
  { category: 'computer-science' },
  0.7, // minimum similarity score
);
```

## API Endpoints

### Document Management

#### Add Single Document

```http
POST /pinecone/documents
Content-Type: application/json

{
  "id": "doc-1",
  "content": "Document content",
  "metadata": { "category": "education" },
  "namespace": "academic"
}
```

#### Add Multiple Documents

```http
POST /pinecone/documents/batch
Content-Type: application/json

{
  "documents": [
    {
      "id": "doc-1",
      "content": "First document",
      "metadata": { "category": "science" }
    },
    {
      "id": "doc-2",
      "content": "Second document",
      "metadata": { "category": "history" }
    }
  ]
}
```

#### Add Large Document

```http
POST /pinecone/documents/large
Content-Type: application/json

{
  "id": "large-doc-1",
  "content": "Very long document content...",
  "metadata": { "category": "research" },
  "namespace": "research",
  "chunkSize": 1000,
  "chunkOverlap": 200
}
```

### Search Operations

#### Basic Search

```http
GET /pinecone/search?query=machine learning&k=5&namespace=academic
```

#### Hybrid Search

```http
POST /pinecone/search/hybrid
Content-Type: application/json

{
  "query": "machine learning algorithms",
  "k": 5,
  "namespace": "academic",
  "filter": { "category": "computer-science" },
  "minScore": 0.7
}
```

### Document Management

#### Delete Documents

```http
DELETE /pinecone/documents
Content-Type: application/json

{
  "ids": ["doc-1", "doc-2"],
  "namespace": "academic"
}
```

#### Delete Namespace

```http
DELETE /pinecone/namespaces/academic
```

#### Update Document Metadata

```http
PUT /pinecone/documents/doc-1/metadata?namespace=academic
Content-Type: application/json

{
  "metadata": { "category": "updated-category" }
}
```

#### Get Documents by IDs

```http
GET /pinecone/documents?ids=doc-1,doc-2&namespace=academic
```

### Monitoring & Statistics

#### Get Index Statistics

```http
GET /pinecone/stats
```

#### List Namespaces

```http
GET /pinecone/namespaces
```

#### Health Check

```http
GET /pinecone/health
```

## Utility Functions

The module includes utility functions for common operations:

### Text Chunking

```typescript
import { chunkText } from './pinecone/utils/pinecone.utils';

const chunks = await chunkText('Long document content...', {
  chunkSize: 1000,
  chunkOverlap: 200,
});
```

### Document Validation

```typescript
import { validateDocument } from './pinecone/utils/pinecone.utils';

const validation = validateDocument({
  id: 'doc-1',
  content: 'Document content',
});

if (!validation.isValid) {
  console.log('Validation errors:', validation.errors);
}
```

### Metadata Enhancement

```typescript
import {
  enhanceMetadata,
  createTimestampEnhancer,
  createSourceEnhancer,
} from './pinecone/utils/pinecone.utils';

const enhancedMetadata = enhanceMetadata({ category: 'education' }, [
  createTimestampEnhancer(),
  createSourceEnhancer('web-scraping'),
]);
```

## Error Handling

The module includes comprehensive error handling:

- **Automatic retries** with exponential backoff
- **Input validation** for all operations
- **Graceful degradation** when Pinecone is unavailable
- **Detailed error messages** for debugging

## Performance Considerations

1. **Batch Operations**: Use batch endpoints for multiple documents
2. **Chunking**: Large documents are automatically chunked for better search
3. **Namespaces**: Use namespaces to organize and filter data
4. **Metadata Filtering**: Use metadata filters to improve search relevance

## Security

- API keys are stored in environment variables
- Input validation prevents malicious data
- Metadata sanitization prevents injection attacks
- Namespace isolation provides data separation

## Monitoring

Use the health check endpoint to monitor the service:

```typescript
const health = await this.pineconeService.healthCheck();
console.log('Service status:', health.status);
```

## Troubleshooting

### Common Issues

1. **Index Not Found**: Ensure the index name is correct in environment variables
2. **Authentication Errors**: Verify Pinecone API key and environment
3. **Rate Limiting**: Implement retry logic for rate-limited requests
4. **Memory Issues**: Use chunking for large documents

### Debug Mode

Enable debug logging by setting the log level:

```typescript
// In your service
this.logger.setLogLevels(['debug']);
```

## Examples

### Complete RAG Implementation

```typescript
@Injectable()
export class RAGService {
  constructor(private readonly pineconeService: PineconeService) {}

  async addKnowledgeBase(documents: string[], metadata: any) {
    for (const [index, content] of documents.entries()) {
      await this.pineconeService.addDocument({
        id: `kb-${index}`,
        content,
        metadata: { ...metadata, index },
      });
    }
  }

  async searchKnowledgeBase(query: string, context: string) {
    const results = await this.pineconeService.hybridSearch(
      query,
      5,
      context,
      { type: 'knowledge-base' },
      0.7,
    );

    return results.map((r) => r.content).join('\n\n');
  }
}
```

### Multi-tenant Setup

```typescript
async addUserDocument(userId: string, content: string) {
  await this.pineconeService.addDocument({
    id: generateDocumentId(),
    content,
    metadata: { userId, type: 'user-document' },
    namespace: `user-${userId}`
  });
}

async searchUserDocuments(userId: string, query: string) {
  return await this.pineconeService.search(
    query,
    10,
    `user-${userId}`,
    { type: 'user-document' }
  );
}
```

## Contributing

When contributing to this module:

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure error handling is comprehensive
5. Validate all inputs

## License

This module is part of the Gurukul Backend project.
