import { buildReview } from '../game/review.ts';
import { suggestGuess } from '../game/suggest.ts';
import type { SolverRequest } from './solver.ts';

self.onmessage = (event: MessageEvent<{ id: number; request: SolverRequest }>) => {
  const { id, request } = event.data;
  try {
    const result =
      request.kind === 'suggest'
        ? suggestGuess(request.candidates, request.pool, request.history)
        : buildReview(request.input);
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: String(error) });
  }
};
