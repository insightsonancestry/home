const RUN_TTL_MS = 10 * 60 * 1000;

// Tracks active runs per user with submission timestamps for auto-expiry
const activeRuns = new Map<string, Map<string, number>>();

// Tracks submission time per runId — shared with polling endpoint
export const runSubmissions = new Map<string, number>();

export function getActiveRuns(userId: string): Map<string, number> {
  let runs = activeRuns.get(userId);
  if (!runs) {
    runs = new Map();
    activeRuns.set(userId, runs);
  }
  // Evict expired runs
  const now = Date.now();
  const expired: string[] = [];
  runs.forEach((ts, runId) => {
    if (now - ts > RUN_TTL_MS) expired.push(runId);
  });
  expired.forEach((id) => {
    runs!.delete(id);
    runSubmissions.delete(id);
  });
  return runs;
}
