export type NavStatus = "visible" | "hidden" | "coming_soon";

export interface NavLinkConfig {
  href: string;
  label: string;
  status: NavStatus;
}

export const DEFAULT_NAV_LINKS: NavLinkConfig[] = [
  { href: "/", label: "Home", status: "visible" },
  { href: "/playgrounds", label: "Playgrounds", status: "visible" },
  { href: "/challenges", label: "Challenges", status: "visible" },
  { href: "/blog", label: "Blog", status: "visible" },
  { href: "/explore", label: "Explore", status: "visible" },
  { href: "/interview", label: "Interviews", status: "visible" },
];
