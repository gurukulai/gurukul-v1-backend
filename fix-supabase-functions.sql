-- Fix for Supabase RAG functions
-- Run this in Supabase SQL Editor

-- First, let's check if we have data
SELECT COUNT(*) as total_docs FROM documents;

-- Check if embeddings exist
SELECT id, content, ARRAY_LENGTH(embedding, 1) as embedding_length 
FROM documents 
LIMIT 3;

-- Drop and recreate the match_documents function with better error handling
DROP FUNCTION IF EXISTS match_documents(vector, float, int);

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
    -- Debug logging
    RAISE NOTICE 'match_documents called with threshold: %, count: %', match_threshold, match_count;
    
    RETURN QUERY
    SELECT
        d.id,
        d.content,
        d.metadata,
        d.embedding,
        (1 - (d.embedding <=> query_embedding)) AS similarity
    FROM documents d
    WHERE d.embedding IS NOT NULL
        AND (1 - (d.embedding <=> query_embedding)) >= match_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Create a simplified stats function
DROP FUNCTION IF EXISTS get_document_stats();

CREATE OR REPLACE FUNCTION get_document_stats()
RETURNS TABLE (
    total_documents bigint,
    documents_by_type jsonb,
    documents_by_persona jsonb
)
LANGUAGE plpgsql
AS $$
DECLARE
    type_stats jsonb;
    persona_stats jsonb;
BEGIN
    -- Get document type statistics
    SELECT jsonb_object_agg(
        COALESCE(metadata->>'documentType', 'unknown'),
        doc_count
    ) INTO type_stats
    FROM (
        SELECT metadata->>'documentType' as doc_type, COUNT(*) as doc_count
        FROM documents
        GROUP BY metadata->>'documentType'
    ) t;

    -- Get persona type statistics  
    SELECT jsonb_object_agg(
        COALESCE(metadata->>'personaType', 'none'),
        doc_count
    ) INTO persona_stats
    FROM (
        SELECT metadata->>'personaType' as persona_type, COUNT(*) as doc_count
        FROM documents
        GROUP BY metadata->>'personaType'
    ) p;

    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM documents)::bigint as total_documents,
        COALESCE(type_stats, '{}'::jsonb) as documents_by_type,
        COALESCE(persona_stats, '{}'::jsonb) as documents_by_persona;
END;
$$;

-- Test the functions
SELECT * FROM get_document_stats();

-- Test match_documents with a simple vector (all zeros for testing)
-- This should return results if the function works
SELECT id, content, similarity 
FROM match_documents(
    ARRAY_FILL(0.0, ARRAY[1536])::vector(1536),
    0.0,
    5
);

-- Grant permissions again
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO anon, authenticated;
GRANT EXECUTE ON FUNCTION match_documents TO anon, authenticated;
GRANT EXECUTE ON FUNCTION match_documents_advanced TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_document_stats TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_updated_at_column TO anon, authenticated; 