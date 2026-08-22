import type {
  Account,
  Activity,
  AppUser,
  Attachment,
  AutomationRule,
  Client,
  EmailTemplate,
  FollowUp,
  ImportRun,
  Invoice,
  InvoiceItem,
  Milestone,
  Opportunity,
  Profile,
  Project,
  ProjectCredential,
  ProjectTeamMember,
  ProjectTodo,
  TeamMember,
  TeamRole,
  TimeEntry,
} from "@/lib/types";
import { hashPassword } from "@/lib/password";

export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";

// Initial password for every seeded demo login. Shown on the login page in
// demo mode and in the README; agency can change it from Settings.
export const DEMO_INITIAL_PASSWORD = "sardar2026";

// Demo personas backing the sidebar role switcher. Each role maps to a real
// person so switching identities never shows a stale name.
export const DEMO_PERSONAS: Record<TeamRole, { name: string; email: string }> = {
  ceo: { name: "Mamunur Roshid", email: "mamunur@sardaritbd.com" },
  executive: { name: "Zunaid Hasan", email: "zunaid@sardaritbd.com" },
  developer: { name: "Rafi Ahmed", email: "rafi@sardaritbd.com" },
  designer: { name: "Sadia Rahman", email: "sadia@sardaritbd.com" },
};

// Seeded username logins (shown on the demo login page; initial password is
// DEMO_INITIAL_PASSWORD for all of them). Agency can add/change from Settings.
export const DEMO_LOGIN_CREDENTIALS: Array<{ username: string; role: TeamRole }> = [
  { username: "mamunur", role: "ceo" },
  { username: "zunaid", role: "executive" },
  { username: "rafi", role: "developer" },
  { username: "sadia", role: "designer" },
];

// Deterministic-ish uuids so the demo store keys are stable.
const ID = {
  accounts: ["a-1001", "a-1002", "a-1003"],
  clients: ["c-2001", "c-2002", "c-2003", "c-2004", "c-2005", "c-2006", "c-2007", "c-2008", "c-3001", "c-3002", "c-3003", "c-3004", "c-3005", "c-3006", "c-3007", "c-3008"],
  opportunities: ["o-3001", "o-3002", "o-3003", "o-3004", "o-3005", "o-3006", "o-3007", "o-3008", "o-3009", "o-3010", "o-3011", "o-3012", "o-3013", "o-3014"],
  projects: ["p-4001", "p-4002", "p-4003", "p-4004", "p-4005", "p-4006", "p-4007", "p-4008", "p-4009", "p-4010"],
  milestones: ["m-5001", "m-5002", "m-5003", "m-5004", "m-5005", "m-5006", "m-5007", "m-5008", "m-5009", "m-5010", "m-5011", "m-5012"],
  activities: ["act-6001", "act-6002", "act-6003", "act-6004", "act-6005", "act-6006", "act-6007", "act-6008", "act-6009", "act-6010", "act-6011", "act-6012", "act-6013", "act-6014", "act-6015", "act-6016", "act-6017", "act-6018", "act-6019", "act-6020", "act-6021", "act-6022", "act-6023", "act-6024", "act-6025", "act-6026"],
  followups: ["f-7001", "f-7002", "f-7003", "f-7004", "f-7005", "f-7006"],
  invoices: ["i-8001", "i-8002", "i-8003", "i-8004", "i-8005", "i-8006", "i-8007"],
  items: ["it-9001", "it-9002", "it-9003", "it-9004", "it-9005", "it-9006"],
  templates: ["t-1001", "t-1002", "t-1003", "t-1004", "t-2001", "t-2002", "t-2003"],
  automations: ["au-1101", "au-1102", "au-1103"],
  imports: ["im-1201", "im-1202"],
  attachments: ["at-1301"],
  todos: ["td-1401", "td-1402", "td-1403", "td-1404", "td-1405", "td-1406"],
  credentials: ["cr-1501", "cr-1502", "cr-1503", "cr-1504", "cr-1505"],
  projectTeam: ["pt-1601", "pt-1602", "pt-1603", "pt-1604", "pt-1605", "pt-1606"],
  users: ["us-1701", "us-1702", "us-1703", "us-1704"],
  timeEntries: ["te-1801", "te-1802", "te-1803", "te-1804", "te-1805", "te-1806", "te-1807", "te-1808", "te-1809", "te-1810", "te-1811", "te-1812"],
} as const;

function d(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString();
}

function dateOnly(offsetDays: number): string {
  return d(offsetDays).slice(0, 10);
}

// ---------------------------------------------------------------------------
// Generated historical demo rows
//
// Bump DEMO_DB_VERSION whenever these change: loadDB merges them into older
// persisted demo files (by deterministic id) WITHOUT touching user-created
// rows, so dashboards always show the requested per-person milestones:
// 15+ completed projects, $12,000+ revenue, 80%+ win rate for every persona.
// ---------------------------------------------------------------------------
export const DEMO_DB_VERSION = 6;

const GEN_PERSONAS = [
  { key: "ceo", name: "Mamunur Roshid" },
  { key: "executive", name: "Zunaid Hasan" },
  { key: "developer", name: "Rafi Ahmed" },
  { key: "designer", name: "Sadia Rahman" },
] as const;

const GEN_PROJECT_NAMES = [
  "Shopify store setup",
  "WordPress speed optimization",
  "Landing page A/B build",
  "Custom web app dashboard",
  "E-commerce checkout redesign",
  "SEO audit + on-page fixes",
  "Full-stack booking system",
  "Laravel admin panel",
  "Stripe payment integration",
  "Next.js marketing site",
  "WooCommerce migration",
  "Mobile-first responsive redesign",
  "Headless CMS build",
  "React admin dashboard",
  "Webflow landing page",
] as const;

const GEN_DEV_NAMES = ["Alex Kim", "Priya Shah", "Maya Chen", "Tanvir Islam"];
const GEN_TYPES = ["WordPress", "Shopify", "Web App", "Landing Page", "Integration", "Performance", "E-commerce", "Mobile"];
// Company names aligned with ID.clients so generated projects read like the
// seeded ones ("BrightPath - WordPress speed optimization") instead of a
// bare template + person suffix.
const GEN_CLIENT_COMPANIES = ["BrightPath", "Eleventy Studios", "Lumen Labs", "Delta Startups", "KiteCRM", "Verkta", "Nordk Apps", "Orbit Lab"];
const GEN_MILESTONE_TITLES = ["Requirements & kickoff", "Design & build", "Review & handover"];
const GEN_ROLE_LABELS: Record<string, string> = {
  ceo: "General Manager",
  executive: "Project Manager",
  developer: "Developer",
  designer: "Designer",
};
const GEN_TM_BY_PERSONA: Record<string, string> = {
  ceo: "tm-0001",
  executive: "tm-0002",
  developer: "tm-0003",
  designer: "tm-0004",
};
const GEN_BID_TITLES = [
  "Website speed optimization",
  "Custom dashboard build",
  "API integration",
  "Checkout redesign",
  "Landing page refresh",
  "SEO + content fixes",
] as const;

// Shared deterministic per-project math + dates so generated projects and
// their invoices can never drift apart (gross/fee/net/bonus must match).
function genProjectMath(i: number, p: number) {
  const gross = Math.round((750 + ((i * 53 + (p + 1) * 29) % 601)) / 10) * 10;
  const feePercent = i % 5 === 0 ? 10 : 20;
  const feeAmount = Math.round((gross * feePercent) / 100 * 100) / 100;
  const netAmount = Math.round((gross - feeAmount) * 100) / 100;
  const bonus = i % 4 === 0 ? 50 : 0;
  return { gross, feePercent, feeAmount, netAmount, bonus };
}

function genOrderOffset(i: number, p: number): number {
  return -(22 + i * 19 + p * 4);
}

function genCompany(i: number, p: number): string {
  return GEN_CLIENT_COMPANIES[(i + p * 3) % GEN_CLIENT_COMPANIES.length] ?? "SardarIT";
}

export function generatedProjects(): Project[] {
  const out: Project[] = [];
  GEN_PERSONAS.forEach((person, p) => {
    for (let i = 0; i < 15; i++) {
      const { gross, feePercent, feeAmount, netAmount, bonus } = genProjectMath(i, p);
      const orderOffset = genOrderOffset(i, p);
      const clientId = ID.clients[(i + p * 3) % ID.clients.length] ?? null;
      const company = genCompany(i, p);
      out.push({
        id: `gp-${person.key}-${i}`,
        user_id: DEMO_USER_ID,
        opportunity_id: null,
        client_id: clientId,
        account_id: null,
        project_name: `${company} - ${GEN_PROJECT_NAMES[i % GEN_PROJECT_NAMES.length]}`,
        order_date: dateOnly(orderOffset),
        assigned_to: person.name,
        developer: GEN_DEV_NAMES[(i + p) % GEN_DEV_NAMES.length]!,
        website_link: null,
        project_type: GEN_TYPES[(i + p) % GEN_TYPES.length]!,
        delivery_deadline: dateOnly(orderOffset + 9 + (i % 5) * 4),
        gross_amount: gross,
        fee_percent: feePercent,
        fee_amount: feeAmount,
        net_amount: netAmount,
        bonus,
        status: i % 4 === 2 ? "delivered" : "complete",
        priority: i % 3 === 0 ? "medium" : i % 3 === 1 ? "high" : "low",
        progress: 100,
        notes: "",
        created_at: d(orderOffset),
        updated_at: d(-2),
      });
    }
  });
  return out;
}

// Milestones for the generated projects so their detail pages don't show an
// empty workspace (all generated projects are complete/delivered).
export function generatedMilestones(): Milestone[] {
  const out: Milestone[] = [];
  GEN_PERSONAS.forEach((person, p) => {
    for (let i = 0; i < 15; i++) {
      const orderOffset = genOrderOffset(i, p);
      GEN_MILESTONE_TITLES.forEach((title, j) => {
        const due = orderOffset + 6 + j * 5;
        out.push({
          id: `gm-${person.key}-${i}-${j}`,
          user_id: DEMO_USER_ID,
          project_id: `gp-${person.key}-${i}`,
          title,
          description: null,
          order_index: j,
          status: "done",
          due_date: dateOnly(due),
          completed_at: d(due + 1),
          created_at: d(orderOffset),
          updated_at: d(due + 1),
        });
      });
    }
  });
  return out;
}

// One order invoice per generated project (all are complete/delivered), so
// the Invoicing Hub and per-client revenue look as rich as the dashboards.
// Amount = net + bonus (matches the seeded invoice pattern); numbers use the
// INV-2026-1xx range so they never collide with the seeded 0xx invoices.
export function generatedInvoices(): Invoice[] {
  const out: Invoice[] = [];
  GEN_PERSONAS.forEach((person, p) => {
    for (let i = 0; i < 15; i++) {
      const { netAmount, bonus } = genProjectMath(i, p);
      const orderOffset = genOrderOffset(i, p);
      // Invoice issued a few days after delivery (all generated projects are
      // complete/delivered). Every 5th stays pending (some will read as
      // overdue via effectiveStatus); the rest are paid.
      const isPaid = i % 5 !== 0;
      const issueOffset = orderOffset + 11 + (i % 5) * 4;
      out.push({
        id: `gi-${person.key}-${i}`,
        user_id: DEMO_USER_ID,
        invoice_number: `INV-2026-${100 + p * 15 + i}`,
        client_id: ID.clients[(i + p * 3) % ID.clients.length] ?? null,
        project_id: `gp-${person.key}-${i}`,
        issue_date: dateOnly(issueOffset),
        due_date: dateOnly(issueOffset + 14),
        amount: Math.round((netAmount + bonus) * 100) / 100,
        currency: "USD",
        status: isPaid ? "paid" : "pending",
        paid_at: isPaid ? dateOnly(issueOffset + 2 + (i % 4)) : null,
        notes: isPaid ? "" : "Awaiting client payment.",
        created_at: d(issueOffset),
        updated_at: d(issueOffset + 2),
      });
    }
  });
  return out;
}

// Line items for the generated invoices: one "project delivery" line plus a
// bonus line whenever the project earned one (mirrors the seeded invoices).
export function generatedInvoiceItems(): InvoiceItem[] {
  const out: InvoiceItem[] = [];
  GEN_PERSONAS.forEach((person, p) => {
    for (let i = 0; i < 15; i++) {
      const { netAmount, bonus } = genProjectMath(i, p);
      const company = genCompany(i, p);
      const invoiceId = `gi-${person.key}-${i}`;
      out.push({
        id: `git-${person.key}-${i}-0`,
        invoice_id: invoiceId,
        description: `${company} - ${GEN_PROJECT_NAMES[i % GEN_PROJECT_NAMES.length]}`,
        quantity: 1,
        unit_price: netAmount,
        amount: netAmount,
      });
      if (bonus > 0) {
        out.push({
          id: `git-${person.key}-${i}-1`,
          invoice_id: invoiceId,
          description: "Fast delivery bonus",
          quantity: 1,
          unit_price: bonus,
          amount: bonus,
        });
      }
    }
  });
  return out;
}

// Team roster for the generated projects: the owning persona + the developer
// who actually built it, so the workspace team card looks real.
export function generatedTeamMembers(): ProjectTeamMember[] {
  const out: ProjectTeamMember[] = [];
  GEN_PERSONAS.forEach((person, p) => {
    for (let i = 0; i < 15; i++) {
      const orderOffset = genOrderOffset(i, p);
      const projId = `gp-${person.key}-${i}`;
      const dev = GEN_DEV_NAMES[(i + p) % GEN_DEV_NAMES.length] ?? "Developer";
      out.push({
        id: `gpt-${person.key}-${i}-0`,
        user_id: DEMO_USER_ID,
        project_id: projId,
        team_member_id: GEN_TM_BY_PERSONA[person.key] ?? null,
        name: person.name,
        role_label: GEN_ROLE_LABELS[person.key] ?? "Team Member",
        created_at: d(orderOffset),
        updated_at: d(-2),
      });
      out.push({
        id: `gpt-${person.key}-${i}-1`,
        user_id: DEMO_USER_ID,
        project_id: projId,
        team_member_id: null,
        name: dev,
        role_label: "Developer",
        created_at: d(orderOffset),
        updated_at: d(-2),
      });
    }
  });
  return out;
}

export function generatedOpportunities(): Opportunity[] {
  const out: Opportunity[] = [];
  GEN_PERSONAS.forEach((person, p) => {
    // 5 won + 1 lost for everyone; the CEO persona skips the generated loss
    // because the base seed already gives him 2 won + 2 lost, so 6 extra wins
    // take him to exactly 8/10 = 80%.
    const wonCount = person.key === "ceo" ? 6 : 5;
    const lostCount = person.key === "ceo" ? 0 : 1;
    for (let i = 0; i < wonCount; i++) {
      const amount = Math.round((400 + ((i * 47 + (p + 1) * 23) % 901)) / 10) * 10;
      out.push({
        id: `go-${person.key}-w${i}`,
        user_id: DEMO_USER_ID,
        title: `${GEN_BID_TITLES[i % GEN_BID_TITLES.length]} for ${person.name.split(" ")[0]}`,
        description: null,
        client_id: ID.clients[(i + p * 2) % ID.clients.length] ?? null,
        account_id: null,
        platform: i % 2 === 0 ? "fiverr" : "upwork",
        type: "bid",
        stage: "won",
        status: "hired",
        follow_up_status: "accepted",
        amount,
        currency: "USD",
        connects_spent: 4 + (i % 5) * 2,
        source_url: null,
        due_date: null,
        next_follow_up: null,
        assigned_to: person.name,
        lost_reason: null,
        notes: "",
        created_at: d(-(14 + i * 8 + p * 3)),
        updated_at: d(-3),
      });
    }
    for (let i = 0; i < lostCount; i++) {
      out.push({
        id: `go-${person.key}-l${i}`,
        user_id: DEMO_USER_ID,
        title: `${GEN_BID_TITLES[(i + 3) % GEN_BID_TITLES.length]} for ${person.name.split(" ")[0]}`,
        description: null,
        client_id: ID.clients[(i + p * 2 + 5) % ID.clients.length] ?? null,
        account_id: null,
        platform: i % 2 === 0 ? "upwork" : "fiverr",
        type: "bid",
        stage: "lost",
        status: "rejected",
        follow_up_status: "archived",
        amount: 500 + i * 100,
        currency: "USD",
        connects_spent: 6,
        source_url: null,
        due_date: null,
        next_follow_up: null,
        assigned_to: person.name,
        lost_reason: "Client went with another freelancer",
        notes: "",
        created_at: d(-(30 + p * 3)),
        updated_at: d(-10),
      });
    }
  });
  return out;
}

// Timesheet rows for the generated (complete/delivered) projects so their
// time tracking tab shows history too. Deterministic ids keep the migration
// merge idempotent for older persisted demo files.
export function generatedTimeEntries(): TimeEntry[] {
  const out: TimeEntry[] = [];
  GEN_PERSONAS.forEach((person, p) => {
    for (let i = 0; i < 15; i++) {
      const orderOffset = genOrderOffset(i, p);
      const projId = `gp-${person.key}-${i}`;
      const dev = GEN_DEV_NAMES[(i + p) % GEN_DEV_NAMES.length] ?? "Developer";
      for (let j = 0; j < 2; j++) {
        out.push({
          id: `gte-${person.key}-${i}-${j}`,
          user_id: DEMO_USER_ID,
          project_id: projId,
          date: dateOnly(orderOffset + 3 + j * 5),
          hours: 2 + ((i + j) % 3),
          description: j === 0 ? "Development work" : "Review & revisions",
          assignee: j === 0 ? dev : person.name,
          billable: true,
          created_at: d(orderOffset + 3 + j * 5),
          updated_at: d(orderOffset + 4 + j * 5),
        });
      }
    }
  });
  return out;
}

// Activities performed by other team members (carried in metadata.actor), so
// the workspace feed shows real-looking work by the executive/developer/
// designer personas instead of only the owner's own actions. Each entry is
// tied to an existing entity so feed deep-links resolve.
export function seededTeamActivities(): Activity[] {
  return [
    {
      id: ID.activities[12]!,
      user_id: DEMO_USER_ID,
      entity_type: "project",
      entity_id: ID.projects[0]!,
      activity_type: "status_change",
      subject: "Milestone updated: Stripe billing",
      body: "Stripe billing integration marked in progress on the Delta Startups MVP.",
      metadata: { actor: "Rafi Ahmed" },
      created_at: d(-2),
    },
    {
      id: ID.activities[13]!,
      user_id: DEMO_USER_ID,
      entity_type: "opportunity",
      entity_id: ID.opportunities[6]!,
      activity_type: "proposal_sent",
      subject: "Quote sent",
      body: "Sent the $1,100 quote for the mobile onboarding UX.",
      metadata: { actor: "Zunaid Hasan" },
      created_at: d(-2),
    },
    {
      id: ID.activities[14]!,
      user_id: DEMO_USER_ID,
      entity_type: "project",
      entity_id: ID.projects[5]!,
      activity_type: "status_change",
      subject: "Milestone completed",
      body: "UX audit & wireframes approved for the Nordk onboarding flow.",
      metadata: { actor: "Zunaid Hasan" },
      created_at: d(-4),
    },
    {
      id: ID.activities[15]!,
      user_id: DEMO_USER_ID,
      entity_type: "project",
      entity_id: ID.projects[9]!,
      activity_type: "note",
      subject: "Design mockups shared",
      body: "Waitlist page mockups uploaded for review.",
      metadata: { actor: "Sadia Rahman" },
      created_at: d(-3),
    },
    {
      id: ID.activities[16]!,
      user_id: DEMO_USER_ID,
      entity_type: "client",
      entity_id: ID.clients[6]!,
      activity_type: "email",
      subject: "Nurture email sent",
      body: "Followed up with Nordk Apps about the mobile UX project.",
      metadata: { actor: "Sadia Rahman" },
      created_at: d(-1),
    },
    {
      id: ID.activities[17]!,
      user_id: DEMO_USER_ID,
      entity_type: "project",
      entity_id: ID.projects[3]!,
      activity_type: "note",
      subject: "Handover notes",
      body: "Delivered final assets and documentation to Lumen Labs.",
      metadata: { actor: "Rafi Ahmed" },
      created_at: d(-10),
    },
  ];
}

export function buildDemoData(): {
  demo_version: number;
  profile: Profile;
  users: AppUser[];
  team_members: TeamMember[];
  accounts: Account[];
  clients: Client[];
  opportunities: Opportunity[];
  projects: Project[];
  milestones: Milestone[];
  project_todos: ProjectTodo[];
  project_credentials: ProjectCredential[];
  project_team_members: ProjectTeamMember[];
  time_entries: TimeEntry[];
  activities: Activity[];
  follow_ups: FollowUp[];
  invoices: Invoice[];
  invoice_items: InvoiceItem[];
  attachments: Attachment[];
  email_templates: EmailTemplate[];
  automation_rules: AutomationRule[];
  import_runs: ImportRun[];
} {
  const profile: Profile = {
    id: DEMO_USER_ID,
    full_name: "Mamunur Roshid",
    avatar_url: null,
    role: "ceo",
    currency: "USD",
    default_fee_percent: 20,
    created_at: d(-400),
    updated_at: d(-1),
  };

  const team_members: TeamMember[] = (
    [
      ["ceo", -400],
      ["executive", -200],
      ["developer", -90],
      ["designer", -60],
    ] as Array<[TeamRole, number]>
  ).map(([role, offset], i) => {
    const persona = DEMO_PERSONAS[role];
    return {
      id: `tm-000${i + 1}`,
      user_id: DEMO_USER_ID,
      name: persona.name,
      email: persona.email,
      role,
      is_active: true,
      created_at: d(offset),
      updated_at: d(-1),
    };
  });

  // Username + password logins provisioned by the agency (no self-registration).
  // Initial password is DEMO_INITIAL_PASSWORD; agency can change it in Settings.
  const users: AppUser[] = DEMO_LOGIN_CREDENTIALS.map((cred, i) => {
    const persona = DEMO_PERSONAS[cred.role];
    const offset = cred.role === "ceo" ? -400 : cred.role === "executive" ? -200 : cred.role === "developer" ? -90 : -60;
    return {
      id: ID.users[i] ?? `us-17${i + 1}`,
      username: cred.username,
      password_hash: hashPassword(DEMO_INITIAL_PASSWORD),
      name: persona.name,
      email: persona.email,
      role: cred.role,
      is_active: true,
      created_at: d(offset),
      updated_at: d(-1),
    };
  });

  const accounts: Account[] = [
    { id: ID.accounts[0]!, user_id: DEMO_USER_ID, name: "SardarIT Fiverr", platform: "fiverr", username: "sardarit", profile_url: "https://www.fiverr.com/sardarit", is_active: true, created_at: d(-400), updated_at: d(-10) },
    { id: ID.accounts[1]!, user_id: DEMO_USER_ID, name: "SardarIT Upwork", platform: "upwork", username: "sardaritbd", profile_url: "https://www.upwork.com/freelancers/sardaritbd", is_active: true, created_at: d(-400), updated_at: d(-10) },
    { id: ID.accounts[2]!, user_id: DEMO_USER_ID, name: "SardarIT Design", platform: "fiverr", username: "sardaritdesign", profile_url: "https://www.fiverr.com/sardaritdesign", is_active: true, created_at: d(-200), updated_at: d(-5) },
  ];

  const clients: Client[] = [
    { id: ID.clients[0]!, user_id: DEMO_USER_ID, name: "Sarah Mitchell", email: "sarah@brightpath.io", company: "BrightPath", platform: "upwork", username: "brightpath", profile_url: "https://www.upwork.com/users/~brightpath", category: "WordPress", account_id: ID.accounts[1]!, tags: ["repeat"], notes: "Prefers daily updates.", lead_score: "High", country: "United States", industry: "Agency", website: "https://brightpath.io", linkedin_url: "https://linkedin.com/in/sarahmitchell", main_problem_found: "Outdated Wix site, poor mobile UX", website_review_notes: "Site loads in 6s on mobile. No SSL. Blog section broken.", source: "Apollo", outreach_status: "Contacted", email_verified: true, last_email_sent_at: d(-2), next_follow_up_date: dateOnly(2), follow_up_count: 1, owner_id: null, created_at: d(-90), updated_at: d(-6) },
    { id: ID.clients[1]!, user_id: DEMO_USER_ID, name: "Tom Hendricks", email: "tom@eleventystudios.com", company: "Eleventy Studios", platform: "fiverr", username: "eleventystudios", profile_url: "https://www.fiverr.com/eleventystudios", category: "Shopify", account_id: ID.accounts[0]!, tags: [], notes: "Budget-conscious, fast approvals.", lead_score: "Medium", country: "United Kingdom", industry: "eCommerce", website: "https://eleventystudios.com", linkedin_url: null, main_problem_found: "Slow Shopify theme, low conversion", website_review_notes: null, source: "Manual", outreach_status: "Replied", email_verified: true, last_email_sent_at: d(-5), next_follow_up_date: dateOnly(5), follow_up_count: 2, owner_id: null, created_at: d(-120), updated_at: d(-3) },
    { id: ID.clients[2]!, user_id: DEMO_USER_ID, name: "Aisha Rahman", email: "aisha@lumenlabs.co", company: "Lumen Labs", platform: "fiverr", username: "lumenlabs", profile_url: "https://www.fiverr.com/lumenlabs", category: "Landing Page", account_id: ID.accounts[0]!, tags: ["startup"], notes: "Wants 3 revision rounds.", lead_score: "Low", country: "Canada", industry: "SaaS", website: "https://lumenlabs.co", linkedin_url: null, main_problem_found: null, website_review_notes: null, source: "LinkedIn", outreach_status: "New", email_verified: false, last_email_sent_at: null, next_follow_up_date: null, follow_up_count: 0, owner_id: null, created_at: d(-60), updated_at: d(-2) },
    { id: ID.clients[3]!, user_id: DEMO_USER_ID, name: "Marco Rossi", email: "marco@deltastartups.com", company: "Delta Startups", platform: "upwork", username: "deltastartups", profile_url: "https://www.upwork.com/users/~deltastartups", category: "Web App", account_id: ID.accounts[1]!, tags: ["long-term"], notes: "Series A funded. High quality bar.", lead_score: null, country: null, industry: null, website: null, linkedin_url: null, main_problem_found: null, website_review_notes: null, source: null, outreach_status: "New", email_verified: false, last_email_sent_at: null, next_follow_up_date: null, follow_up_count: 0, owner_id: null, created_at: d(-45), updated_at: d(-1) },
    { id: ID.clients[4]!, user_id: DEMO_USER_ID, name: "Nina Patel", email: "nina@kitecrm.io", company: "KiteCRM", platform: "fiverr", username: "kitecrm", profile_url: "https://www.fiverr.com/kitecrm", category: "CRM", account_id: ID.accounts[0]!, tags: ["integration"], notes: "Needs API + frontend.", lead_score: null, country: null, industry: null, website: null, linkedin_url: null, main_problem_found: null, website_review_notes: null, source: null, outreach_status: "New", email_verified: false, last_email_sent_at: null, next_follow_up_date: null, follow_up_count: 0, owner_id: null, created_at: d(-35), updated_at: d(-4) },
    { id: ID.clients[5]!, user_id: DEMO_USER_ID, name: "Luis Garcia", email: "luis@verkta.de", company: "Verkta", platform: "upwork", username: "verkta", profile_url: "https://www.upwork.com/users/~verkta", category: "E-commerce", account_id: ID.accounts[1]!, tags: [], notes: "Went with another freelancer on last bid.", lead_score: null, country: null, industry: null, website: null, linkedin_url: null, main_problem_found: null, website_review_notes: null, source: null, outreach_status: "New", email_verified: false, last_email_sent_at: null, next_follow_up_date: null, follow_up_count: 0, owner_id: null, created_at: d(-70), updated_at: d(-15) },
    { id: ID.clients[6]!, user_id: DEMO_USER_ID, name: "Emma Johansson", email: "emma@nordkapps.se", company: "Nordk Apps", platform: "fiverr", username: "nordkapps", profile_url: "https://www.fiverr.com/nordkapps", category: "Mobile", account_id: ID.accounts[2]!, tags: ["new"], notes: "From the Fiverr nurture list.", lead_score: null, country: null, industry: null, website: null, linkedin_url: null, main_problem_found: null, website_review_notes: null, source: null, outreach_status: "New", email_verified: false, last_email_sent_at: null, next_follow_up_date: null, follow_up_count: 0, owner_id: null, created_at: d(-20), updated_at: d(-20) },
    { id: ID.clients[7]!, user_id: DEMO_USER_ID, name: "David Chen", email: "david@orbitlab.ai", company: "Orbit Lab", platform: "upwork", username: "orbitlab", profile_url: "https://www.upwork.com/users/~orbitlab", category: "AI", account_id: ID.accounts[1]!, tags: ["ai", "startup"], notes: "Interested in AI-assisted features.", lead_score: null, country: null, industry: null, website: null, linkedin_url: null, main_problem_found: null, website_review_notes: null, source: null, outreach_status: "New", email_verified: false, last_email_sent_at: null, next_follow_up_date: null, follow_up_count: 0, owner_id: null, created_at: d(-12), updated_at: d(-12) },
    // ---- Outbound leads (cold email campaign demo data) ----
    {
      id: ID.clients[8]!, user_id: DEMO_USER_ID, name: "Rachel Kim", email: "rachel@shopnova.co",
      company: "ShopNova", platform: null, username: null, profile_url: null,
      category: "eCommerce", account_id: null, tags: ["cold-email", "ecommerce"],
      notes: "High-value Shopify store. Quick to reply.",
      lead_score: "High", country: "United States", industry: "eCommerce",
      website: "https://shopnova.co", linkedin_url: "https://linkedin.com/in/rachelkim",
      main_problem_found: "Product pages lack trust badges, 4.8s load time on mobile",
      website_review_notes: "Homepage is clean but PDPs are generic. No reviews widget, no urgency CTA. Mobile Lighthouse score: 52. Competitor (BlissSkincare) loads in 1.2s.",
      source: "Apollo", outreach_status: "Meeting", email_verified: true,
      last_email_sent_at: d(-1), next_follow_up_date: dateOnly(5), follow_up_count: 2,
      owner_id: null, created_at: d(-25), updated_at: d(-1),
    },
    {
      id: ID.clients[9]!, user_id: DEMO_USER_ID, name: "James Thornton", email: "james@thorntonrealty.com",
      company: "Thornton Realty", platform: null, username: null, profile_url: null,
      category: "Real Estate", account_id: null, tags: ["cold-email", "real-estate"],
      notes: "Boutique agency in London. Need IDX integration.",
      lead_score: "High", country: "United Kingdom", industry: "Real Estate",
      website: "https://thorntonrealty.com", linkedin_url: "https://linkedin.com/in/jamesthorntonuk",
      main_problem_found: "No property search on site, leads go to generic contact form",
      website_review_notes: "Beautiful branding but zero lead capture beyond a basic contact form. Competitors have instant property valuations. Huge opportunity for IDX/MLS integration.",
      source: "LinkedIn", outreach_status: "Proposal", email_verified: true,
      last_email_sent_at: d(-3), next_follow_up_date: dateOnly(2), follow_up_count: 3,
      owner_id: null, created_at: d(-30), updated_at: d(-3),
    },
    {
      id: ID.clients[10]!, user_id: DEMO_USER_ID, name: "Priya Sharma", email: "priya@growthlabs.ca",
      company: "Growth Labs", platform: null, username: null, profile_url: null,
      category: "Agency", account_id: null, tags: ["cold-email", "agency"],
      notes: "Digital marketing agency, Toronto.",
      lead_score: "Medium", country: "Canada", industry: "Agency",
      website: "https://growthlabs.ca", linkedin_url: "https://linkedin.com/in/priyasharmalabs",
      main_problem_found: "Portfolio page loads 8s, no case studies visible",
      website_review_notes: "Agency site is slow. Portfolio grid is unoptimized — 47 images on one page with no lazy loading. Blog hasn't been updated in 6 months. Quick wins available.",
      source: "Hunter", outreach_status: "Contacted", email_verified: true,
      last_email_sent_at: d(-4), next_follow_up_date: dateOnly(3), follow_up_count: 1,
      owner_id: null, created_at: d(-20), updated_at: d(-4),
    },
    {
      id: ID.clients[11]!, user_id: DEMO_USER_ID, name: "Marcus Weber", email: "marcus@blueterrace.de",
      company: "Blue Terrace Hotels", platform: null, username: null, profile_url: null,
      category: "Hospitality", account_id: null, tags: ["cold-email", "hospitality"],
      notes: "Boutique hotel chain, Berlin.",
      lead_score: "Low", country: "United Kingdom", industry: "Hospitality",
      website: "https://blueterrace.de", linkedin_url: null,
      main_problem_found: "Booking widget is third-party iframe, poor mobile experience",
      website_review_notes: "Direct booking widget embedded via iframe — slow, breaks on mobile. They pay 15% commission to OTAs. Custom booking flow could save them thousands monthly.",
      source: "Manual", outreach_status: "Replied", email_verified: false,
      last_email_sent_at: d(-7), next_follow_up_date: dateOnly(1), follow_up_count: 1,
      owner_id: null, created_at: d(-15), updated_at: d(-7),
    },
    {
      id: ID.clients[12]!, user_id: DEMO_USER_ID, name: "Olivia Bennett", email: "olivia@zenithcrm.io",
      company: "Zenith CRM", platform: null, username: null, profile_url: null,
      category: "SaaS", account_id: null, tags: ["cold-email", "saas"],
      notes: "SaaS startup, Series A.",
      lead_score: "Medium", country: "United States", industry: "SaaS",
      website: "https://zenithcrm.io", linkedin_url: "https://linkedin.com/in/oliviabennett",
      main_problem_found: "Pricing page confusing, no ROI calculator",
      website_review_notes: "Pricing page has 5 tiers with unclear feature matrix. No social proof, no ROI calculator. Churn likely from confused trial users. Could be a strong retainer client.",
      source: "Apollo", outreach_status: "New", email_verified: true,
      last_email_sent_at: null, next_follow_up_date: dateOnly(4), follow_up_count: 0,
      owner_id: null, created_at: d(-8), updated_at: d(-8),
    },
    {
      id: ID.clients[13]!, user_id: DEMO_USER_ID, name: "Ahmed Hassan", email: "ahmed@nexgen edu.com",
      company: "NexGen Education", platform: null, username: null, profile_url: null,
      category: "Education", account_id: null, tags: ["cold-email", "education"],
      notes: "Online learning platform, Dubai.",
      lead_score: "High", country: "United States", industry: "Education",
      website: "https://nexgenedu.com", linkedin_url: "https://linkedin.com/in/ahmedhassanedu",
      main_problem_found: "Course pages have no video previews, checkout drops 70%",
      website_review_notes: "Course catalog is text-only with no video previews. Checkout funnel has a 70% drop-off rate at payment step. Stripe integration is basic — no upsells, no bundles.",
      source: "Website", outreach_status: "Won", email_verified: true,
      last_email_sent_at: d(-10), next_follow_up_date: null, follow_up_count: 2,
      owner_id: null, created_at: d(-40), updated_at: d(-5),
    },
    {
      id: ID.clients[14]!, user_id: DEMO_USER_ID, name: "Lisa Park", email: "lisa@coastalfitness.com",
      company: "Coastal Fitness", platform: null, username: null, profile_url: null,
      category: "Healthcare", account_id: null, tags: ["cold-email", "fitness"],
      notes: "Gym chain, California.",
      lead_score: "Low", country: "United States", industry: "Healthcare",
      website: "https://coastalfitness.com", linkedin_url: null,
      main_problem_found: "Membership signup is phone-only, no online booking",
      website_review_notes: "No online class booking or membership signup. All conversions happen via phone or walk-in. Missed a huge digital-first audience. Site is also not ADA compliant.",
      source: "Referral", outreach_status: "Lost", email_verified: false,
      last_email_sent_at: d(-20), next_follow_up_date: null, follow_up_count: 1,
      owner_id: null, created_at: d(-35), updated_at: d(-20),
    },
  ];

  const opportunities: Opportunity[] = [
    { id: ID.opportunities[0]!, user_id: DEMO_USER_ID, title: "WordPress migration for BrightPath", description: "Move 40-page marketing site from Wix to WordPress with custom theme.", client_id: ID.clients[0]!, account_id: ID.accounts[1]!, platform: "upwork", type: "bid", stage: "lead", status: "no_response", follow_up_status: "follow_up", amount: 1800, currency: "USD", connects_spent: 6, source_url: "https://www.upwork.com/jobs/~01brightpath", due_date: null, next_follow_up: dateOnly(2), assigned_to: "Mamunur Roshid", lost_reason: null, notes: "Sent proposal Monday, awaiting response.", created_at: d(-4), updated_at: d(-2) },
    { id: ID.opportunities[1]!, user_id: DEMO_USER_ID, title: "Shopify store rebuild", description: "Full rebuild of the Eleventy storefront with custom sections.", client_id: ID.clients[1]!, account_id: ID.accounts[0]!, platform: "fiverr", type: "pre_sales", stage: "proposal", status: null, follow_up_status: "follow_up", amount: 950, currency: "USD", connects_spent: 0, source_url: "https://www.fiverr.com/inbox/conversation/88231", due_date: null, next_follow_up: dateOnly(3), assigned_to: "Zunaid Hasan", lost_reason: null, notes: "Quoted $950, client asked about timeline.", created_at: d(-6), updated_at: d(-3) },
    { id: ID.opportunities[2]!, user_id: DEMO_USER_ID, title: "Landing page for SaaS launch", description: "Conversion-focused landing page for Lumen Labs analytics product.", client_id: ID.clients[2]!, account_id: ID.accounts[0]!, platform: "fiverr", type: "pre_sales", stage: "negotiation", status: null, follow_up_status: "pending", amount: 750, currency: "USD", connects_spent: 0, source_url: "https://www.fiverr.com/inbox/conversation/77420", due_date: null, next_follow_up: dateOnly(1), assigned_to: "Zunaid Hasan", lost_reason: null, notes: "Negotiating scope, wants 3 revisions.", created_at: d(-8), updated_at: d(-1) },
    { id: ID.opportunities[3]!, user_id: DEMO_USER_ID, title: "Web app MVP for Delta Startups", description: "Build MVP web app with auth, dashboard, Stripe billing.", client_id: ID.clients[3]!, account_id: ID.accounts[1]!, platform: "upwork", type: "bid", stage: "active", status: "interview", follow_up_status: "pending", amount: 6500, currency: "USD", connects_spent: 12, source_url: "https://www.upwork.com/jobs/~01deltamvp", due_date: dateOnly(20), next_follow_up: null, assigned_to: "Mamunur Roshid", lost_reason: null, notes: "Interview scheduled, strong fit.", created_at: d(-10), updated_at: d(-1) },
    { id: ID.opportunities[4]!, user_id: DEMO_USER_ID, title: "CRM portal integration", description: "Integrate KiteCRM with a client portal UI.", client_id: ID.clients[4]!, account_id: ID.accounts[0]!, platform: "fiverr", type: "pre_sales", stage: "won", status: null, follow_up_status: "accepted", amount: 1200, currency: "USD", connects_spent: 0, source_url: "https://www.fiverr.com/inbox/conversation/66501", due_date: null, next_follow_up: null, assigned_to: "Mamunur Roshid", lost_reason: null, notes: "Won! Creating project.", created_at: d(-18), updated_at: d(-5) },
    { id: ID.opportunities[5]!, user_id: DEMO_USER_ID, title: "E-commerce redesign quote", description: "Redesign of Verkta webshop with new product pages.", client_id: ID.clients[5]!, account_id: ID.accounts[1]!, platform: "upwork", type: "bid", stage: "lost", status: "rejected", follow_up_status: "archived", amount: 2400, currency: "USD", connects_spent: 8, source_url: "https://www.upwork.com/jobs/~01verkta", due_date: null, next_follow_up: null, assigned_to: "Mamunur Roshid", lost_reason: "Client went with another freelancer", notes: "", created_at: d(-30), updated_at: d(-14) },
    { id: ID.opportunities[6]!, user_id: DEMO_USER_ID, title: "Mobile app onboarding UX", description: "Redesign onboarding flow for Nordk app.", client_id: ID.clients[6]!, account_id: ID.accounts[2]!, platform: "fiverr", type: "pre_sales", stage: "proposal", status: null, follow_up_status: "pending", amount: 1100, currency: "USD", connects_spent: 0, source_url: "https://www.fiverr.com/inbox/conversation/90112", due_date: null, next_follow_up: dateOnly(5), assigned_to: "Zunaid Hasan", lost_reason: null, notes: "Sent quote today.", created_at: d(-2), updated_at: d(-1) },
    { id: ID.opportunities[7]!, user_id: DEMO_USER_ID, title: "AI chat widget for Orbit Lab", description: "Embeddable AI chat widget for the Orbit website.", client_id: ID.clients[7]!, account_id: ID.accounts[1]!, platform: "upwork", type: "bid", stage: "lead", status: "only_viewed", follow_up_status: "follow_up", amount: 1500, currency: "USD", connects_spent: 6, source_url: "https://www.upwork.com/jobs/~01orbitchat", due_date: null, next_follow_up: dateOnly(1), assigned_to: "Zunaid Hasan", lost_reason: null, notes: "Viewed but no reply yet.", created_at: d(-3), updated_at: d(-1) },
    { id: ID.opportunities[8]!, user_id: DEMO_USER_ID, title: "Booking system for a clinic", description: "Online booking with calendar + payments.", client_id: null, account_id: ID.accounts[1]!, platform: "upwork", type: "bid", stage: "lead", status: "no_response", follow_up_status: "pending", amount: 3200, currency: "USD", connects_spent: 4, source_url: "https://www.upwork.com/jobs/~01clinic", due_date: null, next_follow_up: dateOnly(7), assigned_to: "Mamunur Roshid", lost_reason: null, notes: "", created_at: d(-5), updated_at: d(-5) },
    { id: ID.opportunities[9]!, user_id: DEMO_USER_ID, title: "Blog content migration", description: "Migrate 200 blog posts to new CMS with redirects.", client_id: ID.clients[0]!, account_id: ID.accounts[0]!, platform: "fiverr", type: "pre_sales", stage: "active", status: null, follow_up_status: "accepted", amount: 600, currency: "USD", connects_spent: 0, source_url: "https://www.fiverr.com/inbox/conversation/55210", due_date: null, next_follow_up: null, assigned_to: "Mamunur Roshid", lost_reason: null, notes: "Kickoff meeting done.", created_at: d(-9), updated_at: d(-2) },
    { id: ID.opportunities[10]!, user_id: DEMO_USER_ID, title: "API rate limiter module", description: "Add rate limiting middleware to existing Node API.", client_id: ID.clients[3]!, account_id: ID.accounts[1]!, platform: "upwork", type: "bid", stage: "negotiation", status: "response", follow_up_status: "pending", amount: 850, currency: "USD", connects_spent: 4, source_url: "https://www.upwork.com/jobs/~01ratelimit", due_date: null, next_follow_up: dateOnly(2), assigned_to: "Mamunur Roshid", lost_reason: null, notes: "Client asked for a discount.", created_at: d(-6), updated_at: d(-1) },
    { id: ID.opportunities[11]!, user_id: DEMO_USER_ID, title: "Brand + landing kit", description: "Logo, favicon and one landing page for new startup.", client_id: null, account_id: ID.accounts[2]!, platform: "fiverr", type: "pre_sales", stage: "lead", status: null, follow_up_status: "pending", amount: 500, currency: "USD", connects_spent: 0, source_url: "https://www.fiverr.com/inbox/conversation/73314", due_date: null, next_follow_up: dateOnly(4), assigned_to: "Mamunur Roshid", lost_reason: null, notes: "", created_at: d(-1), updated_at: d(-1) },
    { id: ID.opportunities[12]!, user_id: DEMO_USER_ID, title: "WooCommerce speed optimization", description: "Improve Core Web Vitals for Woo store.", client_id: ID.clients[1]!, account_id: ID.accounts[0]!, platform: "fiverr", type: "pre_sales", stage: "won", status: null, follow_up_status: "accepted", amount: 700, currency: "USD", connects_spent: 0, source_url: "https://www.fiverr.com/inbox/conversation/81210", due_date: null, next_follow_up: null, assigned_to: "Mamunur Roshid", lost_reason: null, notes: "Converted from nurture list.", created_at: d(-14), updated_at: d(-7) },
    { id: ID.opportunities[13]!, user_id: DEMO_USER_ID, title: "Admin dashboard redesign", description: "Redesign admin UI with modern charts.", client_id: ID.clients[4]!, account_id: ID.accounts[1]!, platform: "upwork", type: "bid", stage: "lost", status: "no_response", follow_up_status: "archived", amount: 1600, currency: "USD", connects_spent: 6, source_url: "https://www.upwork.com/jobs/~01admindash", due_date: null, next_follow_up: null, assigned_to: "Mamunur Roshid", lost_reason: "No response after 2 weeks", notes: "", created_at: d(-40), updated_at: d(-20) },
  ];

  const projects: Project[] = [
    { id: ID.projects[0]!, user_id: DEMO_USER_ID, opportunity_id: ID.opportunities[3]!, client_id: ID.clients[3]!, account_id: ID.accounts[1]!, project_name: "Delta Startups - MVP build", order_date: dateOnly(-20), assigned_to: "Mamunur Roshid", developer: "Maya Chen", website_link: "https://deltastartups.com", project_type: "Web App", delivery_deadline: dateOnly(20), gross_amount: 6500, fee_percent: 10, fee_amount: 650, net_amount: 5850, bonus: 0, status: "revision", priority: "high", progress: 70, notes: "Client requested changes to dashboard.", created_at: d(-20), updated_at: d(-1) },
    { id: ID.projects[1]!, user_id: DEMO_USER_ID, opportunity_id: ID.opportunities[4]!, client_id: ID.clients[4]!, account_id: ID.accounts[0]!, project_name: "KiteCRM - portal integration", order_date: dateOnly(-12), assigned_to: "Mamunur Roshid", developer: "Alex Kim", website_link: "https://kitecrm.io", project_type: "Integration", delivery_deadline: dateOnly(12), gross_amount: 1200, fee_percent: 20, fee_amount: 240, net_amount: 960, bonus: 0, status: "wip", priority: "high", progress: 55, notes: "", created_at: d(-12), updated_at: d(-1) },
    { id: ID.projects[2]!, user_id: DEMO_USER_ID, opportunity_id: ID.opportunities[0]!, client_id: ID.clients[0]!, account_id: ID.accounts[1]!, project_name: "BrightPath - WordPress migration", order_date: dateOnly(-30), assigned_to: "Mamunur Roshid", developer: "Alex Kim", website_link: "https://brightpath.io", project_type: "Migration", delivery_deadline: dateOnly(-12), gross_amount: 1800, fee_percent: 10, fee_amount: 180, net_amount: 1620, bonus: 0, status: "delivered", priority: "high", progress: 100, notes: "", created_at: d(-30), updated_at: d(-4) },
    { id: ID.projects[3]!, user_id: DEMO_USER_ID, opportunity_id: ID.opportunities[2]!, client_id: ID.clients[2]!, account_id: ID.accounts[0]!, project_name: "LumenLabs - SaaS landing page", order_date: dateOnly(-26), assigned_to: "Mamunur Roshid", developer: "Priya Shah", website_link: "https://lumenlabs.co", project_type: "Landing Page", delivery_deadline: dateOnly(-14), gross_amount: 750, fee_percent: 20, fee_amount: 150, net_amount: 600, bonus: 50, status: "complete", priority: "medium", progress: 100, notes: "Got a $50 bonus.", created_at: d(-26), updated_at: d(-10) },
    { id: ID.projects[4]!, user_id: DEMO_USER_ID, opportunity_id: ID.opportunities[12]!, client_id: ID.clients[1]!, account_id: ID.accounts[0]!, project_name: "Eleventy - WooCommerce speed optimization", order_date: dateOnly(-16), assigned_to: "Mamunur Roshid", developer: "Priya Shah", website_link: "https://eleventystudios.com", project_type: "Performance", delivery_deadline: dateOnly(-2), gross_amount: 700, fee_percent: 20, fee_amount: 140, net_amount: 560, bonus: 0, status: "delivered", priority: "medium", progress: 100, notes: "", created_at: d(-16), updated_at: d(-3) },
    { id: ID.projects[5]!, user_id: DEMO_USER_ID, opportunity_id: null, client_id: ID.clients[6]!, account_id: ID.accounts[2]!, project_name: "Nordk - onboarding UX kit", order_date: dateOnly(-6), assigned_to: "Zunaid Hasan", developer: "Maya Chen", website_link: null, project_type: "Mobile", delivery_deadline: dateOnly(8), gross_amount: 1100, fee_percent: 20, fee_amount: 220, net_amount: 880, bonus: 0, status: "submitted", priority: "medium", progress: 80, notes: "", created_at: d(-6), updated_at: d(-1) },
    { id: ID.projects[6]!, user_id: DEMO_USER_ID, opportunity_id: null, client_id: ID.clients[1]!, account_id: ID.accounts[0]!, project_name: "Eleventy - Shopify rebuild", order_date: dateOnly(-45), assigned_to: "Mamunur Roshid", developer: "Maya Chen", website_link: "https://eleventystudios.com", project_type: "Shopify", delivery_deadline: dateOnly(-25), gross_amount: 950, fee_percent: 20, fee_amount: 190, net_amount: 760, bonus: 0, status: "complete", priority: "medium", progress: 100, notes: "", created_at: d(-45), updated_at: d(-24) },
    { id: ID.projects[7]!, user_id: DEMO_USER_ID, opportunity_id: ID.opportunities[5]!, client_id: ID.clients[5]!, account_id: ID.accounts[1]!, project_name: "Verkta - shop redesign", order_date: dateOnly(-100), assigned_to: "Mamunur Roshid", developer: "Priya Shah", website_link: "https://verkta.de", project_type: "E-commerce", delivery_deadline: dateOnly(-86), gross_amount: 2400, fee_percent: 10, fee_amount: 240, net_amount: 2160, bonus: 0, status: "cancelled", priority: "low", progress: 0, notes: "Cancelled after design freeze.", created_at: d(-100), updated_at: d(-70) },
    { id: ID.projects[8]!, user_id: DEMO_USER_ID, opportunity_id: null, client_id: ID.clients[0]!, account_id: ID.accounts[1]!, project_name: "BrightPath - Blog content migration", order_date: dateOnly(-70), assigned_to: "Mamunur Roshid", developer: "Alex Kim", website_link: "https://blog.brightpath.io", project_type: "Migration", delivery_deadline: dateOnly(-55), gross_amount: 600, fee_percent: 10, fee_amount: 60, net_amount: 540, bonus: 0, status: "complete", priority: "low", progress: 100, notes: "", created_at: d(-70), updated_at: d(-54) },
    { id: ID.projects[9]!, user_id: DEMO_USER_ID, opportunity_id: null, client_id: ID.clients[2]!, account_id: ID.accounts[0]!, project_name: "LumenLabs - waitlist page", order_date: dateOnly(-5), assigned_to: "Zunaid Hasan", developer: null, website_link: "https://waitlist.lumenlabs.co", project_type: "Landing Page", delivery_deadline: dateOnly(6), gross_amount: 350, fee_percent: 20, fee_amount: 70, net_amount: 280, bonus: 0, status: "wip", priority: "medium", progress: 30, notes: "", created_at: d(-5), updated_at: d(-1) },
  ];

  const milestones: Milestone[] = [
    { id: ID.milestones[0]!, user_id: DEMO_USER_ID, project_id: ID.projects[0]!, title: "Requirements & architecture", description: "Agree on stack and data model.", order_index: 0, status: "done", due_date: dateOnly(-18), completed_at: d(-17), created_at: d(-20), updated_at: d(-17) },
    { id: ID.milestones[1]!, user_id: DEMO_USER_ID, project_id: ID.projects[0]!, title: "Auth + dashboard skeleton", description: "Signup, login, layout.", order_index: 1, status: "done", due_date: dateOnly(-8), completed_at: d(-9), created_at: d(-20), updated_at: d(-9) },
    { id: ID.milestones[2]!, user_id: DEMO_USER_ID, project_id: ID.projects[0]!, title: "Stripe billing integration", description: "Subscriptions + webhooks.", order_index: 2, status: "in_progress", due_date: dateOnly(6), completed_at: null, created_at: d(-20), updated_at: d(-2) },
    { id: ID.milestones[3]!, user_id: DEMO_USER_ID, project_id: ID.projects[0]!, title: "Beta testing & launch", description: "", order_index: 3, status: "pending", due_date: dateOnly(20), completed_at: null, created_at: d(-20), updated_at: d(-20) },
    { id: ID.milestones[4]!, user_id: DEMO_USER_ID, project_id: ID.projects[1]!, title: "Requirements & wireframes", description: null, order_index: 0, status: "done", due_date: dateOnly(-9), completed_at: d(-9), created_at: d(-12), updated_at: d(-9) },
    { id: ID.milestones[5]!, user_id: DEMO_USER_ID, project_id: ID.projects[1]!, title: "Build integration API", description: null, order_index: 1, status: "done", due_date: dateOnly(-2), completed_at: d(-2), created_at: d(-12), updated_at: d(-2) },
    { id: ID.milestones[6]!, user_id: DEMO_USER_ID, project_id: ID.projects[1]!, title: "Frontend portal screens", description: null, order_index: 2, status: "in_progress", due_date: dateOnly(4), completed_at: null, created_at: d(-12), updated_at: d(-1) },
    { id: ID.milestones[7]!, user_id: DEMO_USER_ID, project_id: ID.projects[1]!, title: "Testing & handover", description: null, order_index: 3, status: "pending", due_date: dateOnly(12), completed_at: null, created_at: d(-12), updated_at: d(-12) },
    { id: ID.milestones[8]!, user_id: DEMO_USER_ID, project_id: ID.projects[5]!, title: "UX audit & wireframes", description: null, order_index: 0, status: "done", due_date: dateOnly(-4), completed_at: d(-4), created_at: d(-6), updated_at: d(-4) },
    { id: ID.milestones[9]!, user_id: DEMO_USER_ID, project_id: ID.projects[5]!, title: "Design screens", description: null, order_index: 1, status: "in_progress", due_date: dateOnly(3), completed_at: null, created_at: d(-6), updated_at: d(-1) },
    { id: ID.milestones[10]!, user_id: DEMO_USER_ID, project_id: ID.projects[9]!, title: "Copy + structure", description: null, order_index: 0, status: "done", due_date: dateOnly(-3), completed_at: d(-3), created_at: d(-5), updated_at: d(-3) },
    { id: ID.milestones[11]!, user_id: DEMO_USER_ID, project_id: ID.projects[9]!, title: "Build & connect waitlist form", description: null, order_index: 1, status: "in_progress", due_date: dateOnly(3), completed_at: null, created_at: d(-5), updated_at: d(-1) },
  ];

  // Demo team member ids (see team_members above).
  const TM = { gm: "tm-0001", pm: "tm-0002", dev: "tm-0003", designer: "tm-0004" } as const;

  const project_todos: ProjectTodo[] = [
    { id: ID.todos[0]!, user_id: DEMO_USER_ID, project_id: ID.projects[0]!, title: "Send updated dashboard mockups to Marco", description: "Client asked for the new analytics layout.", status: "in_progress", due_date: dateOnly(2), assignee: "Rafi Ahmed", order_index: 0, created_at: d(-2), updated_at: d(-1) },
    { id: ID.todos[1]!, user_id: DEMO_USER_ID, project_id: ID.projects[0]!, title: "Configure Stripe webhook endpoint", description: "Live keys from the client.", status: "pending", due_date: dateOnly(3), assignee: "Zunaid Hasan", order_index: 1, created_at: d(-1), updated_at: d(-1) },
    { id: ID.todos[2]!, user_id: DEMO_USER_ID, project_id: ID.projects[0]!, title: "QA pass on signup flow", description: "", status: "done", due_date: dateOnly(-1), assignee: "Rafi Ahmed", order_index: 2, created_at: d(-3), updated_at: d(-1) },
    { id: ID.todos[3]!, user_id: DEMO_USER_ID, project_id: ID.projects[1]!, title: "Draft API integration contract", description: "Shared with Nina for sign-off.", status: "in_progress", due_date: dateOnly(4), assignee: "Mamunur Roshid", order_index: 0, created_at: d(-2), updated_at: d(-1) },
    { id: ID.todos[4]!, user_id: DEMO_USER_ID, project_id: ID.projects[1]!, title: "Set up staging environment", description: "", status: "pending", due_date: dateOnly(1), assignee: "Zunaid Hasan", order_index: 1, created_at: d(-1), updated_at: d(-1) },
    { id: ID.todos[5]!, user_id: DEMO_USER_ID, project_id: ID.projects[9]!, title: "Collect client copy for waitlist section", description: "", status: "pending", due_date: dateOnly(2), assignee: "Sadia Rahman", order_index: 0, created_at: d(-1), updated_at: d(-1) },
  ];

  const project_credentials: ProjectCredential[] = [
    { id: ID.credentials[0]!, user_id: DEMO_USER_ID, project_id: ID.projects[0]!, title: "Staging WordPress admin", url: "https://staging.deltastartups.com/wp-admin", username: "sardar-dev", password: "Delta#2026!staging", notes: "Keep staging login separate from production.", created_at: d(-15), updated_at: d(-3) },
    { id: ID.credentials[1]!, user_id: DEMO_USER_ID, project_id: ID.projects[0]!, title: "cPanel (Delta Startups hosting)", url: "https://cpanel.deltastartups.com", username: "delta_mvp", password: "D3lta-h0st-2211", notes: "Root user for subdomains.", created_at: d(-15), updated_at: d(-15) },
    { id: ID.credentials[2]!, user_id: DEMO_USER_ID, project_id: ID.projects[0]!, title: "Stripe API keys (test)", url: "https://dashboard.stripe.com/test/apikeys", username: "api-test", password: "sk_test_51DeltaMvp", notes: "Swap to live keys before launch.", created_at: d(-10), updated_at: d(-10) },
    { id: ID.credentials[3]!, user_id: DEMO_USER_ID, project_id: ID.projects[2]!, title: "BrightPath WP admin", url: "https://brightpath.io/wp-admin", username: "sardarit", password: "Br1ghtPath@2025", notes: "Client gave access for migration only.", created_at: d(-25), updated_at: d(-5) },
    { id: ID.credentials[4]!, user_id: DEMO_USER_ID, project_id: ID.projects[1]!, title: "KiteCRM sandbox", url: "https://sandbox.kitecrm.io", username: "dev@kitecrm.io", password: "Kite-sandbox-77", notes: "", created_at: d(-8), updated_at: d(-2) },
  ];

  const project_team_members: ProjectTeamMember[] = [
    { id: ID.projectTeam[0]!, user_id: DEMO_USER_ID, project_id: ID.projects[0]!, team_member_id: TM.gm, name: "Mamunur Roshid", role_label: "General Manager", created_at: d(-20), updated_at: d(-20) },
    { id: ID.projectTeam[1]!, user_id: DEMO_USER_ID, project_id: ID.projects[0]!, team_member_id: TM.pm, name: "Zunaid Hasan", role_label: "Project Manager", created_at: d(-20), updated_at: d(-20) },
    { id: ID.projectTeam[2]!, user_id: DEMO_USER_ID, project_id: ID.projects[0]!, team_member_id: TM.dev, name: "Rafi Ahmed", role_label: "Developer", created_at: d(-20), updated_at: d(-5) },
    { id: ID.projectTeam[3]!, user_id: DEMO_USER_ID, project_id: ID.projects[0]!, team_member_id: TM.designer, name: "Sadia Rahman", role_label: "Designer", created_at: d(-20), updated_at: d(-5) },
    { id: ID.projectTeam[4]!, user_id: DEMO_USER_ID, project_id: ID.projects[1]!, team_member_id: TM.pm, name: "Zunaid Hasan", role_label: "Project Manager", created_at: d(-12), updated_at: d(-12) },
    { id: ID.projectTeam[5]!, user_id: DEMO_USER_ID, project_id: ID.projects[1]!, team_member_id: TM.dev, name: "Rafi Ahmed", role_label: "Developer", created_at: d(-12), updated_at: d(-12) },
  ];

  // Timesheet rows for the seeded base projects (recent dates so the current
  // month on the Calendar page and the Time tab show live-looking data; a
  // couple of non-billable rows model meetings/QA).
  const time_entries: TimeEntry[] = [
    { id: ID.timeEntries[0]!, user_id: DEMO_USER_ID, project_id: ID.projects[0]!, date: dateOnly(-1), hours: 3.5, description: "Stripe billing integration — build webhook handling", assignee: "Maya Chen", billable: true, created_at: d(-1), updated_at: d(-1) },
    { id: ID.timeEntries[1]!, user_id: DEMO_USER_ID, project_id: ID.projects[0]!, date: dateOnly(0), hours: 2, description: "Dashboard revision feedback from Marco", assignee: "Rafi Ahmed", billable: true, created_at: d(0), updated_at: d(0) },
    { id: ID.timeEntries[2]!, user_id: DEMO_USER_ID, project_id: ID.projects[0]!, date: dateOnly(-3), hours: 4, description: "Auth + dashboard skeleton polish", assignee: "Maya Chen", billable: true, created_at: d(-3), updated_at: d(-3) },
    { id: ID.timeEntries[3]!, user_id: DEMO_USER_ID, project_id: ID.projects[0]!, date: dateOnly(-5), hours: 1, description: "Client sync call (kickoff follow-up)", assignee: "Mamunur Roshid", billable: false, created_at: d(-5), updated_at: d(-5) },
    { id: ID.timeEntries[4]!, user_id: DEMO_USER_ID, project_id: ID.projects[1]!, date: dateOnly(-2), hours: 3, description: "Portal integration API — map KiteCRM endpoints", assignee: "Alex Kim", billable: true, created_at: d(-2), updated_at: d(-2) },
    { id: ID.timeEntries[5]!, user_id: DEMO_USER_ID, project_id: ID.projects[1]!, date: dateOnly(-4), hours: 2.5, description: "Frontend portal screens (draft)", assignee: "Alex Kim", billable: true, created_at: d(-4), updated_at: d(-4) },
    { id: ID.timeEntries[6]!, user_id: DEMO_USER_ID, project_id: ID.projects[1]!, date: dateOnly(-6), hours: 1, description: "API limits discussion with Nina", assignee: "Zunaid Hasan", billable: false, created_at: d(-6), updated_at: d(-6) },
    { id: ID.timeEntries[7]!, user_id: DEMO_USER_ID, project_id: ID.projects[5]!, date: dateOnly(-1), hours: 3, description: "Design screens — onboarding flow", assignee: "Sadia Rahman", billable: true, created_at: d(-1), updated_at: d(-1) },
    { id: ID.timeEntries[8]!, user_id: DEMO_USER_ID, project_id: ID.projects[5]!, date: dateOnly(-3), hours: 2, description: "UX audit & wireframes refinement", assignee: "Sadia Rahman", billable: true, created_at: d(-3), updated_at: d(-3) },
    { id: ID.timeEntries[9]!, user_id: DEMO_USER_ID, project_id: ID.projects[9]!, date: dateOnly(-2), hours: 1.5, description: "Waitlist form build & connect", assignee: "Zunaid Hasan", billable: true, created_at: d(-2), updated_at: d(-2) },
    { id: ID.timeEntries[10]!, user_id: DEMO_USER_ID, project_id: ID.projects[9]!, date: dateOnly(0), hours: 1, description: "Copy review for waitlist section", assignee: "Sadia Rahman", billable: false, created_at: d(0), updated_at: d(0) },
    { id: ID.timeEntries[11]!, user_id: DEMO_USER_ID, project_id: ID.projects[3]!, date: dateOnly(-12), hours: 5, description: "Final landing page build + bonus polish", assignee: "Priya Shah", billable: true, created_at: d(-12), updated_at: d(-12) },
  ];

  const allProjects = [...projects, ...generatedProjects()];
  const allOpportunities = [...opportunities, ...generatedOpportunities()];
  const allMilestones = [...milestones, ...generatedMilestones()];
  const allProjectTeam = [...project_team_members, ...generatedTeamMembers()];
  const allTimeEntries = [...time_entries, ...generatedTimeEntries()];

  const activities: Activity[] = [
    { id: ID.activities[0]!, user_id: DEMO_USER_ID, entity_type: "opportunity", entity_id: ID.opportunities[0]!, activity_type: "bid", subject: "Proposal sent", body: "Submitted proposal for WordPress migration, spent 6 connects.", metadata: {}, created_at: d(-4) },
    { id: ID.activities[1]!, user_id: DEMO_USER_ID, entity_type: "opportunity", entity_id: ID.opportunities[1]!, activity_type: "proposal_sent", subject: "Quote sent", body: "Sent $950 Shopify rebuild quote.", metadata: {}, created_at: d(-6) },
    { id: ID.activities[2]!, user_id: DEMO_USER_ID, entity_type: "opportunity", entity_id: ID.opportunities[3]!, activity_type: "status_change", subject: "Deal moved to Active", body: "Interview scheduled with Delta Startups.", metadata: {}, created_at: d(-1) },
    { id: ID.activities[3]!, user_id: DEMO_USER_ID, entity_type: "project", entity_id: ID.projects[0]!, activity_type: "status_change", subject: "Milestone updated", body: "Stripe billing marked in progress.", metadata: {}, created_at: d(-2) },
    { id: ID.activities[4]!, user_id: DEMO_USER_ID, entity_type: "client", entity_id: ID.clients[0]!, activity_type: "email", subject: "Intro email", body: "Kickoff email sent to BrightPath.", metadata: {}, created_at: d(-3) },
    { id: ID.activities[5]!, user_id: DEMO_USER_ID, entity_type: "opportunity", entity_id: ID.opportunities[5]!, activity_type: "status_change", subject: "Deal lost", body: "Verkta went with another freelancer.", metadata: {}, created_at: d(-14) },
    { id: ID.activities[6]!, user_id: DEMO_USER_ID, entity_type: "project", entity_id: ID.projects[1]!, activity_type: "note", subject: "Call with Nina", body: "Discussed API limits; agreed on 60 day support window.", metadata: {}, created_at: d(-2) },
    { id: ID.activities[7]!, user_id: DEMO_USER_ID, entity_type: "opportunity", entity_id: ID.opportunities[7]!, activity_type: "follow_up", subject: "Follow-up sent", body: "Nudged Orbit Lab about the chat widget proposal.", metadata: {}, created_at: d(-1) },
    { id: ID.activities[8]!, user_id: DEMO_USER_ID, entity_type: "invoice", entity_id: ID.invoices[0]!, activity_type: "invoice", subject: "Invoice paid", body: "INV-2026-001 marked as paid ($1,620).", metadata: {}, created_at: d(-7) },
    { id: ID.activities[9]!, user_id: DEMO_USER_ID, entity_type: "project", entity_id: ID.projects[3]!, activity_type: "status_change", subject: "Project completed", body: "LumenLabs landing page delivered + bonus.", metadata: {}, created_at: d(-10) },
    { id: ID.activities[10]!, user_id: DEMO_USER_ID, entity_type: "opportunity", entity_id: ID.opportunities[12]!, activity_type: "status_change", subject: "Deal won", body: "WooCommerce speed optimization accepted.", metadata: {}, created_at: d(-7) },
    { id: ID.activities[11]!, user_id: DEMO_USER_ID, entity_type: "import", entity_id: "im-1201", activity_type: "import", subject: "Imported April orders", body: "Imported 4 rows from April-2026.xlsx", metadata: {}, created_at: d(-25) },
    // Outbound lead outreach activities
    { id: ID.activities[18]!, user_id: DEMO_USER_ID, entity_type: "client", entity_id: ID.clients[8]!, activity_type: "status_change", subject: "Outreach status changed to Meeting", body: "Rachel Kim agreed to a call on Friday.", metadata: {}, created_at: d(-1) },
    { id: ID.activities[19]!, user_id: DEMO_USER_ID, entity_type: "client", entity_id: ID.clients[9]!, activity_type: "email", subject: "Cold email sent", body: "Initial outreach to James Thornton about IDX integration.", metadata: {}, created_at: d(-15) },
    { id: ID.activities[20]!, user_id: DEMO_USER_ID, entity_type: "client", entity_id: ID.clients[9]!, activity_type: "follow_up", subject: "Follow-up #2 sent", body: "Second follow-up with case study attached.", metadata: {}, created_at: d(-7) },
    { id: ID.activities[21]!, user_id: DEMO_USER_ID, entity_type: "client", entity_id: ID.clients[10]!, activity_type: "email", subject: "Cold email sent", body: "Initial outreach to Priya Sharma about portfolio optimization.", metadata: {}, created_at: d(-4) },
    { id: ID.activities[22]!, user_id: DEMO_USER_ID, entity_type: "client", entity_id: ID.clients[11]!, activity_type: "status_change", subject: "Outreach status changed to Replied", body: "Marcus Weber asked for pricing details.", metadata: {}, created_at: d(-7) },
    { id: ID.activities[23]!, user_id: DEMO_USER_ID, entity_type: "client", entity_id: ID.clients[12]!, activity_type: "note", subject: "Website review completed", body: "Reviewed Zenith CRM pricing page — 5 unclear tiers, no ROI calculator.", metadata: {}, created_at: d(-8) },
    { id: ID.activities[24]!, user_id: DEMO_USER_ID, entity_type: "client", entity_id: ID.clients[13]!, activity_type: "status_change", subject: "Outreach status changed to Won", body: "NexGen Education signed on for course page redesign.", metadata: {}, created_at: d(-5) },
    { id: ID.activities[25]!, user_id: DEMO_USER_ID, entity_type: "client", entity_id: ID.clients[14]!, activity_type: "status_change", subject: "Outreach status changed to Lost", body: "Coastal Fitness not ready to invest in digital.", metadata: {}, created_at: d(-20) },
    // Actions attributed to other team members (metadata.actor) so the CEO
    // activity feed shows work happening across the workspace, not just the
    // owner's own actions. Deterministic ids -> merged into older demo files
    // by the loadDB migration.
    ...seededTeamActivities(),
  ];

  const follow_ups: FollowUp[] = [
    { id: ID.followups[0]!, user_id: DEMO_USER_ID, opportunity_id: ID.opportunities[0]!, client_id: ID.clients[0]!, platform: "upwork", conversation_url: "https://www.upwork.com/messages/rooms/room_1", status: "follow_up", scheduled_at: dateOnly(2), last_contact: dateOnly(-4), notes: "Awaiting reply on proposal.", created_at: d(-4), updated_at: d(-2) },
    { id: ID.followups[1]!, user_id: DEMO_USER_ID, opportunity_id: ID.opportunities[7]!, client_id: ID.clients[7]!, platform: "upwork", conversation_url: "https://www.upwork.com/messages/rooms/room_2", status: "follow_up", scheduled_at: dateOnly(1), last_contact: dateOnly(-1), notes: "Follow up sent, no answer yet.", created_at: d(-3), updated_at: d(-1) },
    { id: ID.followups[2]!, user_id: DEMO_USER_ID, opportunity_id: ID.opportunities[6]!, client_id: ID.clients[6]!, platform: "fiverr", conversation_url: "https://www.fiverr.com/inbox/conversation/90112", status: "pending", scheduled_at: dateOnly(5), last_contact: dateOnly(-2), notes: "", created_at: d(-2), updated_at: d(-2) },
    { id: ID.followups[3]!, user_id: DEMO_USER_ID, opportunity_id: ID.opportunities[2]!, client_id: ID.clients[2]!, platform: "fiverr", conversation_url: "https://www.fiverr.com/inbox/conversation/77420", status: "pending", scheduled_at: dateOnly(1), last_contact: dateOnly(-1), notes: "Finalize scope today.", created_at: d(-8), updated_at: d(-1) },
    { id: ID.followups[4]!, user_id: DEMO_USER_ID, opportunity_id: null, client_id: null, platform: "fiverr", conversation_url: "https://www.fiverr.com/inbox/conversation/55100", status: "no_response", scheduled_at: dateOnly(3), last_contact: dateOnly(-6), notes: "Cold nurture from gig inquiry.", created_at: d(-6), updated_at: d(-6) },
    { id: ID.followups[5]!, user_id: DEMO_USER_ID, opportunity_id: ID.opportunities[12]!, client_id: ID.clients[1]!, platform: "fiverr", conversation_url: "https://www.fiverr.com/inbox/conversation/81210", status: "complete", scheduled_at: null, last_contact: dateOnly(-8), notes: "Converted to project.", created_at: d(-14), updated_at: d(-8) },
  ];

  const invoices: Invoice[] = [
    { id: ID.invoices[0]!, user_id: DEMO_USER_ID, invoice_number: "INV-2026-001", client_id: ID.clients[0]!, project_id: ID.projects[2]!, issue_date: dateOnly(-12), due_date: dateOnly(-1), amount: 1620, currency: "USD", status: "paid", paid_at: dateOnly(-7), notes: "", created_at: d(-12), updated_at: d(-7) },
    { id: ID.invoices[1]!, user_id: DEMO_USER_ID, invoice_number: "INV-2026-002", client_id: ID.clients[2]!, project_id: ID.projects[3]!, issue_date: dateOnly(-14), due_date: dateOnly(0), amount: 650, currency: "USD", status: "pending", paid_at: null, notes: "Includes $50 bonus.", created_at: d(-14), updated_at: d(-14) },
    { id: ID.invoices[2]!, user_id: DEMO_USER_ID, invoice_number: "INV-2026-003", client_id: ID.clients[4]!, project_id: ID.projects[1]!, issue_date: dateOnly(-2), due_date: dateOnly(11), amount: 480, currency: "USD", status: "pending", paid_at: null, notes: "First milestone invoice.", created_at: d(-2), updated_at: d(-2) },
    { id: ID.invoices[3]!, user_id: DEMO_USER_ID, invoice_number: "INV-2026-004", client_id: ID.clients[3]!, project_id: ID.projects[0]!, issue_date: dateOnly(-50), due_date: dateOnly(-36), amount: 1950, currency: "USD", status: "overdue", paid_at: null, notes: "", created_at: d(-50), updated_at: d(-36) },
    { id: ID.invoices[4]!, user_id: DEMO_USER_ID, invoice_number: "INV-2026-005", client_id: ID.clients[1]!, project_id: ID.projects[6]!, issue_date: dateOnly(-24), due_date: dateOnly(-10), amount: 760, currency: "USD", status: "paid", paid_at: dateOnly(-12), notes: "", created_at: d(-24), updated_at: d(-12) },
    { id: ID.invoices[5]!, user_id: DEMO_USER_ID, invoice_number: "INV-2026-006", client_id: ID.clients[6]!, project_id: ID.projects[5]!, issue_date: dateOnly(0), due_date: dateOnly(14), amount: 880, currency: "USD", status: "draft", paid_at: null, notes: "Ready to send after approval.", created_at: d(0), updated_at: d(0) },
    { id: ID.invoices[6]!, user_id: DEMO_USER_ID, invoice_number: "INV-2026-007", client_id: ID.clients[0]!, project_id: ID.projects[8]!, issue_date: dateOnly(-54), due_date: dateOnly(-40), amount: 540, currency: "USD", status: "paid", paid_at: dateOnly(-42), notes: "", created_at: d(-54), updated_at: d(-42) },
  ];

  const allInvoices = [...invoices, ...generatedInvoices()];

  const invoice_items: InvoiceItem[] = [
    { id: ID.items[0]!, invoice_id: ID.invoices[0]!, description: "WordPress migration (fixed price)", quantity: 1, unit_price: 1620, amount: 1620 },
    { id: ID.items[1]!, invoice_id: ID.invoices[1]!, description: "SaaS landing page", quantity: 1, unit_price: 600, amount: 600 },
    { id: ID.items[2]!, invoice_id: ID.invoices[1]!, description: "Fast delivery bonus", quantity: 1, unit_price: 50, amount: 50 },
    { id: ID.items[3]!, invoice_id: ID.invoices[2]!, description: "Milestone 1 - API integration", quantity: 1, unit_price: 480, amount: 480 },
    { id: ID.items[4]!, invoice_id: ID.invoices[3]!, description: "MVP - initial build phase", quantity: 1, unit_price: 1950, amount: 1950 },
    { id: ID.items[5]!, invoice_id: ID.invoices[4]!, description: "Shopify rebuild", quantity: 1, unit_price: 760, amount: 760 },
  ];

  const allInvoiceItems = [...invoice_items, ...generatedInvoiceItems()];

  const attachments: Attachment[] = [
    { id: ID.attachments[0]!, user_id: DEMO_USER_ID, entity_type: "client", entity_id: ID.clients[3]!, file_name: "delta-brief.pdf", file_path: `${DEMO_USER_ID}/client/${ID.clients[3]}/delta-brief.pdf`, file_size: 482000, mime_type: "application/pdf", created_at: d(-19) },
  ];

  const email_templates: EmailTemplate[] = [
    { id: ID.templates[0]!, user_id: DEMO_USER_ID, name: "Initial Proposal Follow-Up", category: "follow_up", subject: "Quick follow-up on {{project_name}}", body: "Hi {{client_name}},\n\nI wanted to follow up on my proposal for {{project_name}}. Have you had a chance to review it? I'm happy to answer any questions or adjust scope.\n\nBest regards,\n{{your_name}}", is_default: true, created_at: d(-100), updated_at: d(-100) },
    { id: ID.templates[1]!, user_id: DEMO_USER_ID, name: "Pre-Sales Nurture (Fiverr)", category: "nurture", subject: "Ideas for {{project_name}}", body: "Hi {{client_name}},\n\nWhile you're deciding, I put together a few ideas for {{project_name}} that could help you hit your goals faster.\n\nBest,\n{{your_name}}", is_default: false, created_at: d(-90), updated_at: d(-90) },
    { id: ID.templates[2]!, user_id: DEMO_USER_ID, name: "Delivery Handover", category: "delivery", subject: "{{project_name}} is ready!", body: "Hi {{client_name}},\n\n{{project_name}} is complete. You can review it here: {{website_link}}. Let me know if you need any tweaks.\n\nBest,\n{{your_name}}", is_default: false, created_at: d(-80), updated_at: d(-80) },
    { id: ID.templates[3]!, user_id: DEMO_USER_ID, name: "Invoice Reminder", category: "billing", subject: "Friendly reminder about invoice {{invoice_number}}", body: "Hi {{client_name}},\n\nJust a friendly reminder that invoice {{invoice_number}} for {{amount}} is due on {{due_date}}. Let me know if you have any questions.\n\nBest,\n{{your_name}}", is_default: false, created_at: d(-60), updated_at: d(-60) },
    // Cold Email Templates — Outbound Campaign
    {
      id: ID.templates[4]!, user_id: DEMO_USER_ID,
      name: "Cold Email – eCommerce",
      category: "Cold Email – eCommerce",
      subject: "Quick idea for {{company}}'s online store",
      body: "Hi {{first_name}},\n\nI was browsing {{website}} and noticed a few things that could be slowing down your store's conversion rate — especially on mobile.\n\n{{main_problem}}\n\nWe've helped similar {{country}} eCommerce brands fix these exact issues and typically see a 15-30% uplift in mobile conversions within the first month.\n\nWould you be open to a quick 10-minute call this week to walk through what we found?\n\nBest,\n{{your_name}}",
      is_default: false, created_at: d(-5), updated_at: d(-5),
    },
    {
      id: ID.templates[5]!, user_id: DEMO_USER_ID,
      name: "Cold Email – Real Estate",
      category: "Cold Email – Real Estate",
      subject: "Your website might be costing you listings, {{first_name}}",
      body: "Hi {{first_name}},\n\nI came across {{company}} while researching top real estate firms in {{country}}. Your portfolio is impressive, but I noticed a few things on {{website}} that could be turning away potential sellers before they even reach out.\n\n{{main_problem}}\n\nWe specialize in building high-converting property listing pages and IDX integrations for real estate agencies. Our clients typically see 2x more inbound leads within 60 days.\n\nI'd love to show you exactly what we'd change. Can we schedule a quick walkthrough?\n\nCheers,\n{{your_name}}",
      is_default: false, created_at: d(-4), updated_at: d(-4),
    },
    {
      id: ID.templates[6]!, user_id: DEMO_USER_ID,
      name: "Cold Email – Agency",
      category: "Cold Email – Agency",
      subject: "A few thoughts for {{company}}'s website",
      body: "Hi {{first_name}},\n\nI checked out {{website}} and was curious — have you considered how your site is performing from a speed and UX perspective?\n\n{{main_problem}}\n\nI run a web development agency that works with agencies across {{country}}. We recently helped a similar firm improve their site speed from 6s to under 2s, which directly led to a 40% increase in inbound client inquiries.\n\nI put together a quick audit — happy to share it if you're interested.\n\nBest,\n{{your_name}}",
      is_default: false, created_at: d(-3), updated_at: d(-3),
    },
  ];

  const automation_rules: AutomationRule[] = [
    { id: ID.automations[0]!, user_id: DEMO_USER_ID, name: "Deal active -> create project", trigger_event: "opportunity.stage_changed", trigger_value: "active", action_type: "create_project", action_data: { project_name_template: "{{opportunity.title}}" }, is_active: true, created_at: d(-50), updated_at: d(-50) },
    { id: ID.automations[1]!, user_id: DEMO_USER_ID, name: "Won deal -> log activity", trigger_event: "opportunity.stage_changed", trigger_value: "won", action_type: "log_activity", action_data: { subject: "Deal won", body: "Opportunity moved to won automatically." }, is_active: true, created_at: d(-50), updated_at: d(-50) },
    { id: ID.automations[2]!, user_id: DEMO_USER_ID, name: "New project -> default milestones", trigger_event: "project.created", trigger_value: null, action_type: "create_milestones", action_data: { titles: ["Requirements", "Build", "Review", "Handover"] }, is_active: false, created_at: d(-40), updated_at: d(-40) },
  ];

  const import_runs: ImportRun[] = [
    { id: ID.imports[0]!, user_id: DEMO_USER_ID, entity_type: "projects", file_name: "May-2026.xlsx", total_rows: 4, imported_rows: 4, failed_rows: 0, log: [], created_at: d(-12) },
    { id: ID.imports[1]!, user_id: DEMO_USER_ID, entity_type: "opportunities", file_name: "bids-upwork-2026.csv", total_rows: 30, imported_rows: 28, failed_rows: 2, log: [{ row: 17, error: "Missing title" }, { row: 23, error: "Invalid stage" }], created_at: d(-26) },
  ];

  return {
    demo_version: DEMO_DB_VERSION,
    profile,
    users,
    team_members,
    accounts,
    clients,
    opportunities: allOpportunities,
    projects: allProjects,
    milestones: allMilestones,
    project_todos,
    project_credentials,
    project_team_members: allProjectTeam,
    time_entries: allTimeEntries,
    activities,
    follow_ups,
    invoices: allInvoices,
    invoice_items: allInvoiceItems,
    attachments,
    email_templates,
    automation_rules,
    import_runs,
  };
}
