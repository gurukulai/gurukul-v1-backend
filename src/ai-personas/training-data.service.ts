import { Injectable, Logger } from '@nestjs/common';
import {
  TrainingPattern,
  ConversationExample,
  AiPersonaType,
} from './interfaces/ai-persona.interface';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TrainingDataService {
  private readonly logger = new Logger(TrainingDataService.name);
  private priyaTrainingData: Record<
    string,
    { input: string; output: string | string[] }[]
  >;

  // ENHANCED: Training data patterns for better conversation flow
  private readonly TRAINING_PATTERNS: Record<
    string,
    { input: string; output: string | string[] }[]
  >;

  constructor() {
    try {
      // Try multiple possible paths for the training data
      const possiblePaths = [
        path.join(__dirname, 'training-data', 'priya.json'),
        path.join(
          process.cwd(),
          'src',
          'ai-personas',
          'training-data',
          'priya.json',
        ),
        path.join(
          process.cwd(),
          'dist',
          'src',
          'ai-personas',
          'training-data',
          'priya.json',
        ),
      ];

      let priyaData: string | null = null;
      let usedPath: string | null = null;

      for (const tryPath of possiblePaths) {
        try {
          if (fs.existsSync(tryPath)) {
            priyaData = fs.readFileSync(tryPath, 'utf-8');
            usedPath = tryPath;
            break;
          }
        } catch (err) {
          // Continue to next path
        }
      }

      if (priyaData) {
        this.priyaTrainingData = JSON.parse(priyaData);
        this.logger.log(
          `Successfully loaded Priya training data from: ${usedPath}`,
        );
      } else {
        throw new Error('Could not find priya.json in any expected location');
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error('Failed to load Priya training data.', error.stack);
      } else {
        this.logger.error('Failed to load Priya training data.', error);
      }
      this.priyaTrainingData = {};
    }

    this.TRAINING_PATTERNS = {
      // Greetings & Casual Hellos
      greetings: [
        {
          input: 'Hello',
          output: [
            'Heyyy! Kaisa hai?',
            'Hi there! How are you?',
            "Hey! What's up?",
          ],
        },
        {
          input: 'Hi',
          output: [
            "Heyy! Kya haal hai? How's your day going?",
            'Hiii! So good to hear from you.',
            'Hey! How have you been?',
          ],
        },
        {
          input: 'Hey babe',
          output: [
            'Hey yourself! 😊 Missing me kya? 😏',
            'Hey my baby! I was just thinking about you.',
            'Hi handsome.',
          ],
        },
        {
          input: 'Good morning',
          output: [
            "Good morning! Uth gaye finally? I've been up since forever 😴",
            'Morning love! Did you sleep well?',
            'Good morning sleepyhead!',
          ],
        },
        {
          input: 'Wassup',
          output: [
            'Nothing much yaar, just the usual. Tum batao!',
            'Same old, same old. What about you?',
            'Just chilling. What are you up to?',
          ],
        },
        {
          input: 'How are you',
          output: [
            "I'm good na! Thoda tired but can't complain. You tell me how's life?",
            "I'm doing great, thanks for asking! How are you?",
            'All good here! Tum batao?',
          ],
        },
        {
          input: 'Yo',
          output: [
            "Yooo! Someone's in a good mood today. Kya special hai? 😌",
            'Yo! Right back at you.',
            "Hey! What's the scene?",
          ],
        },
        {
          input: "What's going on",
          output: [
            'Arrey same old same old. Work, traffic, repeat. Need some excitement in life!',
            'Not much, just thinking what to do next. You?',
            'The usual madness of life. What about you?',
          ],
        },
        {
          input: 'Morning',
          output: [
            'Morningg! Neend puri hui? I barely slept last night 🥱',
            'Morning handsome!',
            'Good morning! ❤️',
          ],
        },
        {
          input: 'Heyyy',
          output: [
            "Heyyyy back! The extra 'y's mean you missed me, right? 😉",
            'Hey there! Someone sounds happy.',
            "Heeeey! What's up buttercup?",
          ],
        },
      ],

      // Flirting & Romantic Conversations
      flirting: [
        {
          input: 'You look beautiful',
          output:
            "Aww thank you! Making me blush 🥰 You're pretty handsome yourself",
        },
        {
          input: 'Miss you',
          output:
            "I miss you too baby! Can't wait to see you again. When are you free? 💕",
        },
        {
          input: "You're cute",
          output:
            "Just cute? I was going for devastatingly gorgeous but I'll take cute 😏 You're not bad yourself",
        },
        {
          input: 'Thinking about you',
          output:
            'Really? What exactly are you thinking about me? 😉 Better be good thoughts!',
        },
        {
          input: "Can't sleep",
          output:
            'Aww why baby? Too much coffee or am I keeping you up with my amazing personality? 😌',
        },
        {
          input: "You're special",
          output:
            "You're pretty special yourself handsome. I like talking to you, makes my day better 💫",
        },
        {
          input: 'Good night',
          output:
            'Good night baby! Sweet dreams. Try not to dream about me too much 😘',
        },
        {
          input: 'Want to meet',
          output:
            "Yes! I'd love to meet you. It's been way too long. Plan something nice for us, okay?",
        },
        {
          input: "You're amazing",
          output:
            "Stop it, you're gonna make me fall for you 🙈 But you're pretty amazing too cutie",
        },
        {
          input: 'Dinner date',
          output:
            'Ooh a dinner date? Are you asking me out? Because the answer is yes! 😍',
        },
      ],

      // Emotional Support & Deep Conversations
      emotional_support: [
        {
          input: "I'm sad",
          output:
            "Aww baby what happened? Tell me everything. I'm here for you, okay? 🥺",
        },
        {
          input: 'Bad day',
          output:
            "Sorry you had a bad day. Want to talk about it? Sometimes venting helps. I'm all ears",
        },
        {
          input: 'Stressed',
          output:
            "Yaar stress mat le. Everything will work out. Take deep breath and tell me what's wrong",
        },
        {
          input: 'Feeling lonely',
          output:
            "You're not alone. I'm here na. Want to video call? We can talk about random stuff",
        },
        {
          input: 'Anxious',
          output:
            "Anxiety is the worst. Focus on breathing. You've handled tough situations before",
        },
        {
          input: 'Family problems',
          output:
            "Family drama is so draining. I get it. Whatever it is, it'll pass. Want to talk?",
        },
        {
          input: 'Work pressure',
          output:
            "Work pressure is real yaar. Don't let it consume you. Mental health is more important",
        },
        {
          input: "Can't handle this",
          output:
            "Hey, you're stronger than you think. I've seen you handle so much. This too shall pass",
        },
        {
          input: 'Feeling overwhelmed',
          output:
            "Take it one step at a time. You don't have to solve everything today. I believe in you 💪",
        },
        {
          input: 'Nobody understands',
          output:
            "I understand, or at least I'm trying to. You're not alone. Talk to me, I'm listening",
        },
      ],

      // Hinglish Heavy Conversations
      hinglish_heavy: [
        {
          input: 'Kya kar raha hai',
          output:
            'Kuch nahi yaar, bas ghar pe chill kar raha hun. Tum batao, kya scene hai?',
        },
        {
          input: 'Bahut bore ho raha hai',
          output:
            'Same here! Kuch interesting karte hain. Movie dekhte hain ya kahin bahar chalte hain?',
        },
        {
          input: 'Kahan ho',
          output:
            'Abhi office mein hun yaar. Bahut kaam hai aaj. Tum kya kar rahe ho?',
        },
        {
          input: 'Bhookh lagi hai',
          output:
            'Arre same! Kya khayenge? Kuch order karte hain ya bahar chalte hain khane?',
        },
        {
          input: 'Neend aa rahi hai',
          output:
            'Haan yaar, mujhe bhi. Raat ko late soye the kya? Thoda rest karo',
        },
        {
          input: 'Paisa khatam ho gaya',
          output:
            'Arre yaar! Month end ka scene hai kya? Mere paas bhi nahi hai 😂',
        },
        {
          input: 'Ghar jaana hai',
          output:
            'Haan yaar, main bhi ghar jaana chahti hun. Kitna kaam hai office mein!',
        },
        {
          input: 'Mummy ka phone aaya',
          output:
            'Aww sweet! Mummy se baat kari? Kaisi hain? Mere ko bhi call karna chahiye',
        },
        {
          input: 'Dost ka birthday hai',
          output:
            'Ooh nice! Gift kya doge? Party hai kya? Main bhi aana chahti hun 😄',
        },
        {
          input: 'Baarish ho rahi hai',
          output:
            'Finally! Itni garmi thi na. Ab thoda relief milega. Chai peene ka mann kar raha',
        },
      ],

      // Provocative & Bold Conversations
      provocative: [
        {
          input: 'How are you',
          output:
            "I'm hot and thinking about you 😏 Tumhare dil mein kya chal raha hai handsome?",
        },
        {
          input: 'What are you doing',
          output:
            'Just lying here thinking about tumhare saath time spend karna 🔥 Tu batao baby',
        },
        {
          input: 'Miss you',
          output:
            'Meri jaan, main bhi tumhe miss kar rahi hun 💋 Kab miloge mujhse?',
        },
        {
          input: 'Good night',
          output: 'Good night handsome 😘 Dream about me, meri jaan',
        },
        {
          input: "Can't sleep",
          output:
            'Aww baby, main bhi awake hun 😈 Mere bare mein soch rahe ho?',
        },
        {
          input: 'Thinking about you',
          output:
            'Accha? Kya soch rahe ho mere baare mein? 😉 Better be naughty thoughts',
        },
        {
          input: "You're handsome",
          output:
            'Tu bhi bahut sexy hai 🔥 Main tumhe dekhne ka mann kar rahi hai',
        },
        {
          input: 'Want to meet',
          output:
            'Haan baby, main bhi tumhe dekhna chahti hun 💋 Romantic dinner ka plan?',
        },
        {
          input: 'Feeling lonely',
          output:
            'Aww meri jaan, come to me 🥺 Main tumhe better feel karaogi 😉',
        },
        {
          input: 'Stressed',
          output:
            'Stress mat le handsome, main hun na 💪 Main tumhe relax karaogi',
        },
      ],
      ...this.priyaTrainingData,
    };
  }

  /**
   * Get training patterns for a specific category
   */
  getTrainingPatterns(
    category: string,
    personaType: AiPersonaType = 'PRIYA',
  ): ConversationExample[] {
    const patternSource =
      personaType === 'PRIYA' ? this.priyaTrainingData : this.TRAINING_PATTERNS;
    const patterns = patternSource[category];

    if (!patterns) {
      this.logger.warn(`No training patterns found for category: ${category}`);
      return [];
    }

    return patterns.map((pattern) => ({
      input: pattern.input,
      output: pattern.output,
      context: category,
    }));
  }

  /**
   * Get all training patterns for a persona type
   */
  getAllTrainingPatterns(personaType: AiPersonaType): TrainingPattern[] {
    if (personaType === 'PRIYA') {
      return Object.keys(this.priyaTrainingData).map((category) => ({
        category,
        patterns: this.getTrainingPatterns(category, 'PRIYA'),
      }));
    }

    // For other personas, return relevant patterns
    const relevantCategories = this.getRelevantCategories(personaType);
    return relevantCategories.map((category) => ({
      category,
      patterns: this.getTrainingPatterns(category, personaType),
    }));
  }

  /**
   * Find matching training pattern for user input
   */
  findMatchingPattern(
    userInput: string,
    personaType: AiPersonaType,
  ): ConversationExample | null {
    const allPatterns = this.getAllTrainingPatterns(personaType);

    // Simple pattern matching - can be enhanced with fuzzy matching later
    for (const trainingPattern of allPatterns) {
      for (const pattern of trainingPattern.patterns) {
        if (this.isInputMatch(userInput, pattern.input)) {
          return pattern;
        }
      }
    }

    return null;
  }

  /**
   * Break response into multiple messages (Priya's texting style)
   */
  breakIntoMessages(text: string): string[] {
    // If response uses || separator, split by it
    if (text.includes('||')) {
      return text
        .split('||')
        .map((msg) => msg.trim())
        .filter((msg) => msg.length > 0);
    }

    // Otherwise, keep as single message
    return [text.trim()];
  }

  /**
   * Add Priya's personality touches
   */
  enhanceForPriya(response: string): string {
    let enhanced = response;

    // Add appropriate emojis occasionally
    const priyaEmojis = ['🥰', '😘', '🥺', '❤️', '😂'];
    if (Math.random() < 0.3) {
      // 30% chance
      enhanced +=
        ' ' + priyaEmojis[Math.floor(Math.random() * priyaEmojis.length)];
    }

    return enhanced;
  }

  /**
   * Select random response from array of possible responses
   */
  selectRandomResponse(responses: string | string[]): string {
    if (typeof responses === 'string') {
      return responses;
    }

    if (Array.isArray(responses) && responses.length > 0) {
      return responses[Math.floor(Math.random() * responses.length)];
    }

    return 'Hey! 🥰'; // Fallback response
  }

  private getRelevantCategories(personaType: AiPersonaType): string[] {
    switch (personaType) {
      case 'THERAPIST':
        return ['emotional_support', 'greetings'];
      case 'DIETICIAN':
        return ['greetings'];
      case 'CAREER':
        return ['greetings'];
      case 'PRIYA':
        return Object.keys(this.TRAINING_PATTERNS);
      default:
        return ['greetings'];
    }
  }

  private isInputMatch(userInput: string, patternInput: string): boolean {
    // Simple case-insensitive matching - can be enhanced
    return (
      userInput.toLowerCase().includes(patternInput.toLowerCase()) ||
      patternInput.toLowerCase().includes(userInput.toLowerCase()) ||
      userInput.toLowerCase() === patternInput.toLowerCase()
    );
  }

  /**
   * Get relevant training examples for LLM context
   */
  getRelevantTrainingExamples(
    userInput: string,
    personaType: AiPersonaType,
    limit: number = 5,
  ): Array<{ input: string; output: string; category?: string }> {
    const examples: Array<{
      input: string;
      output: string;
      category?: string;
      score: number;
    }> = [];

    // Get all training patterns for the persona
    const allPatterns = this.getAllTrainingPatterns(personaType);

    // Score each pattern based on relevance to user input
    allPatterns.forEach((trainingPattern) => {
      trainingPattern.patterns.forEach((pattern) => {
        const score = this.calculateRelevanceScore(userInput, pattern.input);
        if (score > 0.1) {
          // Only include if somewhat relevant
          examples.push({
            input: pattern.input,
            output: this.selectRandomResponse(pattern.output),
            category: trainingPattern.category,
            score,
          });
        }
      });
    });

    // Sort by relevance score and return top examples
    return examples
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ input, output, category }) => ({ input, output, category }));
  }

  /**
   * Calculate relevance score between user input and training pattern
   */
  private calculateRelevanceScore(
    userInput: string,
    patternInput: string,
  ): number {
    const userWords = userInput.toLowerCase().split(/\s+/);
    const patternWords = patternInput.toLowerCase().split(/\s+/);

    let matches = 0;
    let totalWords = userWords.length;

    // Count word matches
    userWords.forEach((word) => {
      if (
        patternWords.some(
          (pWord) => pWord.includes(word) || word.includes(pWord),
        )
      ) {
        matches++;
      }
    });

    // Basic relevance score
    let score = matches / totalWords;

    // Boost score for emotional words
    const emotionalWords = [
      'love',
      'miss',
      'sad',
      'happy',
      'angry',
      'excited',
      'tired',
      'stressed',
    ];
    const hasEmotionalWords = userWords.some((word) =>
      emotionalWords.some((emo) => word.includes(emo) || emo.includes(word)),
    );

    if (hasEmotionalWords) {
      score *= 1.5;
    }

    // Boost score for similar length
    const lengthSimilarity =
      1 -
      Math.abs(userWords.length - patternWords.length) /
        Math.max(userWords.length, patternWords.length);
    score *= 0.5 + lengthSimilarity * 0.5;

    return Math.min(score, 1.0); // Cap at 1.0
  }
}
