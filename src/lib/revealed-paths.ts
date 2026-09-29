/**
 * Tracks template-scaffold files the user has explicitly taken ownership of.
 *
 * Templates ship hidden scaffolding (e.g. empty-react's empty `/styles.css`,
 * empty-js's `/index.html`). Those paths exist in `sandpack.files` but are
 * filtered out of the explorer tree, so creating a file at the same path
 * must *reveal* the hidden entry instead of reporting "already exists" for
 * a file the user cannot see.
 *
 * `FilesBridge` consults this set to know it must not force `hidden: true`
 * back onto a path the user revealed. Keys are scoped per template id.
 */

const revealed = new Set<string>();

function key(templateId: string | undefined, path: string): string {
  return `${templateId ?? ""}::${path}`;
}

export function markRevealed(
  templateId: string | undefined,
  path: string,
): void {
  revealed.add(key(templateId, path));
}

export function isRevealed(
  templateId: string | undefined,
  path: string,
): boolean {
  return revealed.has(key(templateId, path));
}

export function clearRevealed(templateId: string | undefined): void {
  const prefix = `${templateId ?? ""}::`;
  for (const k of Array.from(revealed)) {
    if (k.startsWith(prefix)) revealed.delete(k);
  }
}

/** True when a Sandpack file entry carries `hidden: true`. */
export function isHiddenEntry(file: unknown): boolean {
  return (
    !!file &&
    typeof file !== "string" &&
    (file as { hidden?: boolean }).hidden === true
  );
}

export type Collision = "hidden-scaffold" | "duplicate" | "free";

/**
 * Classifies what creating a file at `fullPath` would collide with.
 * `existing` is the raw `sandpack.files[fullPath]` entry (undefined when
 * absent) and `visiblePaths` is the explorer's hidden-filtered path list.
 */
export function classifyCollision(
  existing: unknown,
  visiblePaths: string[],
  fullPath: string,
): Collision {
  if (isHiddenEntry(existing) && !visiblePaths.includes(fullPath)) {
    return "hidden-scaffold";
  }
  if (existing || visiblePaths.includes(fullPath)) {
    return "duplicate";
  }
  return "free";
}

/**
 * The `hidden` flag a path must carry in the files map / sync payload.
 * A user-revealed path stays visible even when the template marks it hidden.
 */
export function resolveHidden(
  templateHidden: unknown,
  currentlyHidden: unknown,
  templateId: string | undefined,
  path: string,
): boolean {
  if (currentlyHidden) return true;
  if (templateHidden && !isRevealed(templateId, path)) return true;
  return false;
}
