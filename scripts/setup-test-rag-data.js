const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:8080';

// Test data for Priya's knowledge base (AI Girlfriend)
const PRIYA_TEST_DATA = [
  {
    content:
      "Love languages are five different ways people express and experience love: Words of Affirmation (verbal appreciation), Quality Time (undivided attention), Receiving Gifts (thoughtful presents), Acts of Service (helpful actions), and Physical Touch (appropriate physical contact). Understanding your partner's love language helps you communicate love more effectively.",
    metadata: {
      category: 'relationships',
      tags: ['love_languages', 'communication', 'relationships'],
      source: 'relationship_guide',
      title: 'The 5 Love Languages Explained',
    },
  },
  {
    content:
      "Effective communication in relationships involves active listening, expressing feelings clearly without blame, using 'I' statements instead of 'you' accusations, being vulnerable and honest about emotions, and setting aside dedicated time for important conversations without distractions.",
    metadata: {
      category: 'relationships',
      tags: ['communication', 'relationships', 'conflict_resolution'],
      source: 'relationship_advice',
      title: 'Healthy Communication in Relationships',
    },
  },
  {
    content:
      'Building trust in a relationship requires consistency between words and actions, being reliable and keeping promises, maintaining open and honest communication, respecting boundaries, and being vulnerable by sharing thoughts and feelings authentically.',
    metadata: {
      category: 'relationships',
      tags: ['trust', 'relationships', 'honesty'],
      source: 'relationship_psychology',
      title: 'How to Build Trust in Relationships',
    },
  },
  {
    content:
      'Healthy conflict resolution involves staying calm and respectful, focusing on the specific issue rather than personal attacks, listening to understand rather than to win, finding compromises where both partners feel heard, and taking breaks when emotions get too heated.',
    metadata: {
      category: 'relationships',
      tags: ['conflict_resolution', 'relationships', 'communication'],
      source: 'couples_therapy',
      title: 'Resolving Conflicts in Relationships',
    },
  },
  {
    content:
      "Showing appreciation and gratitude in relationships can be done through regular compliments, acknowledging your partner's efforts, expressing thanks for both big and small gestures, celebrating their achievements, and creating traditions or rituals that honor your connection.",
    metadata: {
      category: 'relationships',
      tags: ['appreciation', 'gratitude', 'relationships'],
      source: 'relationship_tips',
      title: 'Ways to Show Appreciation to Your Partner',
    },
  },
  {
    content:
      'Quality time activities for couples include: cooking meals together, taking evening walks, having phone-free conversations, trying new hobbies together, planning surprise dates, sharing childhood memories, discussing future dreams, and engaging in deep meaningful conversations about life goals.',
    metadata: {
      category: 'relationships',
      tags: ['quality_time', 'date_ideas', 'relationships'],
      source: 'dating_guide',
      title: 'Quality Time Ideas for Couples',
    },
  },
  {
    content:
      "Supporting your partner during difficult times involves offering emotional presence without trying to 'fix' everything, asking how you can help rather than assuming, validating their feelings even if you don't understand, being patient with their process, and maintaining your own self-care to avoid burnout.",
    metadata: {
      category: 'relationships',
      tags: ['emotional_support', 'relationships', 'mental_health'],
      source: 'relationship_support',
      title: 'How to Support Your Partner During Hard Times',
    },
  },
  {
    content:
      'Long-distance relationship success tips: Schedule regular video calls, send surprise care packages, plan future visits, maintain trust through open communication, create shared experiences like watching movies together online, share daily life through photos and messages, and have clear expectations about the relationship timeline.',
    metadata: {
      category: 'relationships',
      tags: ['long_distance', 'relationships', 'communication'],
      source: 'ldr_guide',
      title: 'Making Long-Distance Relationships Work',
    },
  },
];

// Other personas test data (smaller amounts for testing)
const THERAPIST_TEST_DATA = [
  {
    content:
      'The 5-4-3-2-1 grounding technique for anxiety: Identify 5 things you can see, 4 things you can touch, 3 things you can hear, 2 things you can smell, and 1 thing you can taste. This helps bring your attention to the present moment when feeling overwhelmed.',
    metadata: {
      category: 'anxiety_management',
      tags: ['grounding', 'anxiety', 'coping_strategies'],
      source: 'therapy_handbook',
      title: '5-4-3-2-1 Grounding Technique',
    },
  },
  {
    content:
      'Deep breathing exercises for stress relief: Inhale slowly for 4 counts, hold your breath for 4 counts, exhale slowly for 6 counts. Repeat this pattern 5-10 times. This activates the parasympathetic nervous system and promotes relaxation.',
    metadata: {
      category: 'stress_management',
      tags: ['breathing', 'stress', 'relaxation'],
      source: 'mindfulness_guide',
      title: 'Deep Breathing for Stress Relief',
    },
  },
];

const DIETICIAN_TEST_DATA = [
  {
    content:
      'A balanced plate should consist of: 1/2 vegetables and fruits (variety of colors), 1/4 lean protein (fish, chicken, beans, tofu), 1/4 whole grains (brown rice, quinoa, whole wheat), plus healthy fats like olive oil, nuts, or avocado. Stay hydrated with water throughout the day.',
    metadata: {
      category: 'nutrition',
      tags: ['balanced_diet', 'healthy_eating', 'meal_planning'],
      source: 'nutrition_guide',
      title: 'Creating a Balanced Meal',
    },
  },
];

const CAREER_TEST_DATA = [
  {
    content:
      'Effective resume tips: Use action verbs to start bullet points, quantify achievements with numbers and percentages, tailor your resume for each job application, keep it to 1-2 pages, use a clean professional format, include relevant keywords from the job description, and proofread carefully for errors.',
    metadata: {
      category: 'job_search',
      tags: ['resume', 'job_application', 'career'],
      source: 'career_guide',
      title: 'Resume Writing Best Practices',
    },
  },
];

async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`Making request to: ${url}`);

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `API Error: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  return response.json();
}

async function clearPersonaDocuments(personaType) {
  try {
    console.log(
      `\n🗑️  Clearing all documents from ${personaType} knowledge base...`,
    );
    const result = await makeRequest(`/persona-rag/${personaType}/documents`, {
      method: 'DELETE',
    });
    console.log(
      `✅ Cleared ${result.deletedCount || 0} documents from ${personaType}`,
    );
    return result;
  } catch (error) {
    console.error(
      `❌ Failed to clear ${personaType} documents:`,
      error.message,
    );
    throw error;
  }
}

async function addDocumentToPersona(personaType, documentData) {
  try {
    const result = await makeRequest(`/persona-rag/${personaType}/document`, {
      method: 'POST',
      body: JSON.stringify(documentData),
    });
    return result;
  } catch (error) {
    console.error(
      `❌ Failed to add document to ${personaType}:`,
      error.message,
    );
    throw error;
  }
}

async function getPersonaStats(personaType) {
  try {
    const result = await makeRequest(`/persona-rag/${personaType}/stats`);
    return result.stats;
  } catch (error) {
    console.error(`❌ Failed to get ${personaType} stats:`, error.message);
    return null;
  }
}

async function setupTestData() {
  console.log('🚀 Setting up test data for persona-specific RAG system...\n');

  const personas = [
    { type: 'PRIYA', data: PRIYA_TEST_DATA, name: 'AI Girlfriend (Priya)' },
    { type: 'THERAPIST', data: THERAPIST_TEST_DATA, name: 'AI Therapist' },
    { type: 'DIETICIAN', data: DIETICIAN_TEST_DATA, name: 'AI Dietician' },
    { type: 'CAREER', data: CAREER_TEST_DATA, name: 'AI Career Counselor' },
  ];

  // Step 1: Clear all existing data
  console.log('📋 Step 1: Clearing existing data...');
  for (const persona of personas) {
    await clearPersonaDocuments(persona.type);
  }

  // Step 2: Add test data to each persona
  console.log('\n📋 Step 2: Adding test data...');
  for (const persona of personas) {
    console.log(
      `\n📚 Adding ${persona.data.length} documents to ${persona.name}...`,
    );

    let successCount = 0;
    for (const docData of persona.data) {
      try {
        await addDocumentToPersona(persona.type, docData);
        successCount++;
        console.log(`  ✅ Added: "${docData.metadata.title}"`);
      } catch (error) {
        console.log(
          `  ❌ Failed: "${docData.metadata.title}" - ${error.message}`,
        );
      }
    }
    console.log(
      `📊 Successfully added ${successCount}/${persona.data.length} documents to ${persona.name}`,
    );
  }

  // Step 3: Verify data was added
  console.log('\n📋 Step 3: Verifying data...');
  for (const persona of personas) {
    const stats = await getPersonaStats(persona.type);
    if (stats) {
      console.log(`📊 ${persona.name}: ${stats.totalDocuments} documents`);
      if (stats.documentsByCategory) {
        Object.entries(stats.documentsByCategory).forEach(
          ([category, count]) => {
            console.log(`   - ${category}: ${count} documents`);
          },
        );
      }
    }
  }

  console.log('\n🎉 Test data setup complete!');
  console.log('\n📝 How to test:');
  console.log('1. Go to your frontend app');
  console.log('2. Select "Priya (Girlfriend)" persona');
  console.log('3. Turn ON the RAG System toggle');
  console.log('4. Turn OFF the Persona toggle (to use RAG-only mode)');
  console.log(
    '5. Ask: "What are love languages?" or "How do I communicate better?"',
  );
  console.log(
    '6. You should get responses based on the uploaded knowledge base!',
  );
}

async function main() {
  try {
    await setupTestData();
  } catch (error) {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  }
}

// Check if this script is being run directly
if (require.main === module) {
  main();
}

module.exports = {
  setupTestData,
  clearPersonaDocuments,
  addDocumentToPersona,
  getPersonaStats,
  PRIYA_TEST_DATA,
  THERAPIST_TEST_DATA,
  DIETICIAN_TEST_DATA,
  CAREER_TEST_DATA,
};
