import {AiExtractionResult} from '../../contracts/pulse.contracts';

export const AI_EXTRACTOR = Symbol('AI_EXTRACTOR');

export interface IAiExtractor {
  extract(text: string, today: string): Promise<AiExtractionResult>;
}
