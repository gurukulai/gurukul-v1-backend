// src/documents/documents.service.ts
import { Injectable } from '@nestjs/common';
import { PineconeService } from '../pinecone/pinecone.service';
import { ExpertsService } from './experts.service';
import { UploadDocumentDto } from './dto/experts.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private pineconeService: PineconeService,
    private expertsService: ExpertsService,
  ) {}

  async uploadDocument(uploadDocumentDto: UploadDocumentDto): Promise<{
    success: boolean;
    chunksCreated: number;
    message: string;
  }> {
    const expert = this.expertsService.getExpert(uploadDocumentDto.expertId);

    if (!expert) {
      throw new Error(`Expert with ID ${uploadDocumentDto.expertId} not found`);
    }

    const metadata = {
      title: uploadDocumentDto.title,
      expertId: uploadDocumentDto.expertId,
      expertName: expert.name,
      ...uploadDocumentDto.metadata,
    };

    await this.pineconeService.uploadDocumentForExpert(
      expert.namespace,
      uploadDocumentDto.content,
      metadata,
    );

    // Estimate chunk count (rough calculation)
    const estimatedChunks = Math.ceil(uploadDocumentDto.content.length / 800);

    return {
      success: true,
      chunksCreated: estimatedChunks,
      message: `Document uploaded successfully to expert ${expert.name}`,
    };
  }
}
