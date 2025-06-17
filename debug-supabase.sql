-- Debug script for Supabase vector search issues
-- Run each section separately in Supabase SQL Editor

-- 1. Check if documents exist
SELECT 
    COUNT(*) as total_documents,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as docs_with_embeddings
FROM documents;

-- 2. Check document content and metadata
SELECT 
    id,
    LEFT(content, 100) as content_preview,
    metadata,
    CASE 
        WHEN embedding IS NULL THEN 'NULL'
        ELSE 'EXISTS (' || ARRAY_LENGTH(embedding, 1) || ' dimensions)'
    END as embedding_status
FROM documents
LIMIT 5;

-- 3. Test cosine distance calculation manually
SELECT 
    id,
    LEFT(content, 50) as content_preview,
    CASE 
        WHEN embedding IS NULL THEN NULL
        ELSE (embedding <=> ARRAY_FILL(0.1, ARRAY[1536])::vector(1536))
    END as distance_to_test_vector,
    CASE 
        WHEN embedding IS NULL THEN NULL
        ELSE (1 - (embedding <=> ARRAY_FILL(0.1, ARRAY[1536])::vector(1536)))
    END as similarity_to_test_vector
FROM documents
WHERE embedding IS NOT NULL
ORDER BY embedding <=> ARRAY_FILL(0.1, ARRAY[1536])::vector(1536)
LIMIT 3;

-- 4. Test the match_documents function with very low threshold
SELECT 
    id,
    LEFT(content, 50) as content_preview,
    similarity
FROM match_documents(
    ARRAY_FILL(0.1, ARRAY[1536])::vector(1536),
    -1.0,  -- Very low threshold to catch everything
    5
);

-- 5. If the above doesn't work, test with a direct query
SELECT 
    id,
    LEFT(content, 50) as content_preview,
    (1 - (embedding <=> ARRAY_FILL(0.1, ARRAY[1536])::vector(1536))) as similarity
FROM documents
WHERE embedding IS NOT NULL
ORDER BY embedding <=> ARRAY_FILL(0.1, ARRAY[1536])::vector(1536)
LIMIT 3; 