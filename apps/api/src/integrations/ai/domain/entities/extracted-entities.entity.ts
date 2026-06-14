export interface ExtractedEntities {
  guests: number | null;

  date: string | null;

  time: string | null;

  confidence: number;


  confirmationCode: string | null;
  source:
    | 'regex'
    | 'normalizer'
    | 'ai';
}