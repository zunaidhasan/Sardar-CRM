import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  FileUp,
  FileText,
  LayoutDashboard,
  Mail,
  Settings,
  Sparkles,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_MAIN: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Pipeline", href: "/pipeline", icon: Workflow },
  { title: "Clients", href: "/clients", icon: Users },
  { title: "Projects & Orders", href: "/projects", icon: ClipboardList },
  { title: "Invoices", href: "/invoices", icon: FileText },
  { title: "Proposals (AI)", href: "/proposals", icon: Sparkles },
  { title: "Analytics", href: "/analytics", icon: BarChart3 },
  { title: "Calendar", href: "/calendar", icon: CalendarDays },
];

export const NAV_SECONDARY: NavItem[] = [
  { title: "Import Sheets", href: "/import", icon: FileUp },
  { title: "Email Templates", href: "/templates", icon: Mail },
  { title: "Automations", href: "/automations", icon: Workflow },
  { title: "Settings", href: "/settings", icon: Settings },
];
