import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from '@langchain/core/documents';

/**
 * Utility functions for Pinecone operations
 */

export interface ChunkingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
}

export interface MetadataEnhancer {
  (metadata: Record<string, unknown>): Record<string, unknown>;
}

/**
 * Split text into chunks for vector storage
 */
export async function chunkText(
  text: string,
  options: ChunkingOptions = {},
): Promise<string[]> {
  const {
    chunkSize = 1000,
    chunkOverlap = 200,
    separators = ['\n\n', '\n', ' ', ''],
  } = options;

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators,
  });

  return await textSplitter.splitText(text);
}

/**
 * Convert text chunks to LangChain documents
 */
export function chunksToDocuments(
  chunks: string[],
  baseMetadata: Record<string, unknown> = {},
  originalId?: string,
): Document[] {
  return chunks.map((chunk, index) => {
    const metadata = {
      ...baseMetadata,
      chunkIndex: index,
      totalChunks: chunks.length,
    };

    if (originalId) {
      metadata.originalId = originalId;
    }

    return new Document({
      pageContent: chunk,
      metadata,
    });
  });
}

/**
 * Validate Pinecone document structure
 */
export function validateDocument(document: {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  namespace?: string;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!document.id || typeof document.id !== 'string') {
    errors.push('Document ID is required and must be a string');
  }

  if (!document.content || typeof document.content !== 'string') {
    errors.push('Document content is required and must be a string');
  }

  if (document.content.length === 0) {
    errors.push('Document content cannot be empty');
  }

  if (document.metadata && typeof document.metadata !== 'object') {
    errors.push('Document metadata must be an object');
  }

  if (document.namespace && typeof document.namespace !== 'string') {
    errors.push('Document namespace must be a string');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Enhance metadata with additional information
 */
export function enhanceMetadata(
  baseMetadata: Record<string, unknown>,
  enhancers: MetadataEnhancer[] = [],
): Record<string, unknown> {
  let enhancedMetadata = { ...baseMetadata };

  for (const enhancer of enhancers) {
    enhancedMetadata = enhancer(enhancedMetadata);
  }

  return enhancedMetadata;
}

/**
 * Create timestamp metadata enhancer
 */
export function createTimestampEnhancer(): MetadataEnhancer {
  return (metadata) => ({
    ...metadata,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Create source metadata enhancer
 */
export function createSourceEnhancer(source: string): MetadataEnhancer {
  return (metadata) => ({
    ...metadata,
    source,
  });
}

/**
 * Create user metadata enhancer
 */
export function createUserEnhancer(userId: string): MetadataEnhancer {
  return (metadata) => ({
    ...metadata,
    userId,
  });
}

/**
 * Sanitize metadata for Pinecone storage
 */
export function sanitizeMetadata(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    // Pinecone has restrictions on metadata values
    if (value !== null && value !== undefined) {
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        sanitized[key] = value;
      } else if (Array.isArray(value)) {
        // Convert arrays to strings for storage
        sanitized[key] = JSON.stringify(value);
      } else if (typeof value === 'object') {
        // Convert objects to strings for storage
        sanitized[key] = JSON.stringify(value);
      }
    }
  }

  return sanitized;
}

/**
 * Parse metadata from Pinecone storage
 */
export function parseMetadata(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const parsed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === 'string') {
      try {
        // Try to parse JSON strings back to objects/arrays
        const parsedValue = JSON.parse(value);
        parsed[key] = parsedValue;
      } catch {
        // If parsing fails, keep as string
        parsed[key] = value;
      }
    } else {
      parsed[key] = value;
    }
  }

  return parsed;
}

/**
 * Generate a unique document ID
 */
export function generateDocumentId(prefix = 'doc'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Calculate text statistics
 */
export function calculateTextStats(text: string): {
  characterCount: number;
  wordCount: number;
  lineCount: number;
  estimatedTokens: number;
} {
  const characterCount = text.length;
  const wordCount = text.split(/\s+/).filter((word) => word.length > 0).length;
  const lineCount = text.split('\n').length;
  const estimatedTokens = Math.ceil(characterCount / 4); // Rough estimation

  return {
    characterCount,
    wordCount,
    lineCount,
    estimatedTokens,
  };
}

/**
 * Batch array into smaller chunks
 */
export function batchArray<T>(array: T[], batchSize: number): T[][] {
  const batches: T[][] = [];

  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }

  return batches;
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
