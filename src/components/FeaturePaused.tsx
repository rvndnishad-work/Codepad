import { getSwitch, switchDef } from "@/lib/admin/switches";
import FeaturePausedNotice, { type FeaturePausedValue } from "./FeaturePausedNotice";

export { FeaturePausedNotice, type FeaturePausedValue };

/** Read a switch in the shape the client notice takes (serialisable). */
export async function featurePausedValue(featureKey: string): Promise<FeaturePausedValue> {
  const sw = await getSwitch(featureKey);
  return {
    key: featureKey,
    label: switchDef(featureKey)?.label ?? featureKey,
    state: sw.state,
    message: sw.message,
    resumeAt: sw.resumeAt?.toISOString() ?? null,
    updatedAt: sw.updatedAt?.toISOString() ?? null,
  };
}

/**
 * For pages that should not open at all while a switch is off (or, with
 * `when: "not_on"`, also while read only): returns a full-page notice to
 * return early with, or null to render the page as usual.
 *
 *   const paused = await featurePausedPage("live-interviews");
 *   if (paused) return paused;
 */
export async function featurePausedPage(
  featureKey: string,
  when: "off" | "not_on" = "off",
): Promise<React.ReactElement | null> {
  const value = await featurePausedValue(featureKey);
  const blocked = when === "off" ? value.state === "off" : value.state !== "on";
  if (!blocked) return null;
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16">
      <FeaturePausedNotice value={value} className="w-full max-w-md" />
    </main>
  );
}

/**
 * Server component: renders nothing while the feature switch is on, and the
 * standard paused notice (word-for-word admin message, back-on time) when it
 * is read only or off. Use on the main page of each surface:
 *
 *   <FeaturePaused featureKey="playground-run" />
 *
 * In client components, read the value on the server with
 * `featurePausedValue(key)` and render <FeaturePausedNotice value={…} />.
 */
export default async function FeaturePaused({
  featureKey,
  className,
  wrapperClassName,
}: {
  featureKey: string;
  className?: string;
  /** Wraps the notice in a div with this class, only when it shows. */
  wrapperClassName?: string;
}) {
  const value = await featurePausedValue(featureKey);
  if (value.state === "on") return null;
  const notice = <FeaturePausedNotice value={value} className={className} />;
  return wrapperClassName ? <div className={wrapperClassName}>{notice}</div> : notice;
}
