import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import { Document } from 'langchain/document';
import { OpenAIEmbeddings } from '@langchain/openai';

@Injectable()
export class RagService {
  private supabase;
  private openai;
  private embeddings;

  constructor(private configService: ConfigService) {
    // Initialize Supabase client
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL'),
      this.configService.get<string>('SUPABASE_ANON_KEY'),
    );

    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });

    // Initialize OpenAI embeddings
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: this.configService.get<string>('OPENAI_API_KEY'),
      modelName: 'text-embedding-3-small',
    });
  }

  async addDocument(text: string, metadata: Record<string, any> = {}) {
    try {
      // Generate embedding for the text
      const embedding = await this.embeddings.embedQuery(text);

      // Store in Supabase
      const { data, error } = await this.supabase.from('documents').insert([
        {
          content: text,
          embedding,
          metadata,
        },
      ]);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding document:', error);
      throw error;
    }
  }

  async searchSimilarDocuments(query: string, limit: number = 5) {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.embeddings.embedQuery(query);

      // Search in Supabase using vector similarity
      const { data, error } = await this.supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: limit,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error searching documents:', error);
      throw error;
    }
  }

  async generateResponse(query: string, context: string) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that answers questions based on the provided context.',
          },
          {
            role: 'user',
            content: `Context: ${context}\n\nQuestion: ${query}`,
          },
        ],
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  }
}
