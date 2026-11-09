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

/** The synced decision log (or a read answer in chat) is the retry journal. Derive the same
 * acknowledgement after a reload without applying a plan a second time. */
export function resolutionFor(pending, coach) {
  if (!pending?.id || !coach) return null;
  const base = { proposalId: pending.id };
  if (pending.kind === 'ask') {
    return (Array.isArray(coach.chat) ? coach.chat : []).some(m => m?.role === 'coach' && m.pid === pending.id)
      ? { ...base, accepted: ['ask'] } : null;
  }
  const entry = (Array.isArray(coach.log) ? coach.log : []).find(e => e?.proposalId === pending.id && e.kind === pending.kind);
  if (!entry) return null;
  if (entry.dismissed) return { ...base, dismissed: true };
  if (entry.kind === 'create') return { ...base, accepted: ['plan'] };
  if (entry.kind === 'debrief') return { ...base, accepted: ['debrief'] };
  const decisions = Array.isArray(entry.decisions) ? entry.decisions : [];
  return { ...base,
    accepted: decisions.filter(d => d?.status === 'accepted').map(d => d.id),
    rejected: decisions.filter(d => d?.id && d.status !== 'accepted').map(d => d.id) };
}
