// src/pinecone/pinecone.controller.ts
import {
  Controller,
  // Get,
  Post,
  Body,
  Param,
  // Query,
  Logger,
} from '@nestjs/common';
// import { ExpertsService } from './experts.service';
// import { DocumentsService } from './documents.service';
// import { QueryService } from './query.service';
import {
  // UploadDocumentDto,
  UploadDocumentToPineconeDto,
} from './dto/experts.dto';
import { PineconeService } from './pinecone.service';

@Controller('pinecone')
export class PineconeController {
  constructor(
    private readonly pineconeService: PineconeService,
    // private readonly expertsService: ExpertsService,
    // private readonly documentsService: DocumentsService,
    // private readonly queryService: QueryService,
  ) {}

  // --- Experts Endpoints ---
  @Post('experts')
  createExpert(@Body() expertName: string) {
    return this.pineconeService.createVectorStoreForExpert(expertName);
  }

  // @Get('experts')
  // getAllExperts() {
  //   return this.expertsService.getAllExperts();
  // }

  // @Get('experts/:id')
  // getExpert(@Param('id') id: string) {
  //   return this.pineconeService.getExpert(id);
  // }

  // --- Documents Endpoints ---
  @Post('documents/upload')
  uploadDocument(@Body() uploadDocumentDto: UploadDocumentToPineconeDto) {
    Logger.log('uploadDocumentDto', uploadDocumentDto);
    return this.pineconeService.uploadDocumentForExpert(
      uploadDocumentDto.expertName,
      uploadDocumentDto.content,
    );
  }

  // --- Query Endpoints ---
  @Post('query/:expertName')
  queryExpert(
    @Param('expertName') expertName: string,
    @Body() body: { query: string; topK?: number; forceVector?: boolean },
  ) {
    return this.pineconeService.queryExpert(expertName, body.query);
  }
}
