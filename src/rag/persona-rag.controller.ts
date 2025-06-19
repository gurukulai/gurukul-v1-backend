import {
  Controller,
  Post,
  Get,
  Delete,
  Put,
  Body,
  Param,
  Query,
  Logger,
} from '@nestjs/common';
import { PersonaRagService } from './persona-rag.service';
import {
  DocumentMetadata,
  DocumentProcessingOptions,
  SearchOptions,
  DocumentType,
} from './interfaces/rag.interface';
import { AiPersonaType } from '../ai-personas/interfaces/ai-persona.interface';

@Controller('persona-rag')
export class PersonaRagController {
  private readonly logger = new Logger(PersonaRagController.name);

  constructor(private readonly personaRagService: PersonaRagService) {}

  @Post(':personaType/document')
  async addDocument(
    @Param('personaType') personaType: AiPersonaType,
    @Body()
    body: {
      content: string;
      metadata?: Partial<DocumentMetadata>;
      options?: DocumentProcessingOptions;
    },
  ) {
    this.logger.log(
      `Adding document to ${personaType}: "${body.content.substring(0, 50)}..."`,
    );
    const documentIds = await this.personaRagService.addDocumentToPersona(
      body.content,
      personaType,
      body.metadata,
      body.options,
    );
    return { success: true, documentIds };
  }

  @Post(':personaType/documents')
  async addDocuments(
    @Param('personaType') personaType: AiPersonaType,
    @Body()
    body: {
      documents: Array<{
        content: string;
        metadata?: Partial<DocumentMetadata>;
        options?: DocumentProcessingOptions;
      }>;
    },
  ) {
    this.logger.log(
      `Adding ${body.documents.length} documents to ${personaType}`,
    );
    const documentIds = await this.personaRagService.addDocumentsToPersona(
      personaType,
      body.documents,
    );
    return { success: true, documentIds };
  }

  @Get(':personaType/search')
  async searchDocuments(
    @Param('personaType') personaType: AiPersonaType,
    @Query('query') query: string,
    @Query('limit') limit?: string,
    @Query('threshold') threshold?: string,
    @Query('category') category?: string,
    @Query('documentType') documentType?: DocumentType,
    @Query('includeMetadata') includeMetadata?: string,
  ) {
    const options: SearchOptions = {
      limit: limit ? parseInt(limit, 10) : undefined,
      threshold: threshold ? parseFloat(threshold) : undefined,
      category,
      documentType,
      includeMetadata: includeMetadata === 'true',
    };

    this.logger.log(`Searching ${personaType} documents for: "${query}"`);
    const results = await this.personaRagService.searchSimilarDocuments(
      query,
      personaType,
      options,
    );
    return { success: true, results };
  }

  @Post(':personaType/query')
  async queryWithRAG(
    @Param('personaType') personaType: AiPersonaType,
    @Body()
    body: {
      query: string;
      searchOptions?: SearchOptions;
    },
  ) {
    this.logger.log(`RAG query for ${personaType}: "${body.query}"`);
    const result = await this.personaRagService.generatePersonaRAGResponse(
      body.query,
      personaType,
      body.searchOptions,
    );
    return { success: true, ...result };
  }

  @Delete(':personaType/document/:documentId')
  async deleteDocument(
    @Param('personaType') personaType: AiPersonaType,
    @Param('documentId') documentId: string,
  ) {
    this.logger.log(`Deleting document ${documentId} from ${personaType}`);
    await this.personaRagService.deleteDocument(documentId, personaType);
    return { success: true };
  }

  @Put(':personaType/document/:documentId/metadata')
  async updateDocumentMetadata(
    @Param('personaType') personaType: AiPersonaType,
    @Param('documentId') documentId: string,
    @Body() body: { metadata: Partial<DocumentMetadata> },
  ) {
    this.logger.log(
      `Updating metadata for document ${documentId} in ${personaType}`,
    );
    await this.personaRagService.updateDocumentMetadata(
      documentId,
      body.metadata,
      personaType,
    );
    return { success: true };
  }

  @Get(':personaType/stats')
  async getPersonaStats(@Param('personaType') personaType: AiPersonaType) {
    this.logger.log(`Getting stats for ${personaType}`);
    const stats =
      await this.personaRagService.getPersonaDocumentStats(personaType);
    return { success: true, stats };
  }

  @Get('stats')
  async getAllStats() {
    this.logger.log('Getting stats for all personas');
    const stats = await this.personaRagService.getAllPersonasStats();
    return { success: true, stats };
  }

  @Get('personas')
  async getAvailablePersonas() {
    this.logger.log('Getting available personas');
    const personas = await this.personaRagService.getAvailablePersonas();
    return { success: true, personas };
  }

  @Delete(':personaType/documents')
  async clearPersonaDocuments(
    @Param('personaType') personaType: AiPersonaType,
  ) {
    this.logger.log(`Clearing all documents from ${personaType}`);
    const deletedCount =
      await this.personaRagService.clearPersonaDocuments(personaType);
    return { success: true, deletedCount };
  }

  @Get(':personaType/debug/documents')
  async debugPersonaDocuments(
    @Param('personaType') personaType: AiPersonaType,
  ) {
    try {
      this.logger.log(`Debug: Fetching raw documents for ${personaType}`);
      const result =
        await this.personaRagService.debugGetPersonaDocuments(personaType);
      return { success: true, debug: result };
    } catch (error) {
      this.logger.error(`Debug documents error for ${personaType}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Get(':personaType/health')
  async checkPersonaHealth(@Param('personaType') personaType: AiPersonaType) {
    this.logger.log(`Health check for ${personaType}`);
    const hasDocuments =
      await this.personaRagService.hasPersonaDocuments(personaType);
    const stats =
      await this.personaRagService.getPersonaDocumentStats(personaType);

    return {
      success: true,
      health: {
        personaType,
        hasDocuments,
        totalDocuments: stats.totalDocuments,
        categories: Object.keys(stats.documentsByCategory),
        lastUpdate: stats.latestDocumentDate,
        status: hasDocuments ? 'active' : 'empty',
      },
    };
  }

  @Post('migrate')
  async migrateFromUnified() {
    this.logger.log('Starting migration from unified database');
    const result = await this.personaRagService.migrateFromUnifiedDatabase();
    return { success: true, migration: result };
  }

  // Legacy compatibility endpoints (for existing integrations)
  @Post('query')
  async legacyQuery(
    @Body()
    body: {
      query: string;
      personaType?: AiPersonaType;
      searchOptions?: SearchOptions;
    },
  ) {
    const personaType = body.personaType || 'PRIYA'; // Default to PRIYA
    this.logger.log(`Legacy RAG query for ${personaType}: "${body.query}"`);

    const result = await this.personaRagService.generatePersonaRAGResponse(
      body.query,
      personaType,
      body.searchOptions,
    );
    return { success: true, ...result };
  }

  @Get('search')
  async legacySearch(
    @Query('query') query: string,
    @Query('personaType') personaType?: AiPersonaType,
    @Query('limit') limit?: string,
    @Query('threshold') threshold?: string,
    @Query('category') category?: string,
    @Query('documentType') documentType?: DocumentType,
    @Query('includeMetadata') includeMetadata?: string,
  ) {
    const targetPersona = personaType || 'PRIYA'; // Default to PRIYA
    const options: SearchOptions = {
      limit: limit ? parseInt(limit, 10) : undefined,
      threshold: threshold ? parseFloat(threshold) : undefined,
      category,
      documentType,
      includeMetadata: includeMetadata === 'true',
    };

    this.logger.log(`Legacy search in ${targetPersona} for: "${query}"`);
    const results = await this.personaRagService.searchSimilarDocuments(
      query,
      targetPersona,
      options,
    );
    return { success: true, results };
  }
}
