-- Enable the pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    embedding vector(1536), -- OpenAI text-embedding-3-small dimension
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS documents_metadata_idx ON documents USING gin (metadata);
CREATE INDEX IF NOT EXISTS documents_created_at_idx ON documents (created_at DESC);

-- Create index for persona type filtering
CREATE INDEX IF NOT EXISTS documents_persona_type_idx ON documents USING btree ((metadata->>'personaType'));

-- Create index for document type filtering
CREATE INDEX IF NOT EXISTS documents_document_type_idx ON documents USING btree ((metadata->>'documentType'));

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS documents_category_idx ON documents USING btree ((metadata->>'category'));

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create a function for vector similarity search
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    metadata JSONB,
    embedding vector(1536),
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        documents.id,
        documents.content,
        documents.metadata,
        documents.embedding,
        1 - (documents.embedding <=> query_embedding) AS similarity
    FROM documents
    WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
    ORDER BY documents.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Create a function for advanced vector similarity search with filters
CREATE OR REPLACE FUNCTION match_documents_advanced(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10,
    persona_type text DEFAULT NULL,
    document_type text DEFAULT NULL,
    category text DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    metadata JSONB,
    embedding vector(1536),
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        documents.id,
        documents.content,
        documents.metadata,
        documents.embedding,
        1 - (documents.embedding <=> query_embedding) AS similarity
    FROM documents
    WHERE 
        1 - (documents.embedding <=> query_embedding) > match_threshold
        AND (persona_type IS NULL OR documents.metadata->>'personaType' = persona_type)
        AND (document_type IS NULL OR documents.metadata->>'documentType' = document_type)
        AND (category IS NULL OR documents.metadata->>'category' = category)
    ORDER BY documents.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Create a function to get document statistics
CREATE OR REPLACE FUNCTION get_document_stats()
RETURNS TABLE (
    total_documents bigint,
    documents_by_type jsonb,
    documents_by_persona jsonb,
    documents_by_category jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::bigint AS total_documents,
        COALESCE(
            jsonb_object_agg(
                COALESCE(metadata->>'documentType', 'unknown'),
                type_count
            ),
            '{}'::jsonb
        ) AS documents_by_type,
        COALESCE(
            jsonb_object_agg(
                COALESCE(metadata->>'personaType', 'none'),
                persona_count
            ),
            '{}'::jsonb
        ) AS documents_by_persona,
        COALESCE(
            jsonb_object_agg(
                COALESCE(metadata->>'category', 'uncategorized'),
                category_count
            ),
            '{}'::jsonb
        ) AS documents_by_category
    FROM (
        SELECT 
            metadata,
            COUNT(*) AS type_count,
            COUNT(*) AS persona_count,
            COUNT(*) AS category_count
        FROM documents
        GROUP BY metadata->>'documentType', metadata->>'personaType', metadata->>'category'
    );
END;
$$;

-- Grant necessary permissions (adjust as needed for your security model)
-- GRANT USAGE ON SCHEMA public TO anon, authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION match_documents TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION match_documents_advanced TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION get_document_stats TO anon, authenticated;

-- Create sample data for testing (uncomment if needed)
/*
INSERT INTO documents (content, metadata) VALUES
(
    'OpenAI GPT models are large language models that can generate human-like text.',
    '{"documentType": "text", "category": "AI", "tags": ["OpenAI", "GPT", "LLM"]}'
),
(
    'Supabase is an open-source Firebase alternative with PostgreSQL database.',
    '{"documentType": "text", "category": "Database", "tags": ["Supabase", "PostgreSQL", "Backend"]}'
),
(
    'Vector databases enable semantic search and similarity matching.',
    '{"documentType": "text", "category": "Database", "tags": ["Vector", "Search", "AI"]}'
);
*/ 