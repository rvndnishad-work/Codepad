/**
 * Shared pieces for emails that go to candidates: the workspace header
 * (logo or name), the branded button, the workspace's own wording, and the
 * help, privacy and unsubscribe lines that are always added.
 *
 * The props come from applyCandidateContext (src/lib/workspace/candidate-experience.ts),
 * which the email service calls for every candidate template.
 */
import { Img, Text } from "@react-email/components";
import * as React from "react";
import { brandButton, type CandidateEmailExtras } from "@/lib/workspace/candidate-experience";
import { COLORS, emailStyles } from "./BaseLayout";

export type { CandidateEmailExtras };

/** The main button, in the workspace colour when one is set. */
export function ctaStyle(brand: CandidateEmailExtras["brand"]): React.CSSProperties {
  if (!brand?.color) return emailStyles.cta;
  const b = brandButton(brand.color);
  return { ...emailStyles.cta, background: b.background, color: b.color };
}

/** Logo (or the workspace name) above the card content. */
export function BrandHeader({ brand }: { brand: CandidateEmailExtras["brand"] }) {
  if (!brand) return null;
  if (brand.logoUrl) {
    return <Img src={brand.logoUrl} alt={brand.name} height={36} style={{ height: 36, width: "auto", maxWidth: 200, margin: "0 0 24px", display: "block" }} />;
  }
  return <Text style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700, color: COLORS.heading }}>{brand.name}</Text>;
}

/** The workspace's own opening text, one paragraph per block. */
export function CustomIntro({ paragraphs }: { paragraphs: string[] }) {
  return (
    <>
      {paragraphs.map((p, i) => (
        <Text key={i} style={emailStyles.body}>
          {p.split("\n").map((line, j, all) => (
            <React.Fragment key={j}>
              {line}
              {j < all.length - 1 && <br />}
            </React.Fragment>
          ))}
        </Text>
      ))}
    </>
  );
}

const footLink: React.CSSProperties = { color: COLORS.mute, textDecoration: "underline" };

/** Help, privacy and unsubscribe lines. Rendered inside the footer. */
export function CandidateFooterLines({ brand, unsubscribeUrl }: CandidateEmailExtras) {
  const help = brand?.helpEmail;
  const privacy = brand?.privacyNoticeUrl;
  if (!help && !privacy && !unsubscribeUrl) return null;
  return (
    <>
      {help && (
        <>
          <br />
          Questions? Write to{" "}
          <a href={`mailto:${help}`} style={footLink}>
            {help}
          </a>
          .
        </>
      )}
      {(privacy || unsubscribeUrl) && <br />}
      {privacy && (
        <a href={privacy} style={footLink}>
          Privacy notice
        </a>
      )}
      {privacy && unsubscribeUrl && " · "}
      {unsubscribeUrl && (
        <a href={unsubscribeUrl} style={footLink}>
          Unsubscribe
        </a>
      )}
    </>
  );
}

/** Plain-text versions of the lines above, for the text part of the email. */
export function candidateFooterText({ brand, unsubscribeUrl }: CandidateEmailExtras): string[] {
  const out: string[] = [];
  if (brand?.helpEmail) out.push(`Questions? Write to ${brand.helpEmail}.`);
  if (brand?.privacyNoticeUrl) out.push(`Privacy notice: ${brand.privacyNoticeUrl}`);
  if (unsubscribeUrl) out.push(`Unsubscribe: ${unsubscribeUrl}`);
  return out.length ? ["", "--", ...out] : [];
}
