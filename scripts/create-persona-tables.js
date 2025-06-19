const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const createPersonaTables = async () => {
  console.log('🚀 Creating persona-specific tables...\n');

  const personas = ['priya', 'therapist', 'dietician', 'career'];

  for (const persona of personas) {
    console.log(`📋 Creating table: documents_${persona}`);

    try {
      // Create the table
      const { data: createResult, error: createError } = await supabase.rpc(
        'exec_sql',
        {
          sql: `
          CREATE TABLE IF NOT EXISTS documents_${persona} (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            content text NOT NULL,
            metadata jsonb DEFAULT '{}',
            embedding vector(1536),
            created_at timestamp with time zone DEFAULT now(),
            updated_at timestamp with time zone DEFAULT now()
          );
        `,
        },
      );

      if (createError) {
        console.error(
          `❌ Error creating documents_${persona}:`,
          createError.message,
        );
      } else {
        console.log(`✅ Created documents_${persona} table`);
      }

      // Create indexes
      console.log(`📋 Creating indexes for documents_${persona}...`);

      // Embedding index
      const { error: embeddingIndexError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE INDEX IF NOT EXISTS documents_${persona}_embedding_idx 
          ON documents_${persona} 
          USING ivfflat (embedding vector_cosine_ops);
        `,
      });

      if (embeddingIndexError) {
        console.log(
          `⚠️  Could not create embedding index for ${persona}: ${embeddingIndexError.message}`,
        );
      } else {
        console.log(`✅ Created embedding index for documents_${persona}`);
      }

      // Metadata index
      const { error: metadataIndexError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE INDEX IF NOT EXISTS documents_${persona}_metadata_idx 
          ON documents_${persona} 
          USING gin (metadata);
        `,
      });

      if (metadataIndexError) {
        console.log(
          `⚠️  Could not create metadata index for ${persona}: ${metadataIndexError.message}`,
        );
      } else {
        console.log(`✅ Created metadata index for documents_${persona}`);
      }

      // Created at index
      const { error: createdAtIndexError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE INDEX IF NOT EXISTS documents_${persona}_created_at_idx 
          ON documents_${persona} (created_at DESC);
        `,
      });

      if (createdAtIndexError) {
        console.log(
          `⚠️  Could not create created_at index for ${persona}: ${createdAtIndexError.message}`,
        );
      } else {
        console.log(`✅ Created created_at index for documents_${persona}`);
      }

      console.log(`✅ Completed setup for documents_${persona}\n`);
    } catch (error) {
      console.error(`❌ Failed to set up documents_${persona}:`, error.message);
    }
  }

  console.log('🎉 Persona-specific tables setup complete!');
};

// Alternative method using direct SQL if the above doesn't work
const createPersonaTablesDirectSQL = async () => {
  console.log('🚀 Creating persona-specific tables using direct SQL...\n');

  const personas = ['priya', 'therapist', 'dietician', 'career'];

  for (const persona of personas) {
    console.log(`📋 Creating table: documents_${persona}`);

    try {
      // First, let's try to query if the table exists
      const { data: tableExists, error: checkError } = await supabase
        .from(`documents_${persona}`)
        .select('id')
        .limit(1);

      if (checkError && checkError.code === 'PGRST116') {
        // Table doesn't exist, this is expected
        console.log(
          `📋 Table documents_${persona} doesn't exist, we'll create it via the backend service`,
        );
      } else if (!checkError) {
        console.log(`✅ Table documents_${persona} already exists`);
      } else {
        console.log(
          `⚠️  Error checking table documents_${persona}:`,
          checkError.message,
        );
      }
    } catch (error) {
      console.error(`❌ Failed to check documents_${persona}:`, error.message);
    }
  }

  console.log(
    '\n📋 Note: Tables will be created automatically by the backend service when first used.',
  );
  console.log('🎉 Table check complete!');
};

const main = async () => {
  try {
    // For now, let's just check if we can connect and if tables exist
    await createPersonaTablesDirectSQL();

    console.log('\n📝 Next steps:');
    console.log('1. Make sure your backend server is running');
    console.log(
      '2. The persona-specific tables should be created automatically when you first use the endpoints',
    );
    console.log(
      '3. Run the test data script: node scripts/setup-test-rag-data.js',
    );
  } catch (error) {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = {
  createPersonaTables,
  createPersonaTablesDirectSQL,
};
