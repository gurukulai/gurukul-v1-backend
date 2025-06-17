export interface DocumentMetadata {
  title?: string;
  source?: string;
  author?: string;
  category?: string;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  personaType?: string; // Link to specific personas if needed
  documentType: DocumentType;
  chunkIndex?: number;
  totalChunks?: number;
  originalDocumentId?: string;
}

export enum DocumentType {
  TEXT = 'text',
  PDF = 'pdf',
  MARKDOWN = 'markdown',
  HTML = 'html',
  URL = 'url',
  CONVERSATION = 'conversation',
}

export interface ProcessedDocument {
  id?: string;
  content: string;
  metadata: DocumentMetadata;
  embedding?: number[];
  similarity?: number;
}

export interface DocumentChunk {
  content: string;
  metadata: DocumentMetadata;
  chunkIndex: number;
  totalChunks: number;
}

export interface SearchResult {
  document: ProcessedDocument;
  similarity: number;
  relevanceScore: number;
}

export interface RAGResponse {
  answer: string;
  sources: SearchResult[];
  confidence: number;
  usedContext: string;
}

export interface DocumentProcessingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  preserveMetadata?: boolean;
  customSplitter?: 'sentence' | 'paragraph' | 'token';
}

export interface SearchOptions {
  limit?: number;
  threshold?: number;
  personaType?: string;
  category?: string;
  documentType?: DocumentType;
  includeMetadata?: boolean;
}
