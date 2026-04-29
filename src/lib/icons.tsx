import type { ComponentType, SVGProps } from "react";
import {
  SiJavascript,
  SiTypescript,
  SiReact,
  SiVuedotjs,
  SiAngular,
  SiSvelte,
  SiSolid,
  SiRedux,
  SiMobx,
  SiFramer,
  SiMui,
} from "react-icons/si";

export type IconFn = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * Per-template brand logo + accent background.
 * Maps templates.ts `id` -> renderer.
 */
export const templateIcon: Record<
  string,
  { Icon: IconFn; color: string; bg: string }
> = {
  "empty-js":     { Icon: SiJavascript, color: "#f7df1e", bg: "rgba(247,223,30,0.10)" },
  "empty-ts":     { Icon: SiTypescript, color: "#3178c6", bg: "rgba(49,120,198,0.12)" },
  "empty-react":  { Icon: SiReact,      color: "#61dafb", bg: "rgba(97,218,251,0.10)" },
  javascript:     { Icon: SiJavascript, color: "#f7df1e", bg: "rgba(247,223,30,0.10)" },
  typescript:     { Icon: SiTypescript, color: "#3178c6", bg: "rgba(49,120,198,0.12)" },
  react:          { Icon: SiReact,      color: "#61dafb", bg: "rgba(97,218,251,0.10)" },
  vue:            { Icon: SiVuedotjs,   color: "#42b883", bg: "rgba(66,184,131,0.10)" },
  angular:        { Icon: SiAngular,    color: "#dd0031", bg: "rgba(221,0,49,0.10)" },
  svelte:         { Icon: SiSvelte,     color: "#ff3e00", bg: "rgba(255,62,0,0.10)" },
  solid:          { Icon: SiSolid,      color: "#2c87cb", bg: "rgba(44,135,203,0.14)" },
  "react-hooks":  { Icon: SiReact,      color: "#61dafb", bg: "rgba(97,218,251,0.10)" },
  "react-classes":{ Icon: SiReact,      color: "#61dafb", bg: "rgba(97,218,251,0.10)" },
  "redux-toolkit":{ Icon: SiRedux,      color: "#764abc", bg: "rgba(118,74,188,0.14)" },
  mobx:           { Icon: SiMobx,       color: "#ff9955", bg: "rgba(255,153,85,0.10)" },
  "framer-motion":{ Icon: SiFramer,     color: "#e535ab", bg: "rgba(229,53,171,0.10)" },
  mui:            { Icon: SiMui,        color: "#007fff", bg: "rgba(0,127,255,0.10)" },
};

export function TemplateLogo({
  id,
  size = 28,
}: {
  id: string;
  size?: number;
}) {
  const entry = templateIcon[id];
  if (!entry) return null;
  const { Icon, color } = entry;
  return <Icon width={size} height={size} style={{ color }} />;
}
