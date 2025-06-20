// src/experts/entities/expert.entity.ts
export interface Expert {
  id: string;
  name: string;
  description: string;
  namespace: string; // Pinecone namespace
  expertise: string[];
  createdAt: Date;
  updatedAt: Date;
}

// src/experts/dto/create-expert.dto.ts
export interface CreateExpertDto {
  name: string;
  description: string;
  expertise: string[];
}

// src/documents/dto/upload-document.dto.ts
export interface UploadDocumentDto {
  expertId: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}
