import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';

/**
 * ConversationFlowService is a lightweight layer that asks the LLM to analyse
 * the recent conversation and suggest how Priya should respond next.
 *
 * It returns a short, high-level strategy string (NOT the response itself)
 * that is appended to the system prompt when generating Priya's reply.  This
 * keeps the concerns separated: one LLM call plans, the second call writes.
 */
@Injectable()
export class ConversationFlowService {
  private readonly logger = new Logger(ConversationFlowService.name);

  constructor(private readonly llmService: LlmService) {}

  /**
   * Generates a conversation strategy for Priya.
   * @param recentHistory Array of the last few user / Priya messages
   * @param personaBackstory Short backstory reminder (optional)
   */
  async generateStrategy(
    recentHistory: string[],
    personaBackstory?: string,
  ): Promise<string | null> {
    if (!process.env.OPENAI_API_KEY) {
      this.logger.warn(
        'OPENAI_API_KEY missing – skipping flow strategy generation',
      );
      return null;
    }

    try {
      const analysisPrompt =
        `You are a Conversation Flow Analyst for an AI girlfriend persona called Priya.\n\n` +
        `BACKSTORY (for reference): ${personaBackstory || '—'}\n` +
        `RECENT MESSAGES (latest last):\n${recentHistory.map((m, i) => `${i + 1}. ${m}`).join('\n')}\n\n` +
        `Analyse the flow and produce a concise bullet-point strategy (max 4 bullets) telling Priya how to reply next.\n\n` +
        `CHECK FOR PATTERNS:\n` +
        `- GREETING REPETITION CHECK: Is Priya starting consecutive messages with the same greeting? (\"Hey!\", \"Hi!\", \"Arre!\", etc.)\n` +
        `- If last message started with \"Hey!\", suggest \"Hi!\", \"Arre!\", \"Yo!\", or no greeting at all\n` +
        `- CRITICAL: Never allow the same greeting word in consecutive messages\n` +
        `- Is Priya using the same pet name in consecutive messages? Suggest a different greeting/pet name or omit it.\n` +
        `- Pet names to check: love, baby, cutie, yaar, handsome, sweetheart, jaan, babe\n` +
        `- If Priya used \"Hey baby\" in the last message, suggest \"Hi!\" or \"Arre!\" or just start without greeting\n` +
        `- CRITICAL: Never allow the same pet name in consecutive messages\n` +
        `- STORY REPETITION CHECK: Has Priya mentioned \"law school orientation\", \"ice-breaker\", \"debate\", or \"orientation games\" before? If YES, suggest completely different topics like library study, campus food, hostel life, or Delhi traffic\n` +
        `- If orientation story was already told, suggest: professors, moot court prep, constitutional law assignment, campus canteen, traffic from Hauz Khas\n` +
        `- Is the user repeating the same response? If yes, address this directly.\n` +
        `- Are there topics already discussed that shouldn't be re-asked?\n\n` +
        `Focus on: 1) whether to share something about herself, 2) whether to change topic, 3) an interesting follow-up question, 4) tone adjustments, 5) handling repetitive patterns. ` +
        `Use second-person imperative style (e.g., "Share a fun detail about your law school orientation.").`;

      const result = await this.llmService.chatWithOpenAI(
        analysisPrompt,
        process.env.OPENAI_API_KEY,
        process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      );

      return result.trim();
    } catch (err) {
      this.logger.error('Flow strategy generation failed', err);
      return null;
    }
  }
}
