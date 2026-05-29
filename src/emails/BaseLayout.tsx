/**
 * Shared frame for all transactional email templates (IP-24).
 *
 * Email clients (Gmail / Outlook / Apple Mail) collapse modern CSS aggressively,
 * so React Email's primitives compile to <table>-based, inline-styled HTML that
 * actually renders consistently. Keep styles inline here.
 *
 * Visual baseline matches the hand-rolled HTML this replaces:
 *   page bg #0B0F19, card bg #161B2E, border #2a344a, body #cbd5e1, heading #F3F4F6
 */
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Preview,
  Hr,
} from "@react-email/components";
import * as React from "react";

const COLORS = {
  pageBg: "#0B0F19",
  cardBg: "#161B2E",
  border: "#2a344a",
  heading: "#F3F4F6",
  body: "#cbd5e1",
  mute: "#64748b",
} as const;

const FONT_STACK = "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif";

const cardStyle: React.CSSProperties = {
  background: COLORS.cardBg,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 16,
  padding: 32,
  maxWidth: 520,
  margin: "32px auto",
};

const footerStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  color: COLORS.mute,
  lineHeight: 1.6,
};

export type BaseLayoutProps = {
  /** Used by mail clients for the inbox preview snippet (Gmail, etc). */
  preview: string;
  /** Footer line shown below the divider. Use for workspace attribution etc. */
  footer?: string;
  children: React.ReactNode;
};

export function BaseLayout({ preview, footer, children }: BaseLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          margin: 0,
          padding: 0,
          background: COLORS.pageBg,
          fontFamily: FONT_STACK,
          color: COLORS.heading,
        }}
      >
        <Container style={cardStyle}>
          <Section>{children}</Section>
          {footer && (
            <>
              <Hr style={{ border: "none", borderTop: `1px solid ${COLORS.border}`, margin: "28px 0" }} />
              <Text style={footerStyle}>{footer}</Text>
            </>
          )}
        </Container>
      </Body>
    </Html>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Shared style tokens — exported for use inside individual templates so
 * they don't redefine colors and drift.
 * ────────────────────────────────────────────────────────────────────────── */
export const emailStyles = {
  badge: (color: string): React.CSSProperties => ({
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.18em",
    color,
    textTransform: "uppercase",
    margin: "0 0 8px",
  }),
  h1: {
    margin: "0 0 16px",
    fontSize: 22,
    lineHeight: 1.3,
    color: COLORS.heading,
  } as React.CSSProperties,
  body: {
    margin: "0 0 20px",
    fontSize: 14,
    lineHeight: 1.6,
    color: COLORS.body,
  } as React.CSSProperties,
  emphasis: { color: COLORS.heading, fontWeight: 600 } as React.CSSProperties,
  // CTA — yellow rounded button matching the existing template style.
  cta: {
    background: "#ffe600",
    color: COLORS.pageBg,
    fontWeight: 800,
    fontSize: 14,
    letterSpacing: "0.04em",
    padding: "14px 28px",
    borderRadius: 10,
    textDecoration: "none",
    display: "inline-block",
  } as React.CSSProperties,
  linkFallback: {
    margin: "24px 0 0",
    fontSize: 12,
    lineHeight: 1.6,
    color: COLORS.mute,
  } as React.CSSProperties,
  link: { color: "#a78bfa", wordBreak: "break-all" } as React.CSSProperties,
  scoreCardOuter: {
    background: COLORS.pageBg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: "16px 18px",
    margin: "0 0 24px",
  } as React.CSSProperties,
  scoreLabel: {
    fontSize: 11,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    fontWeight: 700,
    margin: 0,
  } as React.CSSProperties,
  scoreValue: (color: string): React.CSSProperties => ({
    fontSize: 32,
    fontWeight: 900,
    color,
    margin: "4px 0 0",
  }),
};

export { COLORS };
