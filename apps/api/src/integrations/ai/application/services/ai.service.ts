import { Injectable } from '@nestjs/common';

import { HybridIntentParser } from '../parsers/hybrid-intent.parser';
import { ConversationStateService } from './conversation-state.service';

@Injectable()
export class AiService {
  constructor(
    private readonly hybridParser: HybridIntentParser,
    private readonly conversationStateService: ConversationStateService,
  ) {}

  async parseReservation(
    message: string,
  ) {
    return this.hybridParser.parseReservation(
      message,
    );
  }

  async processConversation(
    phoneNumber: string,
    restaurantId: string,
    message: string,
  ) {
    const state =
      this.conversationStateService.upsert(
        phoneNumber,
        restaurantId,
      );

    const result =
      await this.hybridParser.parseReservation(
        message,
      );

    state.lastMessage =
      message;

    switch (
      result.intent.intent
    ) {
      case 'reservation':
      case 'modify':
      case 'cancel':
      case 'availability':
case 'check_reservation':
      case 'unknown':
        state.currentIntent =
          result.intent.intent;
        break;

      default:
        state.currentIntent =
          'unknown';
    }

    if (
      result.intent.guests !==
      null
    ) {
      state.guests =
        result.intent.guests;
    }

    if (
      result.intent.date !==
      null
    ) {
      state.date =
        result.intent.date;
    }

    if (
      result.intent.time !==
      null
    ) {
      state.time =
        result.intent.time;
    }

      if (
        result.intent.confirmationCode !==
        null
      ) {
        state.confirmationCode =
          result.intent.confirmationCode;
      }


    const missingFields: string[] =
      [];

    if (
      state.guests === null
    ) {
      missingFields.push(
        'guests',
      );
    }

    if (
      state.date === null
    ) {
      missingFields.push(
        'date',
      );
    }

    if (
      state.time === null
    ) {
      missingFields.push(
        'time',
      );
    }

    state.missingFields =
      missingFields;

    if (
      missingFields.length === 0
    ) {
      state.status =
        'ready_to_book';
    } else if (
      missingFields.includes(
        'guests',
      )
    ) {
      state.status =
        'waiting_guests';
    } else if (
      missingFields.includes(
        'date',
      )
    ) {
      state.status =
        'waiting_date';
    } else {
      state.status =
        'waiting_time';
    }

    this.conversationStateService.save(
      state,
    );

    return {
      state,
      extraction: result,
    };
  }
}