import { ReservationEngineService } from '../../reservations/services/reservation-engine.service';
export declare class WhatsappService {
    private readonly reservationEngine;
    private readonly logger;
    constructor(reservationEngine: ReservationEngineService);
    handleIncoming(body: Record<string, unknown>, signature: string): Promise<void>;
    private extractMessage;
    private processMessage;
}
