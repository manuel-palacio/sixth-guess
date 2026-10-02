import type { GuessRecord } from '../game/clues.ts';
import type { ReviewEntry, ReviewInput } from '../game/review.ts';
import type { Suggestion } from '../game/suggest.ts';

export type SolverRequest =
  | { kind: 'suggest'; candidates: string[]; pool: readonly string[]; history: GuessRecord[] }
  | { kind: 'review'; input: ReviewInput };

interface SolverReply {
  id: number;
  result?: unknown;
  error?: string;
}

/** Runs the guess search off the main thread so typing never stalls. */
export class Solver {
  private readonly worker = new Worker(new URL('./solver.worker.ts', import.meta.url), { type: 'module' });
  private readonly pending = new Map<number, { resolve: (value: unknown) => void; reject: (reason: Error) => void }>();
  private nextId = 0;

  constructor() {
    this.worker.onmessage = (event: MessageEvent<SolverReply>) => this.settle(event.data);
  }

  suggest(candidates: string[], pool: readonly string[], history: GuessRecord[]): Promise<Suggestion> {
    return this.send({ kind: 'suggest', candidates, pool, history }) as Promise<Suggestion>;
  }

  review(input: ReviewInput): Promise<ReviewEntry[]> {
    return this.send({ kind: 'review', input }) as Promise<ReviewEntry[]>;
  }

  private send(request: SolverRequest): Promise<unknown> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, request });
    });
  }

  private settle({ id, result, error }: SolverReply): void {
    const request = this.pending.get(id);
    this.pending.delete(id);
    if (error) request?.reject(new Error(error));
    else request?.resolve(result);
  }
}
