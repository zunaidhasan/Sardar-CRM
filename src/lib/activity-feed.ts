import type {
  ActivityWithActor,
  Client,
  EntityType,
  Invoice,
  Opportunity,
  Project,
} from "@/lib/types";

// Compact shape the dashboard activity feed renders. Enrichment happens on the
// server so the client bundle only receives labels + hrefs, not entity rows.
export interface ActivityFeedItem {
  id: string;
  activityType: ActivityWithActor["activity_type"];
  // The linked entity kind — drives the feed's filter chips
  // (All / Deals / Projects / Clients).
  entityType: EntityType;
  subject: string | null;
  body: string | null;
  createdAt: string;
  entityLabel: string | null;
  href: string | null;
  // Who performed the action. Null = the signed-in viewer (or unknown), in
  // which case the feed falls back to the viewer's own avatar.
  actorName: string | null;
}

// Read the actor name an activity is attributed to: either an explicitly
// resolved actor_name (team-wide feeds) or the metadata.actor demo seed.
// Returns null when the activity is (or looks like) the viewer's own.
export function activityActorName(a: ActivityWithActor): string | null {
  const actor =
    a.actor_name ??
    (typeof a.metadata?.actor === "string" ? a.metadata.actor : null);
  return actor && actor.trim() ? actor.trim() : null;
}

interface FeedEntities {
  projects: Project[];
  opportunities: Opportunity[];
  clients: Client[];
  invoices: Invoice[];
}

/**
 * Resolve each activity's linked entity (deal, project, client, invoice, ...)
 * to a display label and a deep link. Activities without a resolvable entity
 * still appear in the feed, just without a link. The caller's list is already
 * sorted newest-first (fetchActivities orders by created_at desc).
 */
export function buildActivityFeed(
  activities: ActivityWithActor[],
  entities: FeedEntities,
): ActivityFeedItem[] {
  const projectById = new Map(entities.projects.map((p) => [p.id, p]));
  const oppById = new Map(entities.opportunities.map((o) => [o.id, o]));
  const clientById = new Map(entities.clients.map((c) => [c.id, c]));
  const invoiceById = new Map(entities.invoices.map((i) => [i.id, i]));

  return activities.map((a) => {
    let entityLabel: string | null = null;
    let href: string | null = null;

    switch (a.entity_type) {
      case "project": {
        const p = projectById.get(a.entity_id);
        entityLabel = p?.project_name ?? null;
        href = p ? `/projects/${p.id}` : null;
        break;
      }
      case "opportunity": {
        const o = oppById.get(a.entity_id);
        entityLabel = o?.title ?? null;
        href = o ? `/pipeline?deal=${o.id}` : null;
        break;
      }
      case "client": {
        const c = clientById.get(a.entity_id);
        entityLabel = c?.name ?? null;
        href = c ? `/clients/${c.id}` : null;
        break;
      }
      case "invoice": {
        const inv = invoiceById.get(a.entity_id);
        entityLabel = inv?.invoice_number ?? null;
        href = "/invoices";
        break;
      }
      case "import":
        entityLabel = "Import";
        href = "/import";
        break;
    }

    const actorName = activityActorName(a);

    return {
      id: a.id,
      activityType: a.activity_type,
      entityType: a.entity_type,
      subject: a.subject,
      body: a.body,
      createdAt: a.created_at,
      entityLabel,
      href,
      actorName,
    };
  });
}
