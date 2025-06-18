import { Injectable } from '@nestjs/common';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from '@langchain/core/documents';
import {
  DocumentChunk,
  DocumentMetadata,
  DocumentProcessingOptions,
  DocumentType,
} from '../interfaces/rag.interface';

@Injectable()
export class DocumentProcessor {
  private readonly DEFAULT_CHUNK_SIZE = 1000;
  private readonly DEFAULT_OVERLAP = 200;

  /**
   * Process a document into chunks for embedding using LangChain text splitters
   */
  async processDocument(
    content: string,
    metadata: Partial<DocumentMetadata>,
    options: DocumentProcessingOptions = {},
  ): Promise<DocumentChunk[]> {
    const {
      chunkSize = this.DEFAULT_CHUNK_SIZE,
      chunkOverlap = this.DEFAULT_OVERLAP,
      customSplitter = 'paragraph',
    } = options;

    // Clean and normalize content
    const cleanContent = this.cleanContent(content);

    // Create LangChain document
    const langchainDoc = new Document({
      pageContent: cleanContent,
      metadata: {
        ...metadata,
        documentType: metadata.documentType || DocumentType.TEXT,
      },
    });

    // Create appropriate text splitter based on strategy
    const textSplitter = this.createTextSplitter(
      customSplitter,
      chunkSize,
      chunkOverlap,
    );

    // Split document into chunks
    const langchainChunks = await textSplitter.splitDocuments([langchainDoc]);

    // Convert to our DocumentChunk format
    return langchainChunks.map((chunk, index) => ({
      content: chunk.pageContent,
      metadata: {
        ...chunk.metadata,
        chunkIndex: index,
        totalChunks: langchainChunks.length,
        createdAt: new Date(),
      } as DocumentMetadata,
      chunkIndex: index,
      totalChunks: langchainChunks.length,
    }));
  }

  /**
   * Create appropriate LangChain text splitter based on strategy
   */
  private createTextSplitter(
    strategy: 'sentence' | 'paragraph' | 'token',
    chunkSize: number,
    overlap: number,
  ): RecursiveCharacterTextSplitter {
    const separators = this.getSeparatorsForStrategy(strategy);

    return new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap: overlap,
      separators,
      lengthFunction: (text) => text.length,
    });
  }

  /**
   * Get separators based on splitting strategy
   */
  private getSeparatorsForStrategy(
    strategy: 'sentence' | 'paragraph' | 'token',
  ): string[] {
    switch (strategy) {
      case 'sentence':
        return ['\n\n', '\n', '. ', '! ', '? ', ' ', ''];
      case 'paragraph':
        return ['\n\n', '\n', ' ', ''];
      case 'token':
        return [' ', '\n', '\t', ''];
      default:
        return ['\n\n', '\n', '. ', '! ', '? ', ' ', ''];
    }
  }

  /**
   * Clean and normalize document content
   */
  private cleanContent(content: string): string {
    return content
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
      .replace(/\s{2,}/g, ' ') // Replace multiple spaces with single space
      .trim();
  }

  /**
   * Extract metadata from content based on document type
   */
  extractMetadata(
    content: string,
    documentType: DocumentType,
  ): Partial<DocumentMetadata> {
    const metadata: Partial<DocumentMetadata> = {
      documentType,
    };

    switch (documentType) {
      case DocumentType.MARKDOWN:
        return this.extractMarkdownMetadata(content, metadata);
      case DocumentType.HTML:
        return this.extractHtmlMetadata(content, metadata);
      default:
        return metadata;
    }
  }

  /**
   * Extract metadata from markdown content
   */
  private extractMarkdownMetadata(
    content: string,
    metadata: Partial<DocumentMetadata>,
  ): Partial<DocumentMetadata> {
    // Extract title from first heading
    const titleMatch = content.match(/^#\s+(.+)/m);
    if (titleMatch) {
      metadata.title = titleMatch[1].trim();
    }

    // Extract tags from content
    const tagMatches = content.match(/#(\w+)/g);
    if (tagMatches) {
      metadata.tags = tagMatches.map((tag) => tag.substring(1));
    }

    return metadata;
  }

  /**
   * Extract metadata from HTML content
   */
  private extractHtmlMetadata(
    content: string,
    metadata: Partial<DocumentMetadata>,
  ): Partial<DocumentMetadata> {
    // Extract title from title tag
    const titleMatch = content.match(/<title[^>]*>([^<]+)</i);
    if (titleMatch) {
      metadata.title = titleMatch[1].trim();
    }

    // Extract author from meta tag
    const authorMatch = content.match(
      /<meta[^>]*name=['"]author['"][^>]*content=['"]([^'"]+)['"]/i,
    );
    if (authorMatch) {
      metadata.author = authorMatch[1].trim();
    }

    return metadata;
  }
}
