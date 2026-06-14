import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import { AiService } from './application/services/ai.service';

import { ParseReservationDto } from './dto/parse-reservation.dto';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
  ) {}

  @Post('test')
  async test(
    @Body() dto: ParseReservationDto,
  ) {
    if (
      dto.phoneNumber &&
      dto.restaurantId
    ) {
      return this.aiService.processConversation(
        dto.phoneNumber,
        dto.restaurantId,
        dto.message,
      );
    }

    return this.aiService.parseReservation(
      dto.message,
    );
  }
}