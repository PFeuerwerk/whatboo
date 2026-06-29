import { Injectable } from '@nestjs/common';
import { IntentType } from '../normalizers/intent.normalizer';
import { IntentClassifierService } from './intent-classifier.service';
import { EntityExtractorService } from './entity-extractor.service';
import { ConversationStateService } from './conversation-state.service';

type ConversationIntent =
  | 'reservation'
  | 'modify'
  | 'cancel'
  | 'availability'
  | 'check_reservation'
  | 'unknown';

@Injectable()
export class DeterministicReservationIntentService {
  constructor(
    private readonly intentClassifier: IntentClassifierService,
    private readonly entityExtractor: EntityExtractorService,
    private readonly conversationStateService: ConversationStateService,
  ) {}

  processConversation(
    phoneNumber: string,
    restaurantId: string,
    message: string,
  ) {
    const state = this.conversationStateService.upsert(
      phoneNumber,
      restaurantId,
    );

    const intent = this.intentClassifier.classify(message);
    const entities = this.entityExtractor.extract(message);

    state.lastMessage = message;
    state.currentIntent = this.toConversationIntent(intent);

    if (entities.guests !== null) {
      state.guests = entities.guests;
    }

    if (entities.date !== null) {
      state.date = entities.date;
    }

    if (entities.time !== null) {
      state.time = entities.time;
    }

    if (entities.confirmationCode !== null) {
      state.confirmationCode = entities.confirmationCode;
    }

    const missingFields: string[] = [];

    if (state.guests === null) {
      missingFields.push('guests');
    }

    if (state.date === null) {
      missingFields.push('date');
    }

    if (state.time === null) {
      missingFields.push('time');
    }

    state.missingFields = missingFields;

    if (missingFields.length === 0) {
      state.status = 'ready_to_book';
    } else if (missingFields.includes('guests')) {
      state.status = 'waiting_guests';
    } else if (missingFields.includes('date')) {
      state.status = 'waiting_date';
    } else {
      state.status = 'waiting_time';
    }

    this.conversationStateService.save(state);

    return {
      state,
      extraction: {
        intent: {
          intent,
          guests: entities.guests,
          date: entities.date,
          time: entities.time,
          confirmationCode: entities.confirmationCode,
          confidence: entities.confidence,
        },
        source: 'deterministic',
        usedFallback: false,
      },
    };
  }

  private toConversationIntent(intent: IntentType): ConversationIntent {
    if (intent === 'greeting') {
      return 'unknown';
    }

    return intent;
  }
}
