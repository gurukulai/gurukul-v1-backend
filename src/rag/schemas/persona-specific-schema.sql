-- Persona-Specific Vector Database Schema
-- This creates separate tables for each AI persona for isolated RAG memory

-- Enable the pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- ===========================================
-- PRIYA (AI Girlfriend) Vector Database
-- ===========================================
CREATE TABLE IF NOT EXISTS documents_priya (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    embedding vector(1536), -- OpenAI text-embedding-3-small dimension
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Priya's documents
CREATE INDEX IF NOT EXISTS documents_priya_embedding_idx ON documents_priya USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS documents_priya_metadata_idx ON documents_priya USING gin (metadata);
CREATE INDEX IF NOT EXISTS documents_priya_created_at_idx ON documents_priya (created_at DESC);
CREATE INDEX IF NOT EXISTS documents_priya_category_idx ON documents_priya USING btree ((metadata->>'category'));

-- ===========================================
-- THERAPIST Vector Database
-- ===========================================
CREATE TABLE IF NOT EXISTS documents_therapist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Therapist's documents
CREATE INDEX IF NOT EXISTS documents_therapist_embedding_idx ON documents_therapist USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS documents_therapist_metadata_idx ON documents_therapist USING gin (metadata);
CREATE INDEX IF NOT EXISTS documents_therapist_created_at_idx ON documents_therapist (created_at DESC);
CREATE INDEX IF NOT EXISTS documents_therapist_category_idx ON documents_therapist USING btree ((metadata->>'category'));

-- ===========================================
-- DIETICIAN Vector Database
-- ===========================================
CREATE TABLE IF NOT EXISTS documents_dietician (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Dietician's documents
CREATE INDEX IF NOT EXISTS documents_dietician_embedding_idx ON documents_dietician USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS documents_dietician_metadata_idx ON documents_dietician USING gin (metadata);
CREATE INDEX IF NOT EXISTS documents_dietician_created_at_idx ON documents_dietician (created_at DESC);
CREATE INDEX IF NOT EXISTS documents_dietician_category_idx ON documents_dietician USING btree ((metadata->>'category'));

-- ===========================================
-- CAREER Vector Database
-- ===========================================
CREATE TABLE IF NOT EXISTS documents_career (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Career's documents
CREATE INDEX IF NOT EXISTS documents_career_embedding_idx ON documents_career USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS documents_career_metadata_idx ON documents_career USING gin (metadata);
CREATE INDEX IF NOT EXISTS documents_career_created_at_idx ON documents_career (created_at DESC);
CREATE INDEX IF NOT EXISTS documents_career_category_idx ON documents_career USING btree ((metadata->>'category'));

-- ===========================================
-- Shared Functions for Updated At
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all persona tables
CREATE TRIGGER update_documents_priya_updated_at
    BEFORE UPDATE ON documents_priya
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_therapist_updated_at
    BEFORE UPDATE ON documents_therapist
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_dietician_updated_at
    BEFORE UPDATE ON documents_dietician
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_career_updated_at
    BEFORE UPDATE ON documents_career
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- Persona-Specific Search Functions
-- ===========================================

-- Priya search function
CREATE OR REPLACE FUNCTION match_documents_priya(
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
        documents_priya.id,
        documents_priya.content,
        documents_priya.metadata,
        documents_priya.embedding,
        1 - (documents_priya.embedding <=> query_embedding) AS similarity
    FROM documents_priya
    WHERE 1 - (documents_priya.embedding <=> query_embedding) > match_threshold
    ORDER BY documents_priya.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Therapist search function
CREATE OR REPLACE FUNCTION match_documents_therapist(
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
        documents_therapist.id,
        documents_therapist.content,
        documents_therapist.metadata,
        documents_therapist.embedding,
        1 - (documents_therapist.embedding <=> query_embedding) AS similarity
    FROM documents_therapist
    WHERE 1 - (documents_therapist.embedding <=> query_embedding) > match_threshold
    ORDER BY documents_therapist.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Dietician search function
CREATE OR REPLACE FUNCTION match_documents_dietician(
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
        documents_dietician.id,
        documents_dietician.content,
        documents_dietician.metadata,
        documents_dietician.embedding,
        1 - (documents_dietician.embedding <=> query_embedding) AS similarity
    FROM documents_dietician
    WHERE 1 - (documents_dietician.embedding <=> query_embedding) > match_threshold
    ORDER BY documents_dietician.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Career search function
CREATE OR REPLACE FUNCTION match_documents_career(
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
        documents_career.id,
        documents_career.content,
        documents_career.metadata,
        documents_career.embedding,
        1 - (documents_career.embedding <=> query_embedding) AS similarity
    FROM documents_career
    WHERE 1 - (documents_career.embedding <=> query_embedding) > match_threshold
    ORDER BY documents_career.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ===========================================
-- Persona-Specific Statistics Functions
-- ===========================================

-- Get statistics for each persona
CREATE OR REPLACE FUNCTION get_persona_document_stats()
RETURNS TABLE (
    persona_type text,
    total_documents bigint,
    documents_by_category jsonb,
    latest_document_date timestamp with time zone
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'PRIYA'::text as persona_type,
        COUNT(*)::bigint as total_documents,
        COALESCE(
            jsonb_object_agg(
                COALESCE(metadata->>'category', 'uncategorized'),
                category_count
            ),
            '{}'::jsonb
        ) as documents_by_category,
        MAX(created_at) as latest_document_date
    FROM (
        SELECT metadata, COUNT(*) as category_count, created_at
        FROM documents_priya
        GROUP BY metadata->>'category', created_at
    ) priya_stats
    
    UNION ALL
    
    SELECT 
        'THERAPIST'::text,
        COUNT(*)::bigint,
        COALESCE(
            jsonb_object_agg(
                COALESCE(metadata->>'category', 'uncategorized'),
                category_count
            ),
            '{}'::jsonb
        ),
        MAX(created_at)
    FROM (
        SELECT metadata, COUNT(*) as category_count, created_at
        FROM documents_therapist
        GROUP BY metadata->>'category', created_at
    ) therapist_stats
    
    UNION ALL
    
    SELECT 
        'DIETICIAN'::text,
        COUNT(*)::bigint,
        COALESCE(
            jsonb_object_agg(
                COALESCE(metadata->>'category', 'uncategorized'),
                category_count
            ),
            '{}'::jsonb
        ),
        MAX(created_at)
    FROM (
        SELECT metadata, COUNT(*) as category_count, created_at
        FROM documents_dietician
        GROUP BY metadata->>'category', created_at
    ) dietician_stats
    
    UNION ALL
    
    SELECT 
        'CAREER'::text,
        COUNT(*)::bigint,
        COALESCE(
            jsonb_object_agg(
                COALESCE(metadata->>'category', 'uncategorized'),
                category_count
            ),
            '{}'::jsonb
        ),
        MAX(created_at)
    FROM (
        SELECT metadata, COUNT(*) as category_count, created_at
        FROM documents_career
        GROUP BY metadata->>'category', created_at
    ) career_stats;
END;
$$;

-- ===========================================
-- Sample Data for Testing (Optional)
-- ===========================================

-- Sample data for Priya (AI Girlfriend)
INSERT INTO documents_priya (content, metadata) VALUES
(
    'Love is about understanding, caring, and being there for each other through good times and bad.',
    '{"category": "relationships", "tags": ["love", "relationships", "support"], "source": "relationship_advice"}'
),
(
    'Communication is key in any relationship. Share your feelings and listen to your partner.',
    '{"category": "relationships", "tags": ["communication", "relationships"], "source": "relationship_guide"}'
);

-- Sample data for Therapist
INSERT INTO documents_therapist (content, metadata) VALUES
(
    'Anxiety is a common mental health condition. Deep breathing exercises can help manage acute anxiety symptoms.',
    '{"category": "mental_health", "tags": ["anxiety", "coping_strategies"], "source": "therapy_handbook"}'
),
(
    'Cognitive Behavioral Therapy (CBT) helps identify and change negative thought patterns.',
    '{"category": "therapy_techniques", "tags": ["CBT", "therapy"], "source": "clinical_guide"}'
);

-- Sample data for Dietician
INSERT INTO documents_dietician (content, metadata) VALUES
(
    'A balanced diet includes vegetables, fruits, whole grains, lean proteins, and healthy fats.',
    '{"category": "nutrition", "tags": ["diet", "healthy_eating"], "source": "nutrition_guide"}'
),
(
    'Staying hydrated is essential. Aim for 8 glasses of water daily, more if you exercise regularly.',
    '{"category": "wellness", "tags": ["hydration", "health"], "source": "wellness_tips"}'
);

-- Sample data for Career
INSERT INTO documents_career (content, metadata) VALUES
(
    'Resume should highlight achievements with quantifiable results, not just job responsibilities.',
    '{"category": "job_search", "tags": ["resume", "career"], "source": "career_guide"}'
),
(
    'Networking is crucial for career growth. Attend industry events and maintain professional relationships.',
    '{"category": "career_development", "tags": ["networking", "career_growth"], "source": "professional_development"}'
);

-- Grant necessary permissions (adjust as needed for your security model)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON documents_priya TO anon, authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON documents_therapist TO anon, authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON documents_dietician TO anon, authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON documents_career TO anon, authenticated;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated; 