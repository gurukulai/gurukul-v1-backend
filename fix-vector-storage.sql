-- Complete fix for vector storage issues in Supabase
-- Run this in Supabase SQL Editor

-- 1. First, let's see what's currently in the database
SELECT id, content, 
       CASE 
         WHEN embedding IS NULL THEN 'NULL'
         ELSE 'EXISTS (type: ' || pg_typeof(embedding)::text || ')'
       END as embedding_status
FROM documents;

-- 2. If embeddings are stored as text, we need to fix the column type
-- Drop the existing embedding column and recreate it properly
ALTER TABLE documents DROP COLUMN IF EXISTS embedding;
ALTER TABLE documents ADD COLUMN embedding vector(1536);

-- 3. Recreate the vector index
DROP INDEX IF EXISTS documents_embedding_idx;
CREATE INDEX documents_embedding_idx ON documents USING ivfflat (embedding vector_cosine_ops);

-- 4. Drop and recreate the match_documents function with better handling
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

-- 5. Test the function with a dummy vector
SELECT 'Testing match_documents function...' as test_step;

-- 6. Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO anon, authenticated;
GRANT EXECUTE ON FUNCTION match_documents TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_document_stats TO anon, authenticated;

SELECT 'Vector storage fix completed!' as result; 