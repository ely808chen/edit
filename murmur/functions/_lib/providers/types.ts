import type { ActionProbs, Analysis, Category, DecideContext, DecideRequest, GroupLean, PlaceId, Severity, Weather } from '../../../shared/types';

export interface AnalyzeInput {
  text: string;
  minute: number;
  weather: Weather;
  /** Skip the place question when the player picked a place. */
  clickedPlace: PlaceId | null;
  /** Also ask the per-group lean questions (preview). */
  withLeans: boolean;
}

export interface AnalyzeOutput extends Omit<Analysis, 'mock'> {
  groupLeans: GroupLean[];
  questions: number;
}

/**
 * Every provider returns this neutral shape, so switching PROVIDER never changes the client.
 */
export interface Provider {
  name: string;
  mock: boolean;
  analyze(input: AnalyzeInput, signal: AbortSignal): Promise<AnalyzeOutput>;
  decideBatch(req: DecideRequest, contexts: DecideContext[], signal: AbortSignal): Promise<Map<string, ActionProbs>>;
}

export type { Category, Severity };
