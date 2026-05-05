import {AiExtractionResult} from '../../contracts/clinic-flow.contracts';

export const AI_EXTRACTOR = Symbol('AI_EXTRACTOR');

export interface IAiExtractor {
  extract(text: string, today: string): Promise<AiExtractionResult>;
}
