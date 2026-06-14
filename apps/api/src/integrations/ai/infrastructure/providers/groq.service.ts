import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import FormData from 'form-data';

@Injectable()
export class GroqService {
  private readonly logger = new Logger(GroqService.name);
  private readonly apiKey: string;
  private readonly apiUrl = 'https://groq.com';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GROQ_API_KEY', '');
  }

  /**
   * Transcribe un buffer de audio .ogg nativo de WhatsApp usando Whisper de forma ultrarrápida.
   */
  async transcribeAudioBuffer(audioBuffer: Buffer, fileName: string = 'audio.ogg'): Promise<string> {
    if (!this.apiKey) {
      this.logger.error('Falta la variable de entorno GROQ_API_KEY.');
      throw new Error('Groq API Key no configurada.');
    }

    try {
      const formData = new FormData();
      formData.append('file', audioBuffer, {
        filename: fileName,
        contentType: 'audio/ogg',
      });
      formData.append('model', 'whisper-large-v3');
      formData.append('language', 'es'); // Fuerza el español para optimizar la latencia y precisión

      const response = await axios.post(this.apiUrl, formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      return response.data?.text || '';
    } catch (error: any) {
      this.logger.error(`Error al transcribir en Groq Whisper: ${error?.message}`);
      throw error;
    }
  }
}
