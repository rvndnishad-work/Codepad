/**
 * The Connections catalog: one card per connection with its status. Pure, so
 * the page and the tests share it. Other connections (calendar, Slack and
 * Teams) show as planned until their own work lands and fills in a status.
 */
import { relativeTime } from "@/lib/workspace/display";

export type CardState = "connected" | "attention" | "available" | "planned" | "locked" | "blocked";
export type CardGroup = "ats" | "scheduling" | "alerts" | "developers";

export type CatalogCard = {
  key: string;
  group: CardGroup;
  name: string;
  /** One letter for the tile. Null for cards without a tile. */
  tile: string | null;
  subtitle: string | null;
  state: CardState;
  chip: string | null;
  meta: string;
  action: { label: string; href: string | null; primary?: boolean } | null;
  /** A dashed note card rather than a connection. */
  note?: boolean;
};

export const GROUP_LABELS: Record<CardGroup, string> = {
  ats: "Applicant tracking",
  scheduling: "Scheduling",
  alerts: "Alerts",
  developers: "Developers",
};

export type CatalogInput = {
  slug: string;
  growth: boolean;
  canManage: boolean;
  now?: Date;
  ats: {
    provider: string;
    partner: boolean;
    setupComplete: boolean;
    imported30d: number;
    decisionsSent30d: number;
    lastSyncAt: string | null;
    needsAttention: number;
  } | null;
  webhooks: { endpoints: number; failing: number; paused: number };
  apiKeys: number;
};

/** "5 min ago", "just now", "yesterday", or "on 12 Oct". */
export function syncedWhen(iso: string, now?: Date): string {
  const r = relativeTime(iso, now);
  if (r === "Just now" || r === "Yesterday") return r.toLowerCase();
  return /ago$/.test(r) ? r : `on ${r}`;
}

const ATS_NAMES: Record<string, string> = { greenhouse: "Greenhouse", ashby: "Ashby", lever: "Lever" };
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function buildCatalog(input: CatalogInput): CatalogCard[] {
  const { slug, growth, canManage, ats } = input;
  const base = `/w/${slug}`;
  const billing = `${base}?section=billing`;
  const locked = (card: Omit<CatalogCard, "state" | "chip" | "action">): CatalogCard => ({
    ...card,
    state: "locked",
    chip: "Growth plan",
    action: { label: "See plans", href: billing },
  });

  const atsCard = (provider: "greenhouse" | "ashby" | "lever"): CatalogCard => {
    const name = ATS_NAMES[provider];
    const common = { key: provider, group: "ats" as const, name, tile: name[0], subtitle: "Import and write back" };
    if (!growth) {
      return locked({ ...common, meta: provider === "greenhouse" ? "Bring candidates in from Greenhouse and send decisions back." : "Coming later." });
    }
    if (ats && ats.provider === provider) {
      if (ats.partner && !ats.setupComplete) {
        return {
          ...common,
          state: "attention",
          chip: "Setup not finished",
          meta: "The key is created. Finish mapping jobs to screenings before Greenhouse sends anyone.",
          action: { label: "Finish setup", href: `${base}/connections/ats/setup`, primary: true },
        };
      }
      const synced = ats.lastSyncAt ? `Last sync ${syncedWhen(ats.lastSyncAt, input.now)}.` : "Nothing synced yet.";
      const attention = ats.needsAttention > 0;
      return {
        ...common,
        subtitle: ats.partner ? common.subtitle : "Signed webhook, import only",
        state: attention ? "attention" : "connected",
        chip: attention ? `${ats.needsAttention} need attention` : "Connected",
        meta: `${synced} ${plural(ats.imported30d, "candidate")} imported in 30 days, ${plural(ats.decisionsSent30d, "decision")} sent back.`,
        action: { label: attention ? "Review" : "Open", href: `${base}/connections/ats`, primary: attention },
      };
    }
    if (ats) {
      const current = ATS_NAMES[ats.provider] ?? ats.provider;
      return {
        ...common,
        state: "blocked",
        chip: provider === "greenhouse" ? null : "Coming later",
        meta: `One ATS per workspace. Disconnect ${current} to switch.`,
        action: null,
      };
    }
    if (provider === "greenhouse") {
      return {
        ...common,
        state: "available",
        chip: null,
        meta: canManage
          ? "Candidates at the stage you pick in Greenhouse get the screening you map to their job."
          : "Not connected. Ask a workspace admin to connect it.",
        action: canManage ? { label: "Connect", href: `${base}/connections/ats/setup`, primary: true } : null,
      };
    }
    return {
      ...common,
      state: "planned",
      chip: "Coming later",
      meta: `Until then, use webhooks to send results to ${name} or any other ATS.`,
      action: { label: "Set up webhooks", href: `${base}/webhooks` },
    };
  };

  const planned = (key: string, group: CardGroup, name: string, subtitle: string, meta: string): CatalogCard => ({
    key,
    group,
    name,
    tile: name[0],
    subtitle,
    state: "planned",
    chip: "Coming later",
    meta,
    action: null,
  });

  const wh = input.webhooks;
  const webhooks: CatalogCard = !growth
    ? locked({ key: "webhooks", group: "developers", name: "Webhooks", tile: null, subtitle: null, meta: "Signed events for any ATS, Zapier or your own tools." })
    : wh.failing > 0 || wh.paused > 0
      ? {
          key: "webhooks",
          group: "developers",
          name: "Webhooks",
          tile: null,
          subtitle: null,
          state: "attention",
          chip: wh.failing > 0 ? `${wh.failing} failing` : `${wh.paused} paused`,
          meta: `${plural(wh.endpoints, "endpoint")}. Open the delivery log to see what went wrong.`,
          action: { label: "Fix it", href: `${base}/webhooks`, primary: true },
        }
      : {
          key: "webhooks",
          group: "developers",
          name: "Webhooks",
          tile: null,
          subtitle: null,
          state: wh.endpoints > 0 ? "connected" : "available",
          chip: wh.endpoints > 0 ? plural(wh.endpoints, "endpoint") : null,
          meta: wh.endpoints > 0 ? "Signed events go out when screenings finish and decisions are made." : "Send signed events to any ATS, Zapier or your own tools.",
          action: { label: wh.endpoints > 0 ? "Open" : "Set up", href: `${base}/webhooks` },
        };

  const api: CatalogCard = !growth
    ? locked({ key: "api", group: "developers", name: "API and MCP", tile: null, subtitle: null, meta: "Let Claude or your scripts read results and add notes." })
    : {
        key: "api",
        group: "developers",
        name: "API and MCP",
        tile: null,
        subtitle: null,
        state: input.apiKeys > 0 ? "connected" : "available",
        chip: input.apiKeys > 0 ? plural(input.apiKeys, "key") : null,
        meta: "Let Claude or your scripts read results and add notes.",
        action: { label: "Open", href: `${base}/api-keys` },
      };

  return [
    atsCard("greenhouse"),
    atsCard("ashby"),
    atsCard("lever"),
    planned("google-calendar", "scheduling", "Google Calendar", "Each interviewer connects their own", "Will show free and busy times in the interview schedule step."),
    planned("microsoft-365", "scheduling", "Microsoft 365", "Outlook calendars", "For teams on Outlook. Will work alongside Google."),
    {
      key: "video",
      group: "scheduling",
      name: "Video calls",
      tile: null,
      subtitle: null,
      state: "planned",
      chip: null,
      meta: "The in-room video provider is being planned separately. Interviews keep using the meeting link field until then.",
      action: null,
      note: true,
    },
    planned("slack", "alerts", "Slack", "Channel posts and personal alerts", "Alerts when a take home comes in or a screening is ready for review."),
    planned("teams", "alerts", "Microsoft Teams", "Channel posts and personal alerts", "The same alerts as Slack, for teams on Teams."),
    webhooks,
    api,
  ];
}

export function countCards(cards: CatalogCard[]) {
  const real = cards.filter((c) => !c.note);
  return {
    all: real.length,
    connected: real.filter((c) => c.state === "connected" || c.state === "attention").length,
    attention: real.filter((c) => c.state === "attention").length,
  };
}
