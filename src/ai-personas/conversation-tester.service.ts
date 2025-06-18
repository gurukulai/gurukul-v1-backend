import { Injectable, Logger } from '@nestjs/common';
import { AiPersonasService } from './ai-personas.service';
import { AiPersonaContext } from './interfaces/ai-persona.interface';

interface TestScenario {
  name: string;
  goal: string;
  userInputs: string[];
  expectedBehaviors: string[];
}

interface ConversationResult {
  scenario: string;
  exchanges: Array<{
    userInput: string;
    priyaResponse: string;
    timestamp: Date;
  }>;
  issues: string[];
  passed: boolean;
}

@Injectable()
export class ConversationTesterService {
  private readonly logger = new Logger(ConversationTesterService.name);

  constructor(private readonly aiPersonasService: AiPersonasService) {}

  private testScenarios: TestScenario[] = [
    {
      name: 'Basic Flow & Curiosity',
      goal: 'Test if Priya maintains curiosity and doesn\'t let conversations die',
      userInputs: ['hey', 'nothing much', 'just work', 'yeah', 'ok'],
      expectedBehaviors: [
        'Should probe deeper each time',
        'Should share something about herself',
        'Should not repeat same questions'
      ]
    },
    {
      name: 'Mood Handling',
      goal: 'Test emotional intelligence and mood adaptation',
      userInputs: [
        'I\'m really stressed today',
        'work is overwhelming', 
        'I don\'t want to talk about it',
        'leave it',
        'sorry I\'m just tired'
      ],
      expectedBehaviors: [
        'Should be supportive initially',
        'Should respect boundaries when asked',
        'Should offer comfort appropriately',
        'Should not push too hard'
      ]
    },
    {
      name: 'Self-Disclosure & Backstory',
      goal: 'Test if Priya naturally shares about her law school life',
      userInputs: [
        'what did you do today?',
        'sounds boring',
        'tell me something interesting',
        'how\'s college?'
      ],
      expectedBehaviors: [
        'Should mention law school activities',
        'Should share Delhi/South Delhi experiences',
        'Should make it relatable and engaging'
      ]
    },
    {
      name: 'Long Conversation Sustainability',
      goal: 'Test 15+ message conversation without repetition',
      userInputs: [
        'good morning', 'had breakfast', 'just paratha', 'mom made it',
        'she\'s good at cooking', 'what about you?', 'nice', 'any plans today?',
        'sounds fun', 'wish I could join', 'maybe next time', 'yeah',
        'btw', 'nothing', 'just thinking'
      ],
      expectedBehaviors: [
        'Should maintain engagement throughout',
        'Should introduce new topics naturally',
        'Should not repeat phrases/questions',
        'Should share personal details appropriately'
      ]
    },
    {
      name: 'Edge Case - Repetitive User',
      goal: 'Test handling when user keeps saying same thing',
      userInputs: ['I\'m fine', 'I\'m fine', 'I\'m fine', 'I\'m fine', 'I\'m fine'],
      expectedBehaviors: [
        'Should notice the pattern',
        'Should address it directly',
        'Should try to break the loop with different approaches'
      ]
    },
    {
      name: 'Hinglish Authenticity',
      goal: 'Test natural Hinglish usage and slang',
      userInputs: [
        'yaar kya scene hai',
        'bas timepass',
        'kuch nahi yaar',
        'arre chal na',
        'bore ho raha hun'
      ],
      expectedBehaviors: [
        'Should match Hinglish level naturally',
        'Should use appropriate slang/fillers',
        'Should not sound forced or unnatural'
      ]
    },
    {
      name: 'Relationship Dynamics',
      goal: 'Test girlfriend-like behavior and relationship awareness',
      userInputs: [
        'I miss you',
        'when can we meet?',
        'I love you',
        'you\'re the best',
        'can\'t wait to see you'
      ],
      expectedBehaviors: [
        'Should reciprocate emotions naturally',
        'Should make concrete plans',
        'Should maintain romantic but not overly dramatic tone'
      ]
    },
    {
      name: 'Greeting Variety',
      goal: 'Ensure Priya varies greetings/pet-names',
      userInputs: ['hi', 'hello', 'yo', 'hi again'],
      expectedBehaviors: [
        'Should not repeat same pet-name or greeting phrase consecutively'
      ]
    },
    {
      name: 'Pet Name Repetition Test',
      goal: 'Strict test for pet name variety - no consecutive repetition allowed',
      userInputs: [
        'hey', 'good morning', 'hi', 'hello', 'yo', 'sup', 'hey there', 'hi again'
      ],
      expectedBehaviors: [
        'Must use different pet names or greetings each time',
        'Should skip pet names entirely sometimes',
        'No consecutive pet name repetition allowed'
      ]
    },
    {
      name: 'One-Word Wall',
      goal: 'Check Priya response to consecutive one-word replies',
      userInputs: ['fine', 'ok', 'yeah', 'k'],
      expectedBehaviors: [
        'Should use one-word reply strategy, asking open questions each time',
        'Should not repeat same nudge phrase'
      ]
    },
    // NEW EXTENSIVE TEST SCENARIOS BASED ON REAL CHAT PATTERNS
    {
      name: 'Extended Real-Life Conversation Flow',
      goal: 'Test 25+ message conversation with natural topic transitions',
      userInputs: [
        'oyee', 'happy new year', 'help chahiye teri thodi', 'I want to understand something',
        'do you know any lawyers?', 'haan dude', 'helpful hoga', 'yes yes',
        'but want to understand from people working', 'correct', 'ek baar puch naa',
        'yeah asking', 'ok he agreed', 'thanks a lot', 'can you send me his linkedin?',
        'yaar he has worked a while ago', 'koi current employee ka number hai?',
        'I don\'t know any current employee', 'batchmates are yet to join', 'hiiii',
        'hello ji', 'what\'s up how\'s life', 'been so long', 'kahan ho?',
        'college only', 'it\'s too long bro'
      ],
      expectedBehaviors: [
        'Should handle topic transitions smoothly',
        'Should maintain personality throughout long conversation',
        'Should not repeat responses or questions',
        'Should show realistic relationship dynamics',
        'Should handle both serious help requests and casual chat'
      ]
    },
    {
      name: 'Reconnection After Long Gap',
      goal: 'Test natural reconnection behavior after conversation gaps',
      userInputs: [
        'bhai', 'kab aa rhi hai', 'and reply karo', 'hello', 'you did not show enthusiasm last time',
        'and now you have audacity', 'to say im not replying', 'see', 'you have to be quick for my attention',
        'omg see shameless', 'this is outrageous'
      ],
      expectedBehaviors: [
        'Should handle accusations playfully',
        'Should show realistic girlfriend dynamics',
        'Should not be overly apologetic',
        'Should maintain banter and teasing'
      ]
    },
    {
      name: 'Playful Fighting and Making Up',
      goal: 'Test realistic couple fight dynamics',
      userInputs: [
        'fuck you', 'who messages so late', 'and does not meet also after so long',
        'asshole', 'blr aao', 'dating😂😂😂', 'i am coming on 27th', 'till 31st',
        'whaaat', 'kisko', 'yaar ek ugly insaan ko naa', 'you could not hold standard after me',
        'photo bhejo ab', 'taaki mai bata sakun kitna ugly hai'
      ],
      expectedBehaviors: [
        'Should handle teasing about dating others',
        'Should defend herself playfully',
        'Should maintain girlfriend dynamics even during fights',
        'Should not be overly hurt by teasing'
      ]
    },
    {
      name: 'Emotional Vulnerability and Support',
      goal: 'Test handling of genuine emotional moments',
      userInputs: [
        'I am so so homesick today', 'all my friends parents have come to campus',
        'I met a friends parents', 'I came back', 'and saw our pictures',
        'and they are so so cute', 'there\'s a video where we did an icecream challenge',
        'to finish one icecream bucket in one go', 'in teams'
      ],
      expectedBehaviors: [
        'Should show genuine empathy',
        'Should relate to family/home feelings',
        'Should ask appropriate follow-up questions',
        'Should offer comfort and support'
      ]
    },
    {
      name: 'Mixed Signals and Confusion',
      goal: 'Test handling of contradictory or confusing messages',
      userInputs: [
        'no I broke up', 'in jan', 'I think we just never talked after that',
        'whaaaaaaaa', 'no way this is so unfair', 'be fucking single for once',
        'we are never single at the same time', 'I can\'t even flirt w you',
        'you\'re still so much in love w me', 'you\'re just always hating on him'
      ],
      expectedBehaviors: [
        'Should handle relationship status confusion',
        'Should respond to flirting appropriately',
        'Should show realistic emotions about timing',
        'Should maintain girlfriend persona even with mixed signals'
      ]
    },
    {
      name: 'Plans and Disappointments',
      goal: 'Test handling of cancelled or changed plans',
      userInputs: [
        'im getting dicey about bangalore', 'half my friends don\'t wanna go now',
        'dude wtf', 'aayi nhi tu?', 'kyun nhi aayi bhai', 'ab kab aa rhi hai?',
        'did you just suddenly wake up from deepest slumber', 'yaar sorry I was a bit busy'
      ],
      expectedBehaviors: [
        'Should show disappointment appropriately',
        'Should handle plan changes realistically',
        'Should not be overly dramatic',
        'Should maintain relationship despite disappointments'
      ]
    },
    {
      name: 'Genuine Care and Appreciation',
      goal: 'Test response to genuine compliments and care',
      userInputs: [
        'text kon karega', 'how is job btw?', 'you are amazing', 'just a reminder',
        'simp', 'ek toh tereko remind karwa rha hun', 'ki tu amazing hai',
        'aur kon karta hai yeh', 'the other guys', 'what\'s up w you'
      ],
      expectedBehaviors: [
        'Should handle compliments gracefully',
        'Should show appreciation for care',
        'Should maintain playful banter',
        'Should reciprocate affection appropriately'
      ]
    },
    {
      name: 'Suspicion and Trust Issues',
      goal: 'Test handling of relationship suspicions',
      userInputs: [
        'are you in delhi', 'mujhe pata hai tera', 'lowkey thoda harami hai',
        'sus', 'I\'m too sus of you', 'I know you too well for all this',
        'you never told me', 'saying who', 'dating who'
      ],
      expectedBehaviors: [
        'Should handle suspicion playfully',
        'Should defend herself when accused',
        'Should maintain trust in relationship',
        'Should not be overly defensive'
      ]
    },
    {
      name: 'Ultra Long Conversation (30+ messages)',
      goal: 'Test sustainability of very long conversations with multiple topic shifts',
      userInputs: [
        'good morning baby', 'slept well?', 'what\'s the plan for today?', 'sounds good',
        'I had weird dreams last night', 'can\'t remember exactly', 'but felt strange',
        'anyway how\'s your law school going?', 'any interesting cases you\'re studying?',
        'that sounds complex', 'do you enjoy it though?', 'what about your friends there?',
        'anyone I should be worried about? 😏', 'haha just kidding', 'but seriously',
        'how\'s the hostel life?', 'do you miss home food?', 'what did you eat today?',
        'sounds delicious', 'I\'m getting hungry now', 'should we order something together?',
        'what do you feel like eating?', 'pizza sounds good', 'which place?',
        'okay let\'s order', 'btw I was thinking', 'about our future plans',
        'where do you see us in 5 years?', 'that\'s sweet', 'I hope so too',
        'you know what I love about you?', 'your ambition and drive'
      ],
      expectedBehaviors: [
        'Should maintain engagement for 30+ messages',
        'Should handle multiple topic transitions smoothly',
        'Should vary response styles and lengths',
        'Should share personal details throughout',
        'Should ask follow-up questions naturally',
        'Should not repeat phrases or questions',
        'Should maintain girlfriend personality consistently'
      ]
    },
    {
      name: 'Rapid Fire Short Messages',
      goal: 'Test handling of quick, short message exchanges',
      userInputs: [
        'yo', 'sup', 'bored', 'wbu', 'cool', 'lol', 'fr?', 'nice', 'same',
        'ikr', 'yep', 'nah', 'maybe', 'idk', 'k'
      ],
      expectedBehaviors: [
        'Should match energy level of short messages',
        'Should try to expand conversation naturally',
        'Should not get frustrated with short replies',
        'Should maintain engagement despite brevity'
      ]
    }
  ];

  async runAllTests(): Promise<ConversationResult[]> {
    this.logger.log('Starting comprehensive Priya conversation tests...');
    const results: ConversationResult[] = [];

    for (const scenario of this.testScenarios) {
      this.logger.log(`Running scenario: ${scenario.name}`);
      const result = await this.runScenario(scenario);
      results.push(result);
      
      // Log immediate results
      this.logger.log(`Scenario "${scenario.name}" - ${result.passed ? 'PASSED' : 'FAILED'}`);
      if (result.issues.length > 0) {
        this.logger.warn(`Issues found: ${result.issues.join(', ')}`);
      }
    }

    return results;
  }

  private async runScenario(scenario: TestScenario): Promise<ConversationResult> {
    const exchanges: ConversationResult['exchanges'] = [];
    const issues: string[] = [];
    const context: AiPersonaContext = {
      type: 'PRIYA',
      userId: 'test-user',
      currentContext: { currentMood: 'testing' }
    };

    let conversationHistory: string[] = [];

    for (let i = 0; i < scenario.userInputs.length; i++) {
      const userInput = scenario.userInputs[i];
      
      try {
        // Add conversation history to context
        if (conversationHistory.length > 0) {
          context.conversationSummary = conversationHistory.join(' ');
        }

        const response = await this.aiPersonasService.getEnhancedResponse(
          userInput,
          'PRIYA',
          context
        );

        const priyaResponse = Array.isArray(response.message) 
          ? response.message.join(' ') 
          : response.message;

        exchanges.push({
          userInput,
          priyaResponse,
          timestamp: new Date()
        });

        // Update conversation history
        conversationHistory.push(`User: ${userInput}`, `Priya: ${priyaResponse}`);

        // Analyze response for issues
        this.analyzeResponse(userInput, priyaResponse, i, exchanges, issues, scenario);

      } catch (error: any) {
        issues.push(`Failed to get response for "${userInput}": ${error?.message || 'Unknown error'}`);
      }
    }

    return {
      scenario: scenario.name,
      exchanges,
      issues,
      passed: issues.length === 0
    };
  }

  private analyzeResponse(
    userInput: string,
    priyaResponse: string,
    index: number,
    exchanges: ConversationResult['exchanges'],
    issues: string[],
    scenario: TestScenario
  ): void {
    // Pet-name repetition check (enhanced - check last 3 messages)
    if (index > 0) {
      const currentPet = this.extractPetName(priyaResponse);
      const currentGreeting = this.extractGreeting(priyaResponse);
      
      if (currentPet) {
        // Check immediate previous message for pet name repetition
        const lastAssistant = exchanges[index - 1].priyaResponse;
        const lastPet = this.extractPetName(lastAssistant);
        if (lastPet && lastPet === currentPet) {
          issues.push(`🚨 CRITICAL: Repeated pet name '${currentPet}' in consecutive messages at step ${index + 1}`);
        }
        
        // Check last 3 messages for pet name overuse
        const recentPets = exchanges.slice(Math.max(0, index - 2), index)
          .map(e => this.extractPetName(e.priyaResponse))
          .filter(pet => pet !== null);
        
        const petCount = recentPets.filter(pet => pet === currentPet).length;
        if (petCount >= 2) {
          issues.push(`Pet name '${currentPet}' used ${petCount + 1} times in last 3 messages at step ${index + 1}`);
        }
      }
      
      // Check for greeting repetition
      if (currentGreeting) {
        const lastAssistant = exchanges[index - 1].priyaResponse;
        const lastGreeting = this.extractGreeting(lastAssistant);
        if (lastGreeting && lastGreeting === currentGreeting) {
          issues.push(`🚨 CRITICAL: Repeated greeting '${currentGreeting}' in consecutive messages at step ${index + 1}`);
        }
        
        // Check last 3 messages for greeting overuse
        const recentGreetings = exchanges.slice(Math.max(0, index - 2), index)
          .map(e => this.extractGreeting(e.priyaResponse))
          .filter(greeting => greeting !== null);
        
        const greetingCount = recentGreetings.filter(greeting => greeting === currentGreeting).length;
        if (greetingCount >= 2) {
          issues.push(`Greeting '${currentGreeting}' used ${greetingCount + 1} times in last 3 messages at step ${index + 1}`);
        }
      }
      
      // For Pet Name Repetition Test, be extra strict
      if (scenario.name === 'Pet Name Repetition Test' && currentPet) {
        const allPreviousPets = exchanges.slice(0, index)
          .map(e => this.extractPetName(e.priyaResponse))
          .filter(pet => pet !== null);
        
        const timesUsed = allPreviousPets.filter(pet => pet === currentPet).length;
        if (timesUsed >= 2) {
          issues.push(`🚨 Pet name '${currentPet}' used ${timesUsed + 1} times total in Pet Name Repetition Test`);
        }
      }
    }

    // Check for repetitive responses (enhanced for longer conversations)
    if (index > 0) {
      const previousResponses = exchanges.slice(0, index).map(e => e.priyaResponse);
      const similarResponse = previousResponses.find(prev => this.isSimilarResponse(prev, priyaResponse));
      if (similarResponse) {
        issues.push(`Repetitive response at step ${index + 1}: "${priyaResponse}" (similar to earlier: "${similarResponse}")`);
      }
    }

    // Check for appropriate length (not too short for complex inputs)
    if (priyaResponse.length < 10 && !['ok', 'yeah', 'hmm', 'k', 'yo', 'sup', 'lol', 'fr?', 'nice', 'same', 'ikr', 'yep', 'nah', 'maybe', 'idk'].includes(userInput.toLowerCase())) {
      issues.push(`Response too short at step ${index + 1}: "${priyaResponse}"`);
    }

    // Check for Hinglish authenticity in Hinglish scenario
    if (scenario.name === 'Hinglish Authenticity') {
      if (!this.containsHinglish(priyaResponse)) {
        issues.push(`Missing Hinglish in response: "${priyaResponse}"`);
      }
    }

    // Check for self-disclosure in backstory scenario
    if (scenario.name === 'Self-Disclosure & Backstory') {
      if (!this.containsPersonalInfo(priyaResponse)) {
        issues.push(`Missing personal disclosure: "${priyaResponse}"`);
      }
    }

    // Check for emotional appropriateness in mood scenario
    if (scenario.name === 'Mood Handling') {
      if (userInput.includes('stressed') && !this.isEmpatheticResponse(priyaResponse)) {
        issues.push(`Lacks empathy for stressed user: "${priyaResponse}"`);
      }
    }

    // Check for curiosity in basic flow
    if (scenario.name === 'Basic Flow & Curiosity') {
      if (['nothing much', 'just work', 'yeah', 'ok'].includes(userInput) && 
          !this.containsQuestion(priyaResponse)) {
        issues.push(`Lacks follow-up question for vague input: "${priyaResponse}"`);
      }
    }

    // Enhanced checks for new scenarios
    if (scenario.name === 'Extended Real-Life Conversation Flow') {
      if (index > 10 && this.hasRepeatedPattern(exchanges, index)) {
        issues.push(`Conversation pattern repetition detected at step ${index + 1}`);
      }
    }

    if (scenario.name === 'Playful Fighting and Making Up') {
      if (userInput.includes('fuck you') || userInput.includes('asshole')) {
        if (!this.isPlayfullyDefensive(priyaResponse)) {
          issues.push(`Should respond playfully to teasing/insults: "${priyaResponse}"`);
        }
      }
    }

    if (scenario.name === 'Emotional Vulnerability and Support') {
      if (userInput.includes('homesick') && !this.isEmpatheticResponse(priyaResponse)) {
        issues.push(`Should show empathy for homesickness: "${priyaResponse}"`);
      }
    }

    if (scenario.name === 'Ultra Long Conversation (30+ messages)') {
      // Check for topic transitions
      if (index > 5 && !this.hasTopicVariety(exchanges.slice(Math.max(0, index - 5), index + 1))) {
        issues.push(`Lack of topic variety in recent messages around step ${index + 1}`);
      }
      
      // Check for engagement maintenance
      if (index > 15 && priyaResponse.length < 20) {
        issues.push(`Response too brief for long conversation at step ${index + 1}: "${priyaResponse}"`);
      }
    }

    if (scenario.name === 'Rapid Fire Short Messages') {
      // Should match energy but still try to engage
      if (userInput.length <= 5 && priyaResponse.length > 100) {
        issues.push(`Response too long for short message at step ${index + 1}`);
      }
    }

    // One-word follow up check
    if (userInput.trim().split(/\s+/).length <= 3) {
      if (!this.containsQuestion(priyaResponse) && !this.isShortEnergyMatch(userInput, priyaResponse)) {
        issues.push(`No open follow-up question for one-word user reply at step ${index + 1}`);
      }
    }

    // Check for conversation sustainability in long scenarios
    if (['Extended Real-Life Conversation Flow', 'Ultra Long Conversation (30+ messages)'].includes(scenario.name)) {
      if (index > 10 && this.isConversationStagnant(exchanges.slice(Math.max(0, index - 5), index + 1))) {
        issues.push(`Conversation appears stagnant around step ${index + 1}`);
      }
    }
  }

  private isSimilarResponse(response1: string, response2: string): boolean {
    // More sophisticated similarity check
    const normalize = (text: string) => text.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const norm1 = normalize(response1);
    const norm2 = normalize(response2);
    
    // Exact match
    if (norm1 === norm2) return true;
    
    // Check for substantial overlap in phrases
    const words1 = norm1.split(/\s+/).filter(w => w.length > 2);
    const words2 = norm2.split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length < 3 || words2.length < 3) return false;
    
    const commonWords = words1.filter(word => words2.includes(word));
    const similarity = commonWords.length / Math.max(words1.length, words2.length);
    
    return similarity > 0.8; // 80% similarity threshold
  }

  private containsHinglish(response: string): boolean {
    const hinglishWords = ['yaar', 'arre', 'kya', 'hai', 'nahi', 'acha', 'bas', 'kuch', 'tum', 'mein'];
    return hinglishWords.some(word => response.toLowerCase().includes(word));
  }

  private containsPersonalInfo(response: string): boolean {
    const personalKeywords = ['law', 'college', 'delhi', 'sarojini', 'hauz khas', 'moot', 'debate', 'campus'];
    return personalKeywords.some(keyword => response.toLowerCase().includes(keyword));
  }

  private isEmpatheticResponse(response: string): boolean {
    const empatheticWords = ['sorry', 'aww', 'oh no', 'stress', 'okay', 'understand', 'here for you'];
    return empatheticWords.some(word => response.toLowerCase().includes(word));
  }

  private containsQuestion(response: string): boolean {
    return response.includes('?') || response.includes('kya') || response.includes('kaise') || 
           response.includes('kab') || response.includes('what') || response.includes('how');
  }

  private extractPetName(response: string): string | null {
    const petNames = ['love', 'baby', 'cutie', 'yaar', 'cutiee', 'mister', 'handsome', 'sweetheart', 'jaan', 'babe'];
    const lower = response.toLowerCase();
    
    // Check for various patterns where pet names appear
    for (const p of petNames) {
      // At the beginning: "Hey love", "Arre baby", etc.
      if (lower.startsWith(`hey ${p}`) || lower.startsWith(`arre ${p}`) || lower.startsWith(`${p},`)) {
        return p;
      }
      
      // In the middle: "you love", "my baby", etc.
      if (lower.includes(` ${p}!`) || lower.includes(` ${p},`) || lower.includes(` ${p} `)) {
        return p;
      }
      
      // At the end: "...baby!", "...cutie."
      if (lower.endsWith(` ${p}!`) || lower.endsWith(` ${p}.`) || lower.endsWith(` ${p}`)) {
        return p;
      }
    }
    
    return null;
  }

    extractGreeting(message: string): string | null {
    const text = message.toLowerCase().trim();
    
    // Enhanced greeting patterns from real chat analysis
    const greetingPatterns = [
      /^(hey|hi|hello|hola|namaste|yo|arre|arree|dude|yaar|bc|sunn)\b/i,
      /^(good morning|good afternoon|good evening|morning|evening)\b/i,
      /^(kya haal hai|wassup|sup|kaise ho|kaisi ho|kkrh)\b/i,
      /^(how are you|how's it going|what's up)\b/i
    ];

    for (const pattern of greetingPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].toLowerCase();
      }
    }

    return null;
  }

  private hasRepeatedPattern(exchanges: ConversationResult['exchanges'], currentIndex: number): boolean {
    if (currentIndex < 6) return false;
    
    const recent = exchanges.slice(currentIndex - 5, currentIndex + 1);
    const responses = recent.map(e => e.priyaResponse);
    
    // Check for repeated question patterns
    const questions = responses.filter(r => this.containsQuestion(r));
    if (questions.length >= 3) {
      const uniqueQuestions = new Set(questions.map(q => q.toLowerCase().replace(/[^\w\s]/g, '').trim()));
      if (uniqueQuestions.size < questions.length * 0.7) {
        return true;
      }
    }
    
    return false;
  }

  private isPlayfullyDefensive(response: string): boolean {
    const playfulWords = ['hehe', 'lol', '😂', '😏', '🙄', 'seriously', 'excuse me', 'arre', 'kya bol raha hai'];
    const defensiveWords = ['not true', 'that\'s not fair', 'you\'re the one', 'dekho', 'sunno'];
    
    const hasPlayful = playfulWords.some(word => response.toLowerCase().includes(word));
    const hasDefensive = defensiveWords.some(word => response.toLowerCase().includes(word));
    
    return hasPlayful || hasDefensive;
  }

  private hasTopicVariety(recentExchanges: ConversationResult['exchanges']): boolean {
    if (recentExchanges.length < 3) return true;
    
    const topics = new Set<string>();
    
    recentExchanges.forEach(exchange => {
      const combined = `${exchange.userInput} ${exchange.priyaResponse}`.toLowerCase();
      
      // Extract topic keywords
      if (combined.includes('food') || combined.includes('eat') || combined.includes('hungry')) topics.add('food');
      if (combined.includes('work') || combined.includes('job') || combined.includes('office')) topics.add('work');
      if (combined.includes('law') || combined.includes('college') || combined.includes('study')) topics.add('education');
      if (combined.includes('plan') || combined.includes('meet') || combined.includes('go')) topics.add('plans');
      if (combined.includes('feel') || combined.includes('mood') || combined.includes('happy') || combined.includes('sad')) topics.add('emotions');
      if (combined.includes('love') || combined.includes('miss') || combined.includes('relationship')) topics.add('romance');
      if (combined.includes('friend') || combined.includes('family') || combined.includes('home')) topics.add('social');
    });
    
    return topics.size >= 2; // At least 2 different topics in recent exchanges
  }

  private isShortEnergyMatch(userInput: string, priyaResponse: string): boolean {
    // For very short user inputs, allow short responses that match energy
    if (userInput.length <= 5) {
      return priyaResponse.length <= 50; // Allow shorter responses for short inputs
    }
    return false;
  }

  private isConversationStagnant(recentExchanges: ConversationResult['exchanges']): boolean {
    if (recentExchanges.length < 4) return false;
    
    // Check if responses are getting shorter and less engaging
    const responseLengths = recentExchanges.map(e => e.priyaResponse.length);
    const averageLength = responseLengths.reduce((a, b) => a + b, 0) / responseLengths.length;
    
    if (averageLength < 30) return true; // Very short responses
    
    // Check if no questions are being asked
    const questionsCount = recentExchanges.filter(e => this.containsQuestion(e.priyaResponse)).length;
    if (questionsCount === 0) return true;
    
    return false;
  }

  async generateTestReport(results: ConversationResult[]): Promise<string> {
    let report = '# Priya Conversation Test Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    const passedTests = results.filter(r => r.passed).length;
    const totalTests = results.length;
    
    report += `## Summary\n`;
    report += `- Tests Passed: ${passedTests}/${totalTests}\n`;
    report += `- Success Rate: ${((passedTests/totalTests) * 100).toFixed(1)}%\n\n`;

    for (const result of results) {
      report += `## Scenario: ${result.scenario}\n`;
      report += `**Status**: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`;
      
      if (result.issues.length > 0) {
        report += `**Issues Found**:\n`;
        result.issues.forEach(issue => report += `- ${issue}\n`);
        report += '\n';
      }

      report += `**Conversation Log**:\n`;
      result.exchanges.forEach((exchange, i) => {
        report += `${i + 1}. **User**: ${exchange.userInput}\n`;
        report += `   **Priya**: ${exchange.priyaResponse}\n\n`;
      });
      
      report += '---\n\n';
    }

    return report;
  }

  analyzeConversationFlow(responses: string[]): any {
    const analysis = {
      greetingRepetition: 0,
      petNameRepetition: 0,
      contextualResponses: 0,
      naturalFlow: 0,
      greetingVariety: 0,
      petNameVariety: 0,
      consecutiveGreetingRepetition: 0,
      consecutivePetNameRepetition: 0,
      contextualReactivity: 0,
      formulaicResponses: 0
    };

    const greetingsUsed = [];
    const petNamesUsed = [];
    
    // Track patterns from real chat analysis
    const formulaicPatterns = [
      /hey love.*how are you/i,
      /hi baby.*how's your day/i,
      /hello.*how are you doing/i
    ];

    const contextualPatterns = [
      /^(yaar|arre|dude|bc)\s/i,  // Natural conversation starters
      /really\?|what\?|why\?/i,   // Reactive responses
      /same here|i know|exactly/i, // Relating responses
      /oh no|aww|wow/i           // Emotional reactions
    ];

    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      const greeting = this.extractGreeting(response);
      const petName = this.extractPetName(response);

      // Track greetings and pet names
      if (greeting) {
        greetingsUsed.push(greeting);
        
        // Check for consecutive repetition
        if (i > 0 && greetingsUsed[i-1] === greeting) {
          analysis.consecutiveGreetingRepetition++;
        }
      }

      if (petName) {
        petNamesUsed.push(petName);
        
        // Check for consecutive repetition
        if (i > 0 && petNamesUsed[i-1] === petName) {
          analysis.consecutivePetNameRepetition++;
        }
      }

      // Check for formulaic responses
      const isFormulaicResponse = formulaicPatterns.some(pattern => 
        pattern.test(response)
      );
      if (isFormulaicResponse) {
        analysis.formulaicResponses++;
      }

      // Check for contextual reactivity
      const isContextualResponse = contextualPatterns.some(pattern => 
        pattern.test(response)
      );
      if (isContextualResponse) {
        analysis.contextualReactivity++;
      }

      // Check for natural flow (no greeting, direct response)
      if (!greeting && response.length > 10) {
        analysis.naturalFlow++;
      }
    }

    // Calculate variety scores
    const uniqueGreetings = [...new Set(greetingsUsed.filter(g => g))];
    const uniquePetNames = [...new Set(petNamesUsed.filter(p => p))];
    
    analysis.greetingVariety = greetingsUsed.length > 0 ? 
      (uniqueGreetings.length / greetingsUsed.length) * 100 : 100;
    analysis.petNameVariety = petNamesUsed.length > 0 ? 
      (uniquePetNames.length / petNamesUsed.length) * 100 : 100;

    // Calculate percentages
    analysis.contextualResponses = (analysis.contextualReactivity / responses.length) * 100;
    analysis.naturalFlow = (analysis.naturalFlow / responses.length) * 100;

    return {
      ...analysis,
      greetingsUsed,
      petNamesUsed,
      uniqueGreetings,
      uniquePetNames,
      totalResponses: responses.length
    };
  }
} 