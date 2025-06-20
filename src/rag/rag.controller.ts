import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Delete,
  Param,
  Put,
  Logger,
} from '@nestjs/common';
import { RagService } from './rag.service';
import {
  DocumentMetadata,
  DocumentProcessingOptions,
  SearchOptions,
  DocumentType,
} from './interfaces/rag.interface';
import { AiPersonaType } from '../ai-personas/interfaces/ai-persona.interface';

@Controller('rag')
export class RagController {
  private readonly logger = new Logger(RagController.name);

  constructor(private readonly ragService: RagService) {}

  @Post('document')
  async addDocument(
    @Body()
    body: {
      content: string;
      metadata?: Partial<DocumentMetadata>;
      options?: DocumentProcessingOptions;
    },
  ) {
    this.logger.log('Adding single document');
    const result = await this.ragService.addDocument(
      body.content,
      body.metadata,
      body.options,
    );
    return { success: true, documentIds: result };
  }

  @Get('search')
  async searchDocuments(
    @Query('query') query: string,
    @Query('limit') limit?: string,
    @Query('threshold') threshold?: string,
    @Query('personaType') personaType?: AiPersonaType,
    @Query('category') category?: string,
    @Query('documentType') documentType?: DocumentType,
    @Query('includeMetadata') includeMetadata?: string,
  ) {
    const options: SearchOptions = {
      limit: limit ? parseInt(limit, 10) : undefined,
      threshold: threshold ? parseFloat(threshold) : undefined,
      personaType,
      category,
      documentType,
      includeMetadata: includeMetadata === 'true',
    };

    this.logger.log(`Searching documents for: "${query}"`);
    const results = await this.ragService.searchSimilarDocuments(
      query,
      options,
    );
    return { success: true, results };
  }

  @Post('query')
  async queryWithRAG(
    @Body()
    body: {
      query: string;
      personaType?: AiPersonaType;
      searchOptions?: SearchOptions;
    },
  ) {
    this.logger.log(`RAG query: "${body.query}"`);
    const result = await this.ragService.generateRAGResponse(
      body.query,
      body.personaType,
      body.searchOptions,
    );
    return { success: true, ...result };
  }

  @Post('query/simple')
  async queryWithContext(@Body() body: { query: string; context: string }) {
    this.logger.log(`Simple query: "${body.query}"`);
    const result = await this.ragService.generateResponse(
      body.query,
      body.context,
    );
    return { success: true, answer: result };
  }

  @Delete('document/:id')
  async deleteDocument(@Param('id') id: string) {
    this.logger.log(`Deleting document: ${id}`);
    await this.ragService.deleteDocument(id);
    return { success: true, message: 'Document deleted successfully' };
  }

  @Put('document/:id/metadata')
  async updateDocumentMetadata(
    @Param('id') id: string,
    @Body() metadata: Partial<DocumentMetadata>,
  ) {
    this.logger.log(`Updating metadata for document: ${id}`);
    await this.ragService.updateDocumentMetadata(id, metadata);
    return { success: true, message: 'Document metadata updated successfully' };
  }

  @Get('stats')
  async getDocumentStats() {
    this.logger.log('Getting document statistics');
    const stats = await this.ragService.getDocumentStats();
    return { success: true, stats };
  }

  @Get('debug/documents')
  async debugDocuments() {
    try {
      this.logger.log('Debug: Fetching raw documents');
      const result = await this.ragService.debugGetDocuments();
      return { success: true, ...result };
    } catch (error) {
      this.logger.error('Debug documents error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
