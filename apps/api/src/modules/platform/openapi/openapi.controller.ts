import { Controller, Get, InternalServerErrorException } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

@Controller('openapi.json')
export class OpenApiController {
  private readonly documentPath = this.resolveDocumentPath();
  private document: unknown;

  @Get()
  getDocument() {
    if (!this.document) {
      this.document = this.readDocument();
    }

    return this.document;
  }

  private readDocument(): unknown {
    try {
      return JSON.parse(readFileSync(this.documentPath, 'utf8')) as unknown;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown OpenAPI read error';
      throw new InternalServerErrorException(`No se pudo cargar docs/api/openapi.yml: ${message}`);
    }
  }

  private resolveDocumentPath(): string {
    const candidates = [
      resolve(process.cwd(), '../../docs/api/openapi.yml'),
      resolve(process.cwd(), 'docs/api/openapi.yml'),
      resolve(__dirname, '../../../../../../docs/api/openapi.yml'),
    ];

    const found = candidates.find(candidate => existsSync(candidate));
    if (!found) {
      throw new InternalServerErrorException('No se encontro docs/api/openapi.yml para servir /openapi.json.');
    }

    return found;
  }
}
