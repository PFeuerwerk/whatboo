import { Injectable } from '@nestjs/common';

import {
  ConversationState,
  ConversationStatus,
} from '../../domain/entities/conversation-state.entity';

@Injectable()
export class ConversationStateService {
  private readonly conversations = new Map<string, ConversationState>();

  get(phoneNumber: string): ConversationState | null {
    return this.conversations.get(phoneNumber) ?? null;
  }

  save(state: ConversationState): void {
    state.updatedAt = new Date();
    this.conversations.set(state.phoneNumber, state);
  }

  remove(phoneNumber: string): void {
    this.conversations.delete(phoneNumber);
  }

  create(phoneNumber: string, restaurantId: string): ConversationState {
    const now = new Date();

    const state: ConversationState = {
      phoneNumber,
      restaurantId,
      currentIntent: 'unknown',
      guests: null,
      date: null,
      time: null,
      lastMessage: null,
      missingFields: [],
      status: 'new',
      pendingAction: 'none',
      alternativeSlots: [],
      pendingCancellationCode: null,
        pendingModificationCode: null,
        confirmationCode: null,
      createdAt: now,
      updatedAt: now,
    };

    this.save(state);
    return state;
  }

  updateStatus(
    state: ConversationState,
    status: ConversationStatus,
  ): ConversationState {
    state.status = status;
    this.save(state);
    return state;
  }

  upsert(phoneNumber: string, restaurantId: string): ConversationState {
    return this.get(phoneNumber) ?? this.create(phoneNumber, restaurantId);
  }
}