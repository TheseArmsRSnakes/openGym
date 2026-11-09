/* The pending slot: one proposal per profile, waiting for a decision. Shared by the server's job
   queue, the phone's own Coach and the demo, so all three hand back the same thing. Kept apart
   from validate.js so the demo can use it without loading the exercise library. */

/* An answer to a question holds the pending slot only for as long as it takes to read it. A
   question is often about the suggestion on screen ("why one set less?"), so the proposal still
   waiting for a decision rides along on the answer (`prev`) and comes back once it is read.
   Never an older answer, and never one that has run out meanwhile. */
export function waitingProposal(p, now = Date.now()) {
  if (!p) return null;
  // Changes for a workout in progress (`adapt`) belong to that workout, not to the next question.
  if (p.kind === 'ask' || p.kind === 'adapt') return waitingProposal(p.prev, now);
  return p.expiresAt && p.expiresAt < now ? null : p;
}

/** A proposal already accepted cannot later be dismissed by a stale card. Repair only that
 * contradictory duplicate; real declines and Undo entries retain their original meaning. */
export function normalizeDecisions(coach) {
  if (!Array.isArray(coach?.log)) return coach;
  const accepted = new Map();
  for (const e of coach.log) {
    if (e?.proposalId && !e.dismissed && e.decisions?.some(d => d.status === 'accepted')) {
      accepted.set(e.proposalId, Math.min(accepted.get(e.proposalId) ?? Infinity, e.at || 0));
    }
  }
  const removed = new Set(coach.log.filter(e => e?.dismissed && e.proposalId &&
    accepted.has(e.proposalId) && accepted.get(e.proposalId) <= e.at).map(e => e.id));
  if (!removed.size) return coach;
  return { ...coach, log: coach.log.filter(e => !removed.has(e.id)),
    chat: (coach.chat || []).filter(m => !removed.has(m.ref)) };
}
