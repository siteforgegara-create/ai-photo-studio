import type { TeamSize } from "./types";

/** WaitlistService — Teams waitlist (P10). */
export interface WaitlistService {
  join(email: string, teamSize: TeamSize): Promise<void>;
}
