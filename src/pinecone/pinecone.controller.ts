// src/pinecone/pinecone.controller.ts
import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ExpertsService } from './experts.service';
import { DocumentsService } from './documents.service';
import { QueryService } from './query.service';
import { CreateExpertDto, UploadDocumentDto } from './dto/experts.dto';

@Controller('pinecone')
export class PineconeController {
  constructor(
    private readonly expertsService: ExpertsService,
    private readonly documentsService: DocumentsService,
    private readonly queryService: QueryService,
  ) {}

  // --- Experts Endpoints ---
  @Post('experts')
  createExpert(@Body() createExpertDto: CreateExpertDto) {
    return this.expertsService.createExpert(createExpertDto);
  }

  @Get('experts')
  getAllExperts() {
    return this.expertsService.getAllExperts();
  }

  @Get('experts/:id')
  getExpert(@Param('id') id: string) {
    return this.expertsService.getExpert(id);
  }

  // --- Documents Endpoints ---
  @Post('documents/upload')
  uploadDocument(@Body() uploadDocumentDto: UploadDocumentDto) {
    return this.documentsService.uploadDocument(uploadDocumentDto);
  }

  // --- Query Endpoints ---
  @Post('query/:expertId')
  queryExpert(
    @Param('expertId') expertId: string,
    @Body() body: { query: string },
    @Query('topK') topK?: string,
    @Query('forceVector') forceVector?: string,
  ) {
    return this.queryService.queryExpert(expertId, body.query, {
      topK: topK ? parseInt(topK) : undefined,
      forceVector: forceVector === 'true',
    });
  }
}
