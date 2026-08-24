// ---------------------------------------------------------------------------
// Multi-Touch Email Sequence Builder
//
// Sequences and enrollments are persisted in Supabase. In demo mode the data
// lives in an in-memory store (lost on restart — acceptable for demos).
// ---------------------------------------------------------------------------

import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { isDemoMode } from "@/lib/utils";
import { createServerSupabase } from "@/lib/supabase/server";
import type {
  EmailSequenceRow,
  SequenceStepRow,
  SequenceEnrollmentRow,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Public API types (consumed by the UI / sequence-builder)
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

// ---------------------------------------------------------------------------
// Supabase helpers
// ---------------------------------------------------------------------------

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseAdmin(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function resolveUserId(): Promise<string | null> {
  if (isDemoMode()) return null;
  const client = await createServerSupabase();
  if (!client) return null;
  const { data: { user } } = await client.auth.getUser();
  return user?.id ?? null;
}

// ---------------------------------------------------------------------------
// In-memory store (demo mode only)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// CREATE
// ---------------------------------------------------------------------------

export async function createSequence(input: {
  name: string;
  description?: string;
  steps: Omit<SequenceStep, "id" | "order">[];
}): Promise<EmailSequence> {
  const now = new Date().toISOString();

  if (isDemoMode()) {
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

  const admin = getSupabaseAdmin();
  const userId = await resolveUserId();
  if (!admin || !userId) throw new Error("Database not configured");

  // Insert the sequence row
  const { data: seqRow, error: seqErr } = await admin
    .from("email_sequences")
    .insert({ user_id: userId, name: input.name, description: input.description ?? "" })
    .select()
    .single();
  if (seqErr) throw new Error(seqErr.message);

  // Insert steps
  if (input.steps.length > 0) {
    const stepRows = input.steps.map((step, i) => ({
      sequence_id: seqRow.id,
      user_id: userId,
      order_index: i + 1,
      subject: step.subject,
      body: step.body,
      delay_days: step.delayDays,
      status: step.status,
    }));
    const { error: stepErr } = await admin.from("sequence_steps").insert(stepRows);
    if (stepErr) throw new Error(stepErr.message);
  }

  return {
    id: seqRow.id,
    name: seqRow.name,
    description: seqRow.description,
    steps: input.steps.map((step, i) => ({
      ...step,
      id: `${seqRow.id}-step-${i}`,
      order: i + 1,
    })),
    isActive: false,
    createdAt: seqRow.created_at,
    updatedAt: seqRow.updated_at,
  };
}

// ---------------------------------------------------------------------------
// READ
// ---------------------------------------------------------------------------

export async function getSequences(): Promise<EmailSequence[]> {
  if (isDemoMode()) return [...sequences];

  const admin = getSupabaseAdmin();
  const userId = await resolveUserId();
  if (!admin || !userId) return [];

  const { data: seqRows } = await admin
    .from("email_sequences")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (!seqRows?.length) return [];

  const { data: stepRows } = await admin
    .from("sequence_steps")
    .select("*")
    .in("sequence_id", seqRows.map((s) => s.id))
    .order("order_index", { ascending: true });

  const stepsBySeq = new Map<string, SequenceStepRow[]>();
  for (const step of stepRows ?? []) {
    const list = stepsBySeq.get(step.sequence_id) ?? [];
    list.push(step);
    stepsBySeq.set(step.sequence_id, list);
  }

  return seqRows.map((seq) => ({
    id: seq.id,
    name: seq.name,
    description: seq.description,
    isActive: seq.is_active,
    createdAt: seq.created_at,
    updatedAt: seq.updated_at,
    steps: (stepsBySeq.get(seq.id) ?? []).map((s) => ({
      id: s.id,
      order: s.order_index,
      templateId: null,
      delayDays: s.delay_days,
      subject: s.subject,
      body: s.body,
      status: s.status,
    })),
  }));
}

export async function getSequence(id: string): Promise<EmailSequence | null> {
  const all = await getSequences();
  return all.find((s) => s.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// UPDATE
// ---------------------------------------------------------------------------

export async function updateSequence(
  id: string,
  patch: Partial<Pick<EmailSequence, "name" | "description" | "isActive" | "steps">>,
): Promise<EmailSequence | null> {
  if (isDemoMode()) {
    const seq = sequences.find((s) => s.id === id);
    if (!seq) return null;
    if (patch.name !== undefined) seq.name = patch.name;
    if (patch.description !== undefined) seq.description = patch.description;
    if (patch.isActive !== undefined) seq.isActive = patch.isActive;
    if (patch.steps !== undefined) {
      seq.steps = patch.steps.map((step, i) => ({ ...step, order: i + 1 }));
    }
    seq.updatedAt = new Date().toISOString();
    return seq;
  }

  const admin = getSupabaseAdmin();
  const userId = await resolveUserId();
  if (!admin || !userId) return null;

  // Update sequence metadata
  const seqPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) seqPatch.name = patch.name;
  if (patch.description !== undefined) seqPatch.description = patch.description;
  if (patch.isActive !== undefined) seqPatch.is_active = patch.isActive;
  if (Object.keys(seqPatch).length > 0) {
    await admin.from("email_sequences").update(seqPatch).eq("id", id);
  }

  // Replace steps if provided
  if (patch.steps !== undefined) {
    await admin.from("sequence_steps").delete().eq("sequence_id", id);
    if (patch.steps.length > 0) {
      const stepRows = patch.steps.map((step, i) => ({
        sequence_id: id,
        user_id: userId,
        order_index: i + 1,
        subject: step.subject,
        body: step.body,
        delay_days: step.delayDays,
        status: step.status,
      }));
      await admin.from("sequence_steps").insert(stepRows);
    }
  }

  return getSequence(id);
}

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

export async function deleteSequence(id: string): Promise<boolean> {
  if (isDemoMode()) {
    const idx = sequences.findIndex((s) => s.id === id);
    if (idx < 0) return false;
    sequences.splice(idx, 1);
    enrollments = enrollments.filter((e) => e.sequenceId !== id);
    return true;
  }

  const admin = getSupabaseAdmin();
  if (!admin) return false;
  // CASCADE will delete steps and enrollments
  const { error } = await admin.from("email_sequences").delete().eq("id", id);
  return !error;
}

// ---------------------------------------------------------------------------
// ENROLLMENTS
// ---------------------------------------------------------------------------

export async function enrollLead(
  sequenceId: string,
  leadId: string,
): Promise<SequenceEnrollment | null> {
  const seq = await getSequence(sequenceId);
  if (!seq || !seq.isActive) return null;

  if (isDemoMode()) {
    const existing = enrollments.find(
      (e) => e.leadId === leadId && e.sequenceId === sequenceId && e.status === "active",
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

  const admin = getSupabaseAdmin();
  const userId = await resolveUserId();
  if (!admin || !userId) return null;

  // Check for existing active enrollment
  const { data: existing } = await admin
    .from("sequence_enrollments")
    .select("id")
    .eq("sequence_id", sequenceId)
    .eq("lead_id", leadId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (existing) return null;

  const now = new Date();
  const nextSendAt = new Date(now);
  nextSendAt.setDate(nextSendAt.getDate() + (seq.steps[0]?.delayDays ?? 0));

  const { data, error } = await admin
    .from("sequence_enrollments")
    .insert({
      sequence_id: sequenceId,
      lead_id: leadId,
      user_id: userId,
      current_step: 0,
      status: "active",
      next_send_at: nextSendAt.toISOString(),
    })
    .select()
    .single();
  if (error || !data) return null;

  return {
    id: data.id,
    sequenceId: data.sequence_id,
    leadId: data.lead_id,
    currentStep: data.current_step,
    status: data.status,
    enrolledAt: data.enrolled_at,
    lastSentAt: data.last_sent_at,
    nextSendAt: data.next_send_at,
    completedAt: data.completed_at,
  };
}

export async function getLeadEnrollments(leadId: string): Promise<SequenceEnrollment[]> {
  if (isDemoMode()) {
    return enrollments.filter((e) => e.leadId === leadId);
  }

  const admin = getSupabaseAdmin();
  const userId = await resolveUserId();
  if (!admin || !userId) return [];

  const { data } = await admin
    .from("sequence_enrollments")
    .select("*")
    .eq("lead_id", leadId)
    .eq("user_id", userId);

  return (data ?? []).map((r) => ({
    id: r.id,
    sequenceId: r.sequence_id,
    leadId: r.lead_id,
    currentStep: r.current_step,
    status: r.status,
    enrolledAt: r.enrolled_at,
    lastSentAt: r.last_sent_at,
    nextSendAt: r.next_send_at,
    completedAt: r.completed_at,
  }));
}

export async function getSequenceEnrollments(
  sequenceId: string,
): Promise<SequenceEnrollment[]> {
  if (isDemoMode()) {
    return enrollments.filter((e) => e.sequenceId === sequenceId);
  }

  const admin = getSupabaseAdmin();
  const userId = await resolveUserId();
  if (!admin || !userId) return [];

  const { data } = await admin
    .from("sequence_enrollments")
    .select("*")
    .eq("sequence_id", sequenceId)
    .eq("user_id", userId);

  return (data ?? []).map((r) => ({
    id: r.id,
    sequenceId: r.sequence_id,
    leadId: r.lead_id,
    currentStep: r.current_step,
    status: r.status,
    enrolledAt: r.enrolled_at,
    lastSentAt: r.last_sent_at,
    nextSendAt: r.next_send_at,
    completedAt: r.completed_at,
  }));
}

// ---------------------------------------------------------------------------
// ADVANCE / DUE
// ---------------------------------------------------------------------------

export async function advanceEnrollment(
  enrollmentId: string,
): Promise<{ enrollment: SequenceEnrollment; nextStep: SequenceStep | null } | null> {
  if (isDemoMode()) {
    const enrollment = enrollments.find((e) => e.id === enrollmentId);
    if (!enrollment || enrollment.status !== "active") return null;
    const seq = sequences.find((s) => s.id === enrollment.sequenceId);
    if (!seq) return null;

    const nextStepIdx = enrollment.currentStep + 1;
    if (nextStepIdx >= seq.steps.length) {
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

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data: enr } = await admin
    .from("sequence_enrollments")
    .select("*")
    .eq("id", enrollmentId)
    .eq("status", "active")
    .maybeSingle();
  if (!enr) return null;

  const { data: steps } = await admin
    .from("sequence_steps")
    .select("*")
    .eq("sequence_id", enr.sequence_id)
    .order("order_index", { ascending: true });

  const nextStepIdx = enr.current_step + 1;
  if (!steps || nextStepIdx >= steps.length) {
    await admin
      .from("sequence_enrollments")
      .update({ status: "completed", completed_at: new Date().toISOString(), next_send_at: null })
      .eq("id", enrollmentId);
    return {
      enrollment: {
        id: enr.id,
        sequenceId: enr.sequence_id,
        leadId: enr.lead_id,
        currentStep: enr.current_step,
        status: "completed",
        enrolledAt: enr.enrolled_at,
        lastSentAt: enr.last_sent_at,
        nextSendAt: null,
        completedAt: new Date().toISOString(),
      },
      nextStep: null,
    };
  }

  const nextStep = steps[nextStepIdx];
  const nextSendAt = new Date();
  nextSendAt.setDate(nextSendAt.getDate() + nextStep.delay_days);

  await admin
    .from("sequence_enrollments")
    .update({
      current_step: nextStepIdx,
      last_sent_at: new Date().toISOString(),
      next_send_at: nextSendAt.toISOString(),
    })
    .eq("id", enrollmentId);

  return {
    enrollment: {
      id: enr.id,
      sequenceId: enr.sequence_id,
      leadId: enr.lead_id,
      currentStep: nextStepIdx,
      status: "active",
      enrolledAt: enr.enrolled_at,
      lastSentAt: new Date().toISOString(),
      nextSendAt: nextSendAt.toISOString(),
      completedAt: null,
    },
    nextStep: {
      id: nextStep.id,
      order: nextStep.order_index,
      templateId: null,
      delayDays: nextStep.delay_days,
      subject: nextStep.subject,
      body: nextStep.body,
      status: nextStep.status,
    },
  };
}

export async function getDueEnrollments(): Promise<
  Array<{ enrollment: SequenceEnrollment; step: SequenceStep }>
> {
  if (isDemoMode()) {
    const now = new Date();
    const due: Array<{ enrollment: SequenceEnrollment; step: SequenceStep }> = [];
    for (const enrollment of enrollments) {
      if (enrollment.status !== "active" || !enrollment.nextSendAt) continue;
      if (new Date(enrollment.nextSendAt) > now) continue;
      const seq = sequences.find((s) => s.id === enrollment.sequenceId);
      if (!seq) continue;
      const step = seq.steps[enrollment.currentStep];
      if (step) due.push({ enrollment, step });
    }
    return due;
  }

  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data: enrs } = await admin
    .from("sequence_enrollments")
    .select("*")
    .eq("status", "active")
    .not("next_send_at", "is", null)
    .lte("next_send_at", new Date().toISOString());
  if (!enrs?.length) return [];

  const due: Array<{ enrollment: SequenceEnrollment; step: SequenceStep }> = [];
  for (const enr of enrs) {
    const { data: steps } = await admin
      .from("sequence_steps")
      .select("*")
      .eq("sequence_id", enr.sequence_id)
      .order("order_index", { ascending: true });
    const step = steps?.[enr.current_step];
    if (step) {
      due.push({
        enrollment: {
          id: enr.id,
          sequenceId: enr.sequence_id,
          leadId: enr.lead_id,
          currentStep: enr.current_step,
          status: enr.status,
          enrolledAt: enr.enrolled_at,
          lastSentAt: enr.last_sent_at,
          nextSendAt: enr.next_send_at,
          completedAt: enr.completed_at,
        },
        step: {
          id: step.id,
          order: step.order_index,
          templateId: null,
          delayDays: step.delay_days,
          subject: step.subject,
          body: step.body,
          status: step.status,
        },
      });
    }
  }
  return due;
}

// ---------------------------------------------------------------------------
// DEMO SEED
// ---------------------------------------------------------------------------

export function resetSequences(): void {
  sequences = [];
  enrollments = [];
  sequenceIdCounter = 1000;
  enrollmentIdCounter = 1000;
}

export function seedDemoSequences(): void {
  resetSequences();

  // Sequence 1: Cold Email Follow-up
  sequences.push({
    id: generateSequenceId(),
    name: "Cold Email Follow-up (3-step)",
    description: "Standard 3-step cold email sequence with increasing urgency",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    steps: [
      {
        id: `${sequences[sequences.length - 1]?.id ?? "seq-1"}-step-0`,
        order: 1,
        templateId: null,
        delayDays: 0,
        subject: "Quick question about {{company}}",
        body: "Hi {{first_name}},\n\nI noticed some issues with {{website}} that could be hurting your conversion rates. We helped similar {{country}} businesses improve their site performance by 40%.\n\nWould you be open to a quick 15-minute call to discuss?\n\nBest,\n{{your_name}}",
        status: "active",
      },
      {
        id: `${sequences[sequences.length - 1]?.id ?? "seq-1"}-step-1`,
        order: 2,
        templateId: null,
        delayDays: 3,
        subject: "Re: Quick question about {{company}}",
        body: "Hi {{first_name}},\n\nJust following up on my previous email about {{website}}. I found that {{main_problem}} is a common issue in the {{industry}} space.\n\nWe have a proven framework to fix this. Happy to share a case study.\n\nBest,\n{{your_name}}",
        status: "active",
      },
      {
        id: `${sequences[sequences.length - 1]?.id ?? "seq-1"}-step-2`,
        order: 3,
        templateId: null,
        delayDays: 7,
        subject: "Last note about {{company}}",
        body: "Hi {{first_name}},\n\nI know you're busy, so I'll keep this brief. If you're interested in improving {{website}}, I'm here to help. If not, no worries!\n\nEither way, I wish {{company}} continued success.\n\nBest,\n{{your_name}}",
        status: "active",
      },
    ],
  });

  // Sequence 2: Post-Meeting Nurture
  sequences.push({
    id: generateSequenceId(),
    name: "Post-Meeting Nurture",
    description: "Follow up after an initial meeting with proposal and reminders",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    steps: [
      {
        id: `${sequences[sequences.length - 1]?.id ?? "seq-2"}-step-0`,
        order: 1,
        templateId: null,
        delayDays: 1,
        subject: "Great meeting with {{company}}",
        body: "Hi {{first_name}},\n\nThank you for taking the time to meet with me today. I'm excited about the possibilities for {{company}}.\n\nAs discussed, I'll prepare a detailed proposal and send it over by tomorrow.\n\nBest,\n{{your_name}}",
        status: "active",
      },
      {
        id: `${sequences[sequences.length - 1]?.id ?? "seq-2"}-step-1`,
        order: 2,
        templateId: null,
        delayDays: 3,
        subject: "Proposal for {{company}}",
        body: "Hi {{first_name}},\n\nPlease find attached the proposal we discussed. I've outlined the scope, timeline, and investment.\n\nLet me know if you have any questions. Happy to hop on a quick call to walk through it.\n\nBest,\n{{your_name}}",
        status: "active",
      },
      {
        id: `${sequences[sequences.length - 1]?.id ?? "seq-2"}-step-2`,
        order: 3,
        templateId: null,
        delayDays: 7,
        subject: "Following up on the proposal",
        body: "Hi {{first_name}},\n\nJust checking in on the proposal I sent last week. I'd love to hear your thoughts.\n\nIf the timing isn't right, that's completely fine — just let me know.\n\nBest,\n{{your_name}}",
        status: "active",
      },
    ],
  });
}
