// src/experts/entities/expert.entity.ts
export interface Expert {
  id: string;
  name: string;
  description: string;
  namespace: string; // Pinecone namespace - each expert is a separate class/namespace
  createdAt: Date;
  updatedAt: Date;
  // Optional fields for enhanced Pinecone class management
  vectorCount?: number; // Number of vectors in this expert's namespace
  lastTrained?: Date; // When the expert was last updated with new documents
  isActive?: boolean; // Whether this expert class is active
}

// src/experts/dto/create-expert.dto.ts
export interface CreateExpertDto {
  name: string;
  description: string;
}

// src/documents/dto/upload-document.dto.ts
export interface UploadDocumentDto {
  expertId: string; // References the expert class/namespace
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface UploadDocumentToPineconeDto {
  expertName: string; // References the expert class/namespace
  content: string;
  metadata?: Record<string, unknown>;
}
