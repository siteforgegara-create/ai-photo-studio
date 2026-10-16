import type { EditInput, EditJob, Quote, Unsubscribe } from "./types";

/** EditsService — Studio edits paid with credits (B4). Never called in demo mode. */
export interface EditsService {
  quote(input: EditInput): Promise<Quote>;
  /** Reserves credits and starts the job. Same idempotencyKey → same job. */
  create(input: EditInput, idempotencyKey: string): Promise<EditJob>;
  subscribe(jobId: string, listener: (job: EditJob) => void): Unsubscribe;
}
