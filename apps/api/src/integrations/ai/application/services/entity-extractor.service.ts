import { Injectable } from '@nestjs/common';

import { MessagePreprocessor } from '../normalizers/message-preprocessor';

import { ExtractedEntities } from '../../domain/entities/extracted-entities.entity';

@Injectable()
export class EntityExtractorService {
  constructor(
    private readonly messagePreprocessor: MessagePreprocessor,
  ) {}

  extract(
    message: string,
  ): ExtractedEntities {
    return this.messagePreprocessor.preprocess(
      message,
    );
  }
}