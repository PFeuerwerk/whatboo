import { Injectable } from '@nestjs/common';

import {
  IntentNormalizer,
  IntentType,
} from '../normalizers/intent.normalizer';

@Injectable()
export class IntentClassifierService {
  constructor(
    private readonly intentNormalizer: IntentNormalizer,
  ) {}

  classify(
    message: string,
  ): IntentType {
    return this.intentNormalizer.normalize(
      message,
    );
  }
}