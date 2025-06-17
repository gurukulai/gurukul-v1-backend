import { Injectable } from '@nestjs/common';
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
   * Process a document into chunks for embedding
   */
  processDocument(
    content: string,
    metadata: Partial<DocumentMetadata>,
    options: DocumentProcessingOptions = {},
  ): DocumentChunk[] {
    const {
      chunkSize = this.DEFAULT_CHUNK_SIZE,
      chunkOverlap = this.DEFAULT_OVERLAP,
      customSplitter = 'paragraph',
    } = options;

    // Clean and normalize content
    const cleanContent = this.cleanContent(content);

    // Split content based on the specified strategy
    const chunks = this.splitContent(
      cleanContent,
      chunkSize,
      chunkOverlap,
      customSplitter,
    );

    // Create document chunks with metadata
    return chunks.map((chunk, index) => ({
      content: chunk,
      metadata: {
        ...metadata,
        documentType: metadata.documentType || DocumentType.TEXT,
        chunkIndex: index,
        totalChunks: chunks.length,
        createdAt: new Date(),
      } as DocumentMetadata,
      chunkIndex: index,
      totalChunks: chunks.length,
    }));
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
   * Split content into chunks based on strategy
   */
  private splitContent(
    content: string,
    chunkSize: number,
    overlap: number,
    strategy: 'sentence' | 'paragraph' | 'token',
  ): string[] {
    switch (strategy) {
      case 'sentence':
        return this.splitBySentence(content, chunkSize, overlap);
      case 'paragraph':
        return this.splitByParagraph(content, chunkSize, overlap);
      case 'token':
        return this.splitByToken(content, chunkSize, overlap);
      default:
        return this.splitByParagraph(content, chunkSize, overlap);
    }
  }

  /**
   * Split by paragraphs with size limits
   */
  private splitByParagraph(
    content: string,
    chunkSize: number,
    overlap: number,
  ): string[] {
    const paragraphs = content.split(/\n\s*\n/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      if (!trimmedParagraph) continue;

      // If adding this paragraph would exceed chunk size
      if (currentChunk.length + trimmedParagraph.length > chunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          // Handle overlap
          currentChunk =
            overlap > 0 ? this.getOverlap(currentChunk, overlap) : '';
        }
      }

      currentChunk += (currentChunk ? '\n\n' : '') + trimmedParagraph;
    }

    // Add remaining content
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter((chunk) => chunk.length > 0);
  }

  /**
   * Split by sentences with size limits
   */
  private splitBySentence(
    content: string,
    chunkSize: number,
    overlap: number,
  ): string[] {
    const sentences = content.split(/[.!?]+\s+/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      if (currentChunk.length + trimmedSentence.length > chunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk =
            overlap > 0 ? this.getOverlap(currentChunk, overlap) : '';
        }
      }

      currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter((chunk) => chunk.length > 0);
  }

  /**
   * Split by token count (approximated by word count)
   */
  private splitByToken(
    content: string,
    chunkSize: number,
    overlap: number,
  ): string[] {
    const words = content.split(/\s+/);
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim()) {
        chunks.push(chunk.trim());
      }
    }

    return chunks;
  }

  /**
   * Get overlap text from the end of a chunk
   */
  private getOverlap(text: string, overlapSize: number): string {
    const words = text.split(/\s+/);
    if (words.length <= overlapSize) return text;

    return words.slice(-overlapSize).join(' ');
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
