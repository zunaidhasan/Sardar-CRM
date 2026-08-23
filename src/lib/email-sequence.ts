// ---------------------------------------------------------------------------
// Multi-Touch Email Sequence Builder
//
// Defines the data model for email sequences (drip campaigns) and provides
// utilities for managing sequence steps, scheduling, and execution.
// ---------------------------------------------------------------------------

export interface SequenceStep {
  id: string;
  order: number;
  templateId: string | null;
  delayDays: number;
  subject: string;
  body: string;
  status: "active" | "paused" | "completed";
}

export interface EmailSequence {
  id: string;
  name: string;
  description: string;
  steps: SequenceStep[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SequenceEnrollment {
  id: string;
  sequenceId: string;
  leadId: string;
  currentStep: number;
  status: "active" | "paused" | "completed" | "exited";
  enrolledAt: string;
  lastSentAt: string | null;
  nextSendAt: string | null;
  completedAt: string | null;
}

// In-memory store for demo mode
let sequences: EmailSequence[] = [];
let enrollments: SequenceEnrollment[] = [];
let sequenceIdCounter = 1000;
let enrollmentIdCounter = 1000;

function generateSequenceId(): string {
  return `seq-${++sequenceIdCounter}`;
}

function generateEnrollmentId(): string {
  return `enr-${++enrollmentIdCounter}`;
}

/**
 * Create a new email sequence.
 */
export function createSequence(input: {
  name: string;
  description?: string;
  steps: Omit<SequenceStep, "id" | "order">[];
}): EmailSequence {
  const now = new Date().toISOString();
  const sequence: EmailSequence = {
    id: generateSequenceId(),
    name: input.name,
    description: input.description ?? "",
    steps: input.steps.map((step, i) => ({
      ...step,
      id: `${generateSequenceId()}-step-${i}`,
      order: i + 1,
    })),
    isActive: false,
    createdAt: now,
    updatedAt: now,
  };
  sequences.push(sequence);
  return sequence;
}

/**
 * Get all sequences.
 */
export function getSequences(): EmailSequence[] {
  return [...sequences];
}

/**
 * Get a sequence by ID.
 */
export function getSequence(id: string): EmailSequence | null {
  return sequences.find((s) => s.id === id) ?? null;
}

/**
 * Update a sequence.
 */
export function updateSequence(
  id: string,
  patch: Partial<Pick<EmailSequence, "name" | "description" | "isActive" | "steps">>,
): EmailSequence | null {
  const seq = sequences.find((s) => s.id === id);
  if (!seq) return null;
  if (patch.name !== undefined) seq.name = patch.name;
  if (patch.description !== undefined) seq.description = patch.description;
  if (patch.isActive !== undefined) seq.isActive = patch.isActive;
  if (patch.steps !== undefined) {
    seq.steps = patch.steps.map((step, i) => ({
      ...step,
      order: i + 1,
    }));
  }
  seq.updatedAt = new Date().toISOString();
  return seq;
}

/**
 * Delete a sequence.
 */
export function deleteSequence(id: string): boolean {
  const idx = sequences.findIndex((s) => s.id === id);
  if (idx < 0) return false;
  sequences.splice(idx, 1);
  // Also remove enrollments
  enrollments = enrollments.filter((e) => e.sequenceId !== id);
  return true;
}

/**
 * Enroll a lead in a sequence.
 */
export function enrollLead(
  sequenceId: string,
  leadId: string,
): SequenceEnrollment | null {
  const seq = getSequence(sequenceId);
  if (!seq || !seq.isActive) return null;

  // Check if already enrolled
  const existing = enrollments.find(
    (e) => e.leadId === leadId && e.sequenceId === sequenceId && e.status === "active"
  );
  if (existing) return null;

  const now = new Date();
  const nextSendAt = new Date(now);
  nextSendAt.setDate(nextSendAt.getDate() + (seq.steps[0]?.delayDays ?? 0));

  const enrollment: SequenceEnrollment = {
    id: generateEnrollmentId(),
    sequenceId,
    leadId,
    currentStep: 0,
    status: "active",
    enrolledAt: now.toISOString(),
    lastSentAt: null,
    nextSendAt: nextSendAt.toISOString(),
    completedAt: null,
  };
  enrollments.push(enrollment);
  return enrollment;
}

/**
 * Get enrollments for a lead.
 */
export function getLeadEnrollments(leadId: string): SequenceEnrollment[] {
  return enrollments.filter((e) => e.leadId === leadId);
}

/**
 * Get enrollments for a sequence.
 */
export function getSequenceEnrollments(sequenceId: string): SequenceEnrollment[] {
  return enrollments.filter((e) => e.sequenceId === sequenceId);
}

/**
 * Advance a lead to the next step in the sequence.
 */
export function advanceEnrollment(
  enrollmentId: string,
): { enrollment: SequenceEnrollment; nextStep: SequenceStep | null } | null {
  const enrollment = enrollments.find((e) => e.id === enrollmentId);
  if (!enrollment || enrollment.status !== "active") return null;

  const seq = getSequence(enrollment.sequenceId);
  if (!seq) return null;

  const nextStepIdx = enrollment.currentStep + 1;

  if (nextStepIdx >= seq.steps.length) {
    // Sequence completed
    enrollment.status = "completed";
    enrollment.completedAt = new Date().toISOString();
    enrollment.nextSendAt = null;
    return { enrollment, nextStep: null };
  }

  enrollment.currentStep = nextStepIdx;
  enrollment.lastSentAt = new Date().toISOString();

  const nextStep = seq.steps[nextStepIdx];
  const nextSendAt = new Date();
  nextSendAt.setDate(nextSendAt.getDate() + nextStep.delayDays);
  enrollment.nextSendAt = nextSendAt.toISOString();

  return { enrollment, nextStep };
}

/**
 * Get leads due for sending in a sequence.
 */
export function getDueEnrollments(): Array<{
  enrollment: SequenceEnrollment;
  step: SequenceStep;
}> {
  const now = new Date();
  const due: Array<{ enrollment: SequenceEnrollment; step: SequenceStep }> = [];

  for (const enrollment of enrollments) {
    if (enrollment.status !== "active" || !enrollment.nextSendAt) continue;
    if (new Date(enrollment.nextSendAt) > now) continue;

    const seq = getSequence(enrollment.sequenceId);
    if (!seq) continue;

    const step = seq.steps[enrollment.currentStep];
    if (step) {
      due.push({ enrollment, step });
    }
  }

  return due;
}

/**
 * Reset the sequence store (for testing).
 */
export function resetSequences(): void {
  sequences = [];
  enrollments = [];
  sequenceIdCounter = 1000;
  enrollmentIdCounter = 1000;
}

/**
 * Seed demo sequences for the outbound lead module.
 */
export function seedDemoSequences(): void {
  resetSequences();

  // Sequence 1: Cold Email Follow-up
  createSequence({
    name: "Cold Email Follow-up (3-step)",
    description: "Standard 3-step cold email sequence with increasing urgency",
    steps: [
      {
        templateId: null,
        delayDays: 0,
        subject: "Quick question about {{company}}",
        body: "Hi {{first_name}},\n\nI noticed some issues with {{website}} that could be hurting your conversion rates. We helped similar {{country}} businesses improve their site performance by 40%.\n\nWould you be open to a quick 15-minute call to discuss?\n\nBest,\n{{your_name}}",
        status: "active",
      },
      {
        templateId: null,
        delayDays: 3,
        subject: "Re: Quick question about {{company}}",
        body: "Hi {{first_name}},\n\nJust following up on my previous email about {{website}}. I found that {{main_problem}} is a common issue in the {{industry}} space.\n\nWe have a proven framework to fix this. Happy to share a case study.\n\nBest,\n{{your_name}}",
        status: "active",
      },
      {
        templateId: null,
        delayDays: 7,
        subject: "Last note about {{company}}",
        body: "Hi {{first_name}},\n\nI know you're busy, so I'll keep this brief. If you're interested in improving {{website}}, I'm here to help. If not, no worries!\n\nEither way, I wish {{company}} continued success.\n\nBest,\n{{your_name}}",
        status: "active",
      },
    ],
  });

  // Sequence 2: Post-Meeting Nurture
  createSequence({
    name: "Post-Meeting Nurture",
    description: "Follow up after an initial meeting with proposal and reminders",
    steps: [
      {
        templateId: null,
        delayDays: 1,
        subject: "Great meeting with {{company}}",
        body: "Hi {{first_name}},\n\nThank you for taking the time to meet with me today. I'm excited about the possibilities for {{company}}.\n\nAs discussed, I'll prepare a detailed proposal and send it over by tomorrow.\n\nBest,\n{{your_name}}",
        status: "active",
      },
      {
        templateId: null,
        delayDays: 3,
        subject: "Proposal for {{company}}",
        body: "Hi {{first_name}},\n\nPlease find attached the proposal we discussed. I've outlined the scope, timeline, and investment.\n\nLet me know if you have any questions. Happy to hop on a quick call to walk through it.\n\nBest,\n{{your_name}}",
        status: "active",
      },
      {
        templateId: null,
        delayDays: 7,
        subject: "Following up on the proposal",
        body: "Hi {{first_name}},\n\nJust checking in on the proposal I sent last week. I'd love to hear your thoughts.\n\nIf the timing isn't right, that's completely fine — just let me know.\n\nBest,\n{{your_name}}",
        status: "active",
      },
    ],
  });
}
