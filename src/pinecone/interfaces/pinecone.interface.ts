export interface PineconeDocument {
  id: string;
  content: string;
  metadata?: Record<string, any>;
  namespace?: string;
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface PineconeStats {
  totalVectors: number;
  namespaces: string[];
  indexName: string;
  dimension: number;
}

export interface PineconeHealth {
  status: 'healthy' | 'unhealthy';
  details: {
    indexName?: string;
    totalVectors?: number;
    namespaces?: string[];
    error?: string;
  };
}

export interface SearchOptions {
  k?: number;
  namespace?: string;
  filter?: Record<string, any>;
  minScore?: number;
}

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    originalId: string;
    chunkIndex: number;
    totalChunks: number;
    [key: string]: any;
  };
}

export interface BatchOperationResult {
  success: boolean;
  message: string;
  processedCount?: number;
  errors?: string[];
}

export interface VectorStoreConfig {
  indexName: string;
  dimension: number;
  metric: 'cosine' | 'euclidean' | 'dotproduct';
  environment: string;
  apiKey: string;
}
