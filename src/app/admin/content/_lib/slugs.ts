/**
 * Give every row in a batch a unique slug in one pass. `taken` holds the
 * slugs already in the database that could collide (fetch them with one
 * `startsWith` query per distinct root, or one `in` query). Rows inside the
 * batch also reserve their slug, so two rows titled the same get -1, -2.
 */
export function assignUniqueSlugs(roots: string[], taken: Iterable<string>): string[] {
  const used = new Set(taken);
  return roots.map((raw) => {
    const root = raw || "item";
    let slug = root;
    let n = 1;
    while (used.has(slug)) slug = `${root}-${n++}`;
    used.add(slug);
    return slug;
  });
}
