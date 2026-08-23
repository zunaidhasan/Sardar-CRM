// ---------------------------------------------------------------------------
// Lightweight i18n for Sardar CRM.
//
// The dictionary maps English source strings to Bengali (বাংলা). Keys are the
// exact English strings used in the UI, so any component can translate with a
// single `t("...")` call and unknown strings fall back to English safely.
// This keeps the system dependency-free and safe to use from both server and
// client modules.
// ---------------------------------------------------------------------------

export type Locale = "en" | "bn";

export const LOCALES: Locale[] = ["en", "bn"];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  bn: "বাংলা",
};

// Shared with the pre-paint script in app/layout.tsx so the <html lang>
// attribute matches the saved language on first paint.
export const I18N_STORAGE_KEY = "sardar-locale";

// Server-side mirror of the choice: the root layout reads this cookie to
// render in the saved language, keeping server HTML and client hydration in
// sync (no English flash, no hydration mismatch).
export const I18N_COOKIE_NAME = "sardar-locale";

const BN: Record<string, string> = {
  // Navigation
  Dashboard: "ড্যাশবোর্ড",
  Pipeline: "পাইপলাইন",
  "Clients & Contacts": "ক্লায়েন্ট ও পরিচিতি",
  Clients: "ক্লায়েন্ট",
  "Projects & Orders": "প্রজেক্ট ও অর্ডার",
  Invoices: "ইনভয়েস",
  "Proposals (AI)": "প্রস্তাবনা (AI)",
  Analytics: "অ্যানালিটিক্স",
  "Import Sheets": "শিট ইমপোর্ট",
  "Email Templates": "ইমেইল টেমপ্লেট",
  Automations: "অটোমেশন",
  Settings: "সেটিংস",
  Calendar: "ক্যালেন্ডার",
  Main: "প্রধান",
  Manage: "ব্যবস্থাপনা",
  "Sign out": "সাইন আউট",
  "Signing out…": "সাইন আউট হচ্ছে…",
  "One team, One dream": "এক দল, এক স্বপ্ন",
  "Demo mode active. Add Supabase env vars to go live.":
    "ডেমো মোড চালু আছে। লাইভ করতে Supabase এনভায়ারনমেন্ট ভেরিয়েবল যোগ করুন।",
  Executive: "এক্সিকিউটিভ",
  Developer: "ডেভেলপার",
  Designer: "ডিজাইনার",

  // Page headers
  "Invoicing Hub": "ইনভয়েস হাব",
  "Deal Pipeline": "ডিল পাইপলাইন",
  "AI Proposal Generator": "AI প্রস্তাবনা জেনারেটর",
  Import: "ইমপোর্ট",
  "Company overview": "কোম্পানির সারসংক্ষেপ",
  "My workspace": "আমার ওয়ার্কস্পেস",
  "Welcome back": "ফিরে আসায় স্বাগতম",
  "Revenue, win rates and performance across platforms, sellers and team.":
    "প্ল্যাটফর্ম, সেলার ও টিম জুড়ে রাজস্ব, জয়ের হার এবং পারফরম্যান্স।",
  "Save time by automating pipeline busywork. Rules fire live when a deal changes stage.":
    "পাইপলাইনের রুটিন কাজ অটোমেট করে সময় বাঁচান। কোনো ডিল স্টেজ বদলালে নিয়মগুলো সাথে সাথে কাজ করে।",
  "Bring your existing Google Sheets data into Sardar CRM.":
    "আপনার বিদ্যমান Google Sheets ডেটা Sardar CRM-এ নিয়ে আসুন।",
  "Create invoices from projects, track paid, pending and overdue. Click any invoice to open its full order invoice.":
    "প্রজেক্ট থেকে ইনভয়েস তৈরি করুন, পেইড, পেন্ডিং ও ওভারডিউ ট্র্যাক করুন। পূর্ণ ইনভয়েস খুলতে যেকোনো ইনভয়েসে ক্লিক করুন।",
  "Track Upwork bids and Fiverr pre-sales from lead to won. Drag cards to update stages.":
    "লিড থেকে জয় পর্যন্ত Upwork বিড ও Fiverr প্রি-সেল ট্র্যাক করুন। স্টেজ আপডেট করতে কার্ড টেনে আনুন।",
  "Your monthly order tracking — deadlines, fees, developers and milestones.":
    "আপনার মাসিক অর্ডার ট্র্যাকিং — ডেডলাইন, ফি, ডেভেলপার ও মাইলস্টোন।",
  "Generate personalized Upwork bids and Fiverr quotes in seconds.":
    "সেকেন্ডে ব্যক্তিগতকৃত Upwork বিড ও Fiverr কোট তৈরি করুন।",
  "Profile, seller accounts and workspace configuration.":
    "প্রোফাইল, সেলার অ্যাকাউন্ট এবং ওয়ার্কস্পেস কনফিগারেশন।",
  "Reusable follow-up, nurture and delivery messages for your clients.":
    "ক্লায়েন্টদের জন্য পুনঃব্যবহারযোগ্য ফলো-আপ, নার্চার ও ডেলিভারি বার্তা।",
  "Agency-wide view of revenue, pipeline, and team performance across Fiverr & Upwork.":
    "Fiverr ও Upwork জুড়ে রাজস্ব, পাইপলাইন এবং টিম পারফরম্যান্সের সামগ্রিক ভিউ।",
  "Deals, projects, and follow-ups assigned to you.":
    "আপনাকে দেওয়া ডিল, প্রজেক্ট ও ফলো-আপ।",
  "Your deadlines, follow-ups, milestones and tracked hours at a glance. Export any month to Google Calendar or Outlook.":
    "এক নজরে আপনার ডেডলাইন, ফলো-আপ, মাইলস্টোন ও রেকর্ড করা সময়। যেকোনো মাস Google Calendar বা Outlook-এ এক্সপোর্ট করুন।",

  // Kanban stages
  Lead: "লিড",
  Negotiation: "আলোচনা",
  Active: "সক্রিয়",
  Won: "জিতেছে",
  Lost: "হেরেছে",

  // Project statuses
  WIP: "চলমান",
  Submitted: "জমা দেওয়া",
  Revision: "রিভিশন",
  Delivered: "ডেলিভারি হয়েছে",
  Complete: "সম্পন্ন",
  Cancelled: "বাতিল",
  "Client Update": "ক্লায়েন্ট আপডেট",

  // Invoice statuses
  Draft: "খসড়া",
  Pending: "পেন্ডিং",
  Paid: "পেইড",
  Overdue: "ওভারডিউ",

  // Bid statuses
  "No Response": "কোনো উত্তর নেই",
  "Only Viewed": "শুধু দেখা",
  Response: "উত্তর",
  Interview: "ইন্টারভিউ",
  Hired: "নিয়োগ",
  Rejected: "প্রত্যাখ্যাত",

  // Follow-up statuses
  "Follow Up": "ফলো আপ",
  Accepted: "গৃহীত",
  Archived: "আর্কাইভ করা",

  // Milestone statuses
  "In Progress": "চলমান",
  Done: "সম্পন্ন",

  // Priorities
  Low: "কম",
  Medium: "মাঝারি",
  High: "উচ্চ",
  Urgent: "জরুরি",

  // Platforms
  Direct: "সরাসরি",
  Unknown: "অজানা",

  // Common actions
  Add: "যোগ করুন",
  Save: "সংরক্ষণ করুন",
  Cancel: "বাতিল করুন",
  Edit: "সম্পাদনা",
  Delete: "মুছুন",
  Search: "খুঁজুন",
  Export: "এক্সপোর্ট",
  "New order": "নতুন অর্ডার",
  "New client": "নতুন ক্লায়েন্ট",
  Generate: "তৈরি করুন",
  "Generate proposal": "প্রস্তাবনা তৈরি করুন",
  Today: "আজ",
  Previous: "আগের",
  Next: "পরের",
  "View all": "সব দেখুন",
  Yes: "হ্যাঁ",
  No: "না",

  // Dashboard
  "Total Revenue": "মোট রাজস্ব",
  "Active Pipeline": "সক্রিয় পাইপলাইন",
  "Pending Invoices": "পেন্ডিং ইনভয়েস",
  "Win Rate": "জয়ের হার",
  "Recent activity": "সাম্প্রতিক কার্যক্রম",
  "Upcoming follow-ups": "আসন্ন ফলো-আপ",
  "Team performance": "টিম পারফরম্যান্স",
  "Quick actions": "দ্রুত অ্যাকশন",
  "My Pipeline": "আমার পাইপলাইন",
  "Active Projects": "সক্রিয় প্রজেক্ট",
  "My Revenue": "আমার রাজস্ব",
  "My Win Rate": "আমার জয়ের হার",
  "My deals": "আমার ডিল",
  "My projects": "আমার প্রজেক্ট",
  "Add deal": "ডিল যোগ করুন",
  "AI Proposal": "AI প্রস্তাবনা",
  "Add a deal / bid": "ডিল / বিড যোগ করুন",
  "New project / order": "নতুন প্রজেক্ট / অর্ডার",
  "Add client": "ক্লায়েন্ট যোগ করুন",
  "View pipeline": "পাইপলাইন দেখুন",

  // Time tracking
  "Time tracking": "সময় ট্র্যাকিং",
  "Log time": "সময় রেকর্ড করুন",
  Hours: "ঘণ্টা",
  "Total hours": "মোট ঘণ্টা",
  Billable: "বিলযোগ্য",
  "Non-billable": "বিলযোগ্য নয়",
  "This week": "এই সপ্তাহে",
  "No time logged yet": "এখনো কোনো সময় রেকর্ড করা হয়নি",
  Description: "বিবরণ",
  Assignee: "দায়িত্বপ্রাপ্ত",
  Date: "তারিখ",
  "Logged time": "রেকর্ড করা সময়",

  // Calendar
  "Export ICS": "ICS এক্সপোর্ট",
  Deadlines: "ডেডলাইন",
  "Follow-ups": "ফলো-আপ",
  Milestones: "মাইলস্টোন",
  "Time logged": "রেকর্ড করা সময়",
  "Hours must be between 0 and 24": "ঘণ্টা অবশ্যই ০ থেকে ২৪-এর মধ্যে হতে হবে",
  "Time entry": "সময় এন্ট্রি",
  "Entry updated": "এন্ট্রি আপডেট হয়েছে",
  "Delete this time entry?": "এই সময় এন্ট্রিটি মুছবেন?",
  "Task, e.g. Stripe webhooks": "কাজ, যেমন: Stripe ওয়েবহুক",
  "No events on this day": "এই দিনে কোনো ইভেন্ট নেই",
  "Next follow-up": "পরবর্তী ফলো-আপ",
  "Invoice due": "ইনভয়েস বাকি",

  // Misc UI
  "No deals": "কোনো ডিল নেই",
  "Drop here": "এখানে ছাড়ুন",
  "Install app": "অ্যাপ ইনস্টল করুন",
  Language: "ভাষা",

  // Outbound leads
  "Outbound Leads": "আউটবাউন্ড লিড",
  "Lead Score": "লিড স্কোর",
  "Outreach Status": "আউটরিচ স্ট্যাটাস",
  Country: "দেশ",
  Industry: "শিল্প",
  Website: "ওয়েবসাইট",
  Source: "উৎস",
  "Email Verified": "ইমেইল যাচাইকৃত",
  "Main Problem": "প্রধান সমস্যা",
  "Website Review Notes": "ওয়েবসাইট পর্যালোচনা নোট",
  "LinkedIn URL": "LinkedIn লিংক",
  "Owner": "দায়িত্বপ্রাপ্ত",
  "Next Follow-up": "পরবর্তী ফলো-আপ",
  "Follow-up Count": "ফলো-আপ গণনা",
  "Mark Follow-up Sent": "ফলো-আপ পাঠানো হয়েছে চিহ্নিত করুন",
  "Website Review": "ওয়েবসাইট পর্যালোচনা",
  "Outreach Timeline": "আউটরিচ টাইমলাইন",
  "Last Email Sent": "শেষ ইমেইল পাঠানো হয়েছে",
  Contacted: "যোগাযোগ করা হয়েছে",
  Replied: "উত্তর দেওয়া হয়েছে",
  "Add outbound lead": "আউটবাউন্ড লিড যোগ করুন",
  "Outbound lead details": "আউটবাউন্ড লিড বিবরণ",
  "Due today": "আজ বাকি",
  "Follow-up overdue": "ফলো-আপ বিলম্বিত",

  // Outbound leads — Kanban & Views
  "Table View": "টেবিল ভিউ",
  "Kanban View": "কানবান ভিউ",
  "Report View": "রিপোর্ট ভিউ",
  "Select view": "ভিউ নির্বাচন করুন",
  "No leads in this status": "এই স্ট্যাটাসে কোনো লিড নেই",
  "Drag to change status": "স্ট্যাটাস পরিবর্তন করতে টেনে আনুন",

  // Outbound leads — Filters & Search
  Filters: "ফিল্টার",
  "All statuses": "সব স্ট্যাটাস",
  "All scores": "সব স্কোর",
  "All countries": "সব দেশ",
  "All industries": "সব শিল্প",
  "All sources": "সব উৎস",
  "All owners": "সব দায়িত্বপ্রাপ্ত",
  Unassigned: "অনির্ধারিত",
  "Clear filters": "ফিল্টার মুছুন",
  "active filters": "সক্রিয় ফিল্টার",
  "No leads found": "কোনো লিড পাওয়া যায়নি",
  "Try adjusting your filters": "আপনার ফিল্টার সামঞ্জস্য করে দেখুন",

  // Outbound leads — Bulk Actions
  "Bulk Actions": "বাল্ক অ্যাকশন",
  "selected leads": "নির্বাচিত লিড",
  "Change Status": "স্ট্যাটাস পরিবর্তন করুন",
  "Change Score": "স্কোর পরিবর্তন করুন",
  "Assign Owner": "দায়িত্বপ্রাপ্ত নির্ধারণ করুন",
  "Set Follow-up Date": "ফলো-আপ তারিখ নির্ধারণ করুন",
  "Auto-score (AI)": "অটো-স্কোর (AI)",

  // Outbound leads — Quick Actions
  "Quick Actions": "দ্রুত অ্যাকশন",
  "Copy Email": "ইমেইল কপি করুন",
  "Send Email": "ইমেইল পাঠান",
  "Email copied to clipboard": "ইমেইল ক্লিপবোর্ডে কপি হয়েছে",
  "Email sent successfully": "ইমেইল সফলভাবে পাঠানো হয়েছে",
  "Failed to send email": "ইমেইল পাঠাতে ব্যর্থ",

  // Outbound leads — Website Review
  "Save Review": "পর্যালোচনা সংরক্ষণ করুন",
  "Problem Found": "সমস্যা পাওয়া গেছে",
  "Detailed Notes": "বিস্তারিত নোট",
  "Review saved": "পর্যালোচনা সংরক্ষিত হয়েছে",

  // Outbound leads — Email Preview
  "Email Preview": "ইমেইল প্রিভিউ",
  "Light Mode": "লাইট মোড",
  "Dark Mode": "ডার্ক মোড",
  "Select template": "টেমপ্লেট নির্বাচন করুন",
  "Personalized email preview": "ব্যক্তিগতকৃত ইমেইল প্রিভিউ",

  // Outbound leads — Duplicate Detection
  "Duplicate detected": "ডুপ্লিকেট পাওয়া গেছে",
  "This lead already exists": "এই লিড ইতিমধ্যে বিদ্যমান",
  "Continue anyway?": "তবুও চালিয়ে যেতে চান?",
  "Skip duplicate": "ডুপ্লিকেট এড়িয়ে চলুন",

  // Outbound leads — Export
  "Export to CSV": "CSV-তে এক্সপোর্ট করুন",
  "Export filtered leads": "ফিল্টার করা লিড এক্সপোর্ট করুন",
  "leads exported": "লিড এক্সপোর্ট হয়েছে",

  // Outbound leads — Keyboard Shortcuts
  "Keyboard Shortcuts": "কীবোর্ড শর্টকাট",
  "Press ? for help": "সাহায্যের জন্য ? চাপুন",
  "Status": "স্ট্যাটাস",
  Score: "স্কোর",
  "Change lead status": "লিডের স্ট্যাটাস পরিবর্তন করুন",
  "Set lead score": "লিডের স্কোর নির্ধারণ করুন",
  "Open follow-up dialog": "ফলো-আপ ডায়ালগ খুলুন",
  "Open review dialog": "পর্যালোচনা ডায়ালগ খুলুন",
  "Copy email": "ইমেইল কপি করুন",
  "Send email": "ইমেইল পাঠান",
  "Clear selection": "নির্বাচন মুছুন",

  // Outbound leads — Pipeline & Reporting
  "Conversion Funnel": "রূপান্তর ফানেল",
  "Email Performance": "ইমেইল পারফরম্যান্স",
  "Emails sent": "পাঠানো ইমেইল",
  "Open rate": "খোলার হার",
  "Click rate": "ক্লিকের হার",
  "Total opens": "মোট খোলা",
  "Total clicks": "মোট ক্লিক",
  "Leads by Source": "উৎস অনুযায়ী লিড",
  "Leads by Industry": "শিল্প অনুযায়ী লিড",
  "Leads by Country": "দেশ অনুযায়ী লিড",
  "Score Distribution": "স্কোর বিতরণ",
  "Detailed Status Breakdown": "বিস্তারিত স্ট্যাটাস বিশ্লেষণ",
  "Source Attribution": "উৎস নির্ধারণ",
  "Avg. Score": "গড় স্কোর",
  "% of Total": "মোটের %",

  // Outbound leads — ROI Calculator
  "ROI Calculator": "ROI ক্যালকুলেটর",
  "Leads / Month": "লিড / মাস",
  "Avg Deal Value": "গড় ডিল মূল্য",
  "Conversion Rate": "রূপান্তর হার",
  "Hours/Week (Manual)": "ঘণ্টা/সপ্তাহ (ম্যানুয়াল)",
  "Hourly Rate": "ঘণ্টার হার",
  "Annual Time Savings": "বার্ষিক সময় সাশ্রয়",
  "Hours Saved / Year": "সাশ্রয় ঘণ্টা / বছর",
  "Projected Revenue": "প্রকল্পিত রাজস্ব",
  "Monthly Breakdown": "মাসিক বিশ্লেষণ",
  "Expected deals": "প্রত্যাশিত ডিল",
  "Manual hours": "ম্যানুয়াল ঘণ্টা",
  "With CRM": "CRM সহ",
  "Manual cost": "ম্যানোয়াল খরচ",
  "CRM cost": "CRM খরচ",
  "Net savings": "নিট সাশ্রয়",

  // Outbound leads — Activity Timeline
  "Activity Timeline": "কার্যক্রম টাইমলাইন",
  "Last 3 activities": "শেষ ৩টি কার্যক্রম",
  "View more": "আরও দেখুন",
  Opens: "খোলা",
  Clicks: "ক্লিক",

  // Outbound leads — Score Breakdown
  "Score Breakdown": "স্কোর বিশ্লেষণ",
  "Has website": "ওয়েবসাইট আছে",
  "Has email": "ইমেইল আছে",
  "Email verified": "ইমেইল যাচাইকৃত",
  "Has LinkedIn": "LinkedIn আছে",
  "Problem identified": "সমস্যা সনাক্তকৃত",
  "Engaged (replied)": "সম্পৃক্ত (উত্তর দিয়েছে)",
  "Follow-ups sent": "ফলো-আপ পাঠানো হয়েছে",
  "Auto Score": "অটো স্কোর",

  // Outbound leads — Tags
  Tags: "ট্যাগ",
  "Filter by tag": "ট্যাগ দ্বারা ফিল্টার",
  "No tags": "কোনো ট্যাগ নেই",
};

const DICTS: Record<Locale, Record<string, string>> = {
  en: {},
  bn: BN,
};

/** Translate an English source string. Unknown keys fall back to English. */
export function translate(locale: Locale, en: string): string {
  if (locale === "en") return en;
  return DICTS[locale][en] ?? en;
}

/** Detect the browser's preferred locale, falling back to English. */
export function detectLocale(preferred?: string | null): Locale {
  if (preferred?.toLowerCase().startsWith("bn")) return "bn";
  return "en";
}
