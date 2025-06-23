import {
  DocumentMetadata,
  DocumentProcessingOptions,
  SearchOptions,
  DocumentType,
} from '../interfaces/rag.interface';
import { PersonaType } from '../../ai-personas/interfaces';

export interface AddDocumentDto {
  content: string;
  metadata?: Partial<DocumentMetadata>;
  options?: DocumentProcessingOptions;
}

export interface AddDocumentsDto {
  documents: Array<{
    content: string;
    metadata?: Partial<DocumentMetadata>;
    options?: DocumentProcessingOptions;
  }>;
}

export interface SearchDocumentsDto {
  query: string;
  limit?: number;
  threshold?: number;
  personaType?: PersonaType;
  category?: string;
  documentType?: DocumentType;
  includeMetadata?: boolean;
}

export interface RAGQueryDto {
  query: string;
  personaType?: PersonaType;
  searchOptions?: SearchOptions;
}

export interface SimpleQueryDto {
  query: string;
  context: string;
}

export interface UpdateDocumentMetadataDto {
  metadata: Partial<DocumentMetadata>;
}

export interface DocumentResponseDto {
  success: boolean;
  documentIds: string[];
}

export interface SearchResponseDto {
  success: boolean;
  results: Array<{
    document: {
      id?: string;
      content: string;
      metadata: DocumentMetadata;
    };
    similarity: number;
    relevanceScore: number;
  }>;
}

export interface RAGResponseDto {
  success: boolean;
  answer: string;
  sources: Array<{
    document: {
      id?: string;
      content: string;
      metadata: DocumentMetadata;
    };
    similarity: number;
    relevanceScore: number;
  }>;
  confidence: number;
  usedContext: string;
}

export interface SimpleResponseDto {
  success: boolean;
  answer: string;
}

export interface DeleteResponseDto {
  success: boolean;
  message: string;
}

export interface UpdateResponseDto {
  success: boolean;
  message: string;
}

export interface StatsResponseDto {
  success: boolean;
  stats: {
    totalDocuments: number;
    documentsByType: Record<string, number>;
    documentsByPersona: Record<string, number>;
  };
}

export interface HealthResponseDto {
  success: boolean;
  status: string;
  timestamp: string;
  service: string;
}
