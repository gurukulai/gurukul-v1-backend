import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { RagService } from './rag.service';

@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('document')
  async addDocument(
    @Body() body: { text: string; metadata?: Record<string, any> },
  ) {
    return this.ragService.addDocument(body.text, body.metadata);
  }

  @Get('search')
  async searchDocuments(
    @Query('query') query: string,
    @Query('limit') limit?: number,
  ) {
    return this.ragService.searchSimilarDocuments(query, limit);
  }

  @Post('query')
  async queryWithContext(@Body() body: { query: string; context: string }) {
    return this.ragService.generateResponse(body.query, body.context);
  }
}
