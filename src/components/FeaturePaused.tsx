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
}: {
  featureKey: string;
  className?: string;
}) {
  const value = await featurePausedValue(featureKey);
  return <FeaturePausedNotice value={value} className={className} />;
}
