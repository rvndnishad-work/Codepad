import type { ComponentType, CSSProperties, SVGProps } from "react";
import {
  SiReact,
  SiNodedotjs,
  SiNextdotjs,
  SiJavascript,
  SiTypescript,
  SiAngular,
  SiVuedotjs,
  SiPython,
} from "react-icons/si";
import { Braces, Boxes, Database, Network, PanelsTopLeft, Sparkles, FileQuestion } from "lucide-react";

type IconFn = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;

/** Brand logo (or a plain icon for topics without one) and the colour it is drawn in. */
const TOPIC_LOGOS: Record<string, { Icon: IconFn; color: string }> = {
  reactjs: { Icon: SiReact, color: "#61dafb" },
  nextjs: { Icon: SiNextdotjs, color: "rgb(var(--c-fg))" },
  angular: { Icon: SiAngular, color: "#dd0031" },
  vuejs: { Icon: SiVuedotjs, color: "#42b883" },
  "machine-coding": { Icon: PanelsTopLeft, color: "rgb(var(--c-accent-2))" },
  javascript: { Icon: SiJavascript, color: "#f7df1e" },
  typescript: { Icon: SiTypescript, color: "#3178c6" },
  python: { Icon: SiPython, color: "#3776ab" },
  sql: { Icon: Database, color: "#38bdf8" },
  "javascript-coding": { Icon: Braces, color: "#f7df1e" },
  dsa: { Icon: Network, color: "#c084fc" },
  nodejs: { Icon: SiNodedotjs, color: "#5fa04e" },
  "system-design": { Icon: Boxes, color: "#fb923c" },
  "ai-engineering": { Icon: Sparkles, color: "#f472b6" },
};

const FALLBACK = { Icon: FileQuestion as IconFn, color: "rgb(var(--c-subtle))" };

export function topicColor(slug: string | null | undefined): string {
  return (slug && TOPIC_LOGOS[slug]?.color) || FALLBACK.color;
}

export function TopicLogo({ slug, size = 20, className }: { slug: string | null | undefined; size?: number; className?: string }) {
  const { Icon, color } = (slug && TOPIC_LOGOS[slug]) || FALLBACK;
  return <Icon width={size} height={size} aria-hidden className={className} style={{ color, flexShrink: 0 }} />;
}

/** Small hash so each card starts its backdrop animation at a different point. */
function loopOffset(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return `-${(h % 140) / 10}s`;
}

/** Topic logo on its tinted, slowly morphing backdrop (see interview-questions.css). */
export function TopicLogoBlob({ slug, size }: { slug: string; size: number }) {
  const color = topicColor(slug);
  const delay: CSSProperties = { animationDelay: loopOffset(slug) };
  return (
    <span
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size, color }}
      aria-hidden
    >
      <span className="iq-blob" style={{ ...delay, background: color }} />
      <span className="iq-ring" style={delay} />
      <TopicLogo slug={slug} size={Math.round(size / 2)} className="iq-logo" />
    </span>
  );
}
