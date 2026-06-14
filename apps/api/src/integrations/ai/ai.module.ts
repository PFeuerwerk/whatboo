import { GroqService } from "./infrastructure/providers/groq.service";
import { Module } from '@nestjs/common';

import { AiController } from './ai.controller';

import { AiService } from './application/services/ai.service';

import { RegexIntentParser } from './application/parsers/regex-intent.parser';
import { OllamaIntentParser } from './application/parsers/ollama-intent.parser';
import { HybridIntentParser } from './application/parsers/hybrid-intent.parser';

import { EntityExtractorService } from './application/services/entity-extractor.service';
import { IntentClassifierService } from './application/services/intent-classifier.service';
import { ConversationStateService } from './application/services/conversation-state.service';

import { DateNormalizer } from './application/normalizers/date.normalizer';
import { TimeNormalizer } from './application/normalizers/time.normalizer';
import { GuestNormalizer } from './application/normalizers/guest.normalizer';
import { IntentNormalizer } from './application/normalizers/intent.normalizer';
import { MessagePreprocessor } from './application/normalizers/message-preprocessor';

import { MockProvider } from './infrastructure/providers/mock.provider';
import { OllamaProvider } from './infrastructure/providers/ollama.provider';

import { LLM_PROVIDER } from './domain/interfaces/llm-provider.token';

@Module({
  controllers: [AiController],

  providers: [
    GroqService,
    AiService,

    // Normalizers
    DateNormalizer,
    TimeNormalizer,
    GuestNormalizer,
    IntentNormalizer,

    // Preprocessing
    MessagePreprocessor,

    // Semantic Services
    EntityExtractorService,
    IntentClassifierService,
    ConversationStateService,

    // Parsers
    RegexIntentParser,
    OllamaIntentParser,
    HybridIntentParser,

    // Providers
    OllamaProvider,
    MockProvider,

    {
      provide: LLM_PROVIDER,
      useClass: MockProvider,
    },
  ],

  exports: [
    GroqService,
    AiService,
    HybridIntentParser,
    EntityExtractorService,
    IntentClassifierService,
    ConversationStateService,
  ],
})
export class AiModule {}