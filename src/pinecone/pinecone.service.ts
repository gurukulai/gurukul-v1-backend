// src/pinecone/pinecone.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Index, Pinecone as PineconeClient } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

@Injectable()
export class PineconeService implements OnModuleInit {
  private pinecone: PineconeClient | undefined;
  private pineconeIndex: Index | undefined;
  private embeddings: OpenAIEmbeddings | undefined;

  onModuleInit() {
    // Initialize Pinecone client
    this.pinecone = new PineconeClient();

    const apiKey = process.env.PINECONE_API_KEY;
    const pineconeIndex = process.env.PINECONE_INDEX;

    if (!apiKey) throw new Error('PINECONE_API_KEY is not set');
    if (!pineconeIndex) throw new Error('PINECONE_INDEX is not set');

    this.pinecone = new PineconeClient({
      apiKey,
    });

    this.pineconeIndex = this.pinecone.Index(pineconeIndex);

    // Use advanced OpenAI embedding model
    const openAIApiKey = process.env.OPENAI_API_KEY;
    if (!openAIApiKey) throw new Error('OPENAI_API_KEY is not set');

    this.embeddings = new OpenAIEmbeddings({
      model: 'text-embedding-3-large', // 3072 dimensions for better accuracy
      openAIApiKey,
    });
  }

  async createVectorStoreForExpert(
    expertNamespace: string,
  ): Promise<PineconeStore> {
    if (!this.embeddings) throw new Error('Embeddings are not initialized');
    return await PineconeStore.fromExistingIndex(this.embeddings, {
      pineconeIndex: this.pineconeIndex,
      namespace: expertNamespace,
    });
  }

  async uploadDocumentForExpert(
    expertNamespace: string,
    content: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    const vectorStore = await this.createVectorStoreForExpert(expertNamespace);

    // Advanced chunking strategy
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200, // 20% overlap for context preservation
      separators: ['\n\n', '\n', '. ', ' ', ''],
    });

    const chunks = await textSplitter.createDocuments([content], [metadata]);

    // Add enhanced metadata to each chunk
    const enhancedChunks = chunks.map((chunk, index) => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        expertNamespace,
        chunkIndex: index,
        totalChunks: chunks.length,
        uploadedAt: new Date().toISOString(),
      },
    }));

    await vectorStore.addDocuments(enhancedChunks);
  }

  async queryExpert(
    expertNamespace: string,
    query: string,
    topK: number = 5,
  ): Promise<
    {
      content: string;
      metadata: Record<string, unknown>;
      similarity: number;
    }[]
  > {
    const vectorStore = await this.createVectorStoreForExpert(expertNamespace);

    const results = await vectorStore.similaritySearchWithScore(query, topK);

    return results.map(([doc, score]) => ({
      content: doc.pageContent,
      metadata: doc.metadata,
      similarity: score,
    }));
  }
}
