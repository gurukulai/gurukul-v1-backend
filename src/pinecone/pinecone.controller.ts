import {
  Controller,
  Post,
  Get,
  Delete,
  Put,
  Body,
  Query,
  Param,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  PineconeService,
  PineconeDocument,
  SearchResult,
} from './pinecone.service';

export class AddDocumentDto {
  id!: string;
  content!: string;
  metadata?: Record<string, unknown>;
  namespace?: string;
}

export class AddDocumentsDto {
  documents!: PineconeDocument[];
}

export class SearchDto {
  query!: string;
  k?: number;
  namespace?: string;
  filter?: Record<string, unknown>;
  minScore?: number;
}

export class UpdateMetadataDto {
  metadata!: Record<string, unknown>;
}

@Controller('pinecone')
export class PineconeController {
  private readonly logger = new Logger(PineconeController.name);

  constructor(private readonly pineconeService: PineconeService) {}

  @Post('documents')
  async addDocument(@Body() addDocumentDto: AddDocumentDto) {
    try {
      await this.pineconeService.addDocument(addDocumentDto);
      return {
        success: true,
        message: `Document ${addDocumentDto.id} added successfully`,
      };
    } catch (error) {
      this.logger.error('Error adding document:', error);
      throw new HttpException(
        `Failed to add document: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('documents/batch')
  async addDocuments(@Body() addDocumentsDto: AddDocumentsDto) {
    try {
      await this.pineconeService.addDocuments(addDocumentsDto.documents);
      return {
        success: true,
        message: `${addDocumentsDto.documents.length} documents added successfully`,
      };
    } catch (error) {
      this.logger.error('Error adding documents:', error);
      throw new HttpException(
        `Failed to add documents: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('documents/large')
  async addLargeDocument(
    @Body()
    body: {
      id: string;
      content: string;
      metadata?: Record<string, unknown>;
      namespace?: string;
      chunkSize?: number;
      chunkOverlap?: number;
    },
  ) {
    try {
      await this.pineconeService.addLargeDocument(
        body.id,
        body.content,
        body.metadata,
        body.namespace,
        body.chunkSize,
        body.chunkOverlap,
      );
      return {
        success: true,
        message: `Large document ${body.id} processed and added successfully`,
      };
    } catch (error) {
      this.logger.error('Error adding large document:', error);
      throw new HttpException(
        `Failed to add large document: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('search')
  async search(
    @Query() searchDto: SearchDto,
  ): Promise<{ results: SearchResult[] }> {
    try {
      const results = await this.pineconeService.search(
        searchDto.query,
        searchDto.k,
        searchDto.namespace,
        searchDto.filter,
      );
      return { results };
    } catch (error) {
      this.logger.error('Error searching documents:', error);
      throw new HttpException(
        `Search failed: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('search/hybrid')
  async hybridSearch(
    @Body() searchDto: SearchDto,
  ): Promise<{ results: SearchResult[] }> {
    try {
      const results = await this.pineconeService.hybridSearch(
        searchDto.query,
        searchDto.k,
        searchDto.namespace,
        searchDto.filter,
        searchDto.minScore,
      );
      return { results };
    } catch (error) {
      this.logger.error('Error in hybrid search:', error);
      throw new HttpException(
        `Hybrid search failed: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('documents')
  async deleteDocuments(@Body() body: { ids: string[]; namespace?: string }) {
    try {
      await this.pineconeService.deleteDocuments(body.ids, body.namespace);
      return {
        success: true,
        message: `${body.ids.length} documents deleted successfully`,
      };
    } catch (error) {
      this.logger.error('Error deleting documents:', error);
      throw new HttpException(
        `Failed to delete documents: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('namespaces/:namespace')
  async deleteNamespace(@Param('namespace') namespace: string) {
    try {
      await this.pineconeService.deleteNamespace(namespace);
      return {
        success: true,
        message: `Namespace ${namespace} deleted successfully`,
      };
    } catch (error) {
      this.logger.error('Error deleting namespace:', error);
      throw new HttpException(
        `Failed to delete namespace: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('documents/:id/metadata')
  async updateDocumentMetadata(
    @Param('id') id: string,
    @Body() updateMetadataDto: UpdateMetadataDto,
    @Query('namespace') namespace?: string,
  ) {
    try {
      await this.pineconeService.updateDocumentMetadata(
        id,
        updateMetadataDto.metadata,
        namespace,
      );
      return {
        success: true,
        message: `Metadata updated for document ${id}`,
      };
    } catch (error) {
      this.logger.error('Error updating document metadata:', error);
      throw new HttpException(
        `Failed to update metadata: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('documents')
  async getDocuments(
    @Query('ids') ids: string,
    @Query('namespace') namespace?: string,
  ): Promise<{ results: SearchResult[] }> {
    try {
      const documentIds = ids.split(',').map((id) => id.trim());
      const results = await this.pineconeService.getDocuments(
        documentIds,
        namespace,
      );
      return { results };
    } catch (error) {
      this.logger.error('Error fetching documents:', error);
      throw new HttpException(
        `Failed to fetch documents: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  async getStats() {
    try {
      const stats = await this.pineconeService.getStats();
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      this.logger.error('Error getting stats:', error);
      throw new HttpException(
        `Failed to get stats: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('namespaces')
  async listNamespaces() {
    try {
      const namespaces = await this.pineconeService.listNamespaces();
      return {
        success: true,
        namespaces,
      };
    } catch (error) {
      this.logger.error('Error listing namespaces:', error);
      throw new HttpException(
        `Failed to list namespaces: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health')
  async healthCheck() {
    try {
      const health = await this.pineconeService.healthCheck();
      return {
        success: true,
        ...health,
      };
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        success: false,
        status: 'unhealthy',
        details: { error: (error as Error).message },
      };
    }
  }
}
