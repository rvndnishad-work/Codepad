/**
 * Machine coding ULTRA — batch 14: trees and nesting. Three File Explorer
 * siblings (the recursive tree view; a toolbar with breadcrumbs, search and a
 * context menu; nested drag-and-drop with the no-drop-into-a-descendant rule),
 * tri-state Nested Checkboxes, and two Nested Comments siblings (the basic
 * widget; collapsible threads with optimistic voting).
 *
 * Every question carries a CLAUDE.md §6 Question Body and one bundle per
 * framework (React, Vue, Angular): a tutorial answer (story first, questions to
 * ask in the React tab, state model, step-by-step build with 📌 terms, a
 * Verified section, edge cases and accessibility, pitfalls, the §7 interview
 * card, glossary, conclusion) and a runnable multi-file solution.
 *
 * Every solution was booted with scripts/verify-mc-solution.mjs exactly as the
 * playground boots it, on React 19.3.1 / Vue 3.5.44 / Angular 22.2.3 (AOT with
 * strict templates AND runtime JIT) in jsdom 29.1.1, and driven by a shared
 * driver per question; the Verified blocks quote that output. jsdom has no
 * DataTransfer or DragEvent, so the drag-and-drop driver builds the drag events
 * itself with a fake dataTransfer and a stubbed getBoundingClientRect; the
 * answers say so. The vote API in the last question is simulated in-file.
 *
 * This file is generated: the solutions, drivers, content sources and the
 * generator (gen.mjs) live in the session scratchpad under mc/b14. Conventions:
 * SVG attributes double-quoted, no apostrophes inside <svg>, no leading H1,
 * `description` is plain markdown.
 */
import type { MachineCodingAugment } from "./machine-coding-augments.types";

const augments: MachineCodingAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a File Explorer (tree view)",
    seoDescription:
      "Build a recursive file explorer tree in React, Vue and Angular: expand/collapse, add, rename and delete, ARIA tree keys. Verified, runnable solutions.",
    description: `**Question presented to candidate:**
"Build the file tree you see on the left of a code editor. Given nested JSON of folders and files, render it with indentation, let me open and close folders, select an item, and add, rename and delete files and folders. Keyboard users should be able to move around it with the arrow keys."

**Requirements:**
- Render folders and files recursively from nested data, indented by depth, folders before files, A to Z.
- Click (or Enter) on a folder toggles it open or closed; the open state is kept separately from the data.
- Toolbar actions on the selection: New file, New folder (inside the selected folder, or next to the selected file), Rename, Delete (a folder deletes everything inside it).
- New and rename use an inline text box: Enter commits, Escape cancels, empty cancels, a name already used in that folder shows an error and keeps the box open.
- ARIA tree pattern: \`role="tree"\` / \`treeitem\` / \`group\`, \`aria-expanded\`, \`aria-level\`, one tab stop, Up/Down/Left/Right, F2 to rename, Delete to delete.

**What a strong answer should cover:**
- A recursive component that renders one node and calls itself for each child, with a stable \`key\` per id.
- The state model: tree data, a set of expanded ids, the selected id and the "editing" draft are separate; visible rows and the selected node are derived.
- Immutable updates by id (\`updateNode\`, \`insertNode\`, \`removeNode\`) that copy only the path to the change, or in-place mutation where the framework tracks it (Vue).
- Nested vs normalized data: why nested is fine here and when a flat \`id -> node\` map wins (moves, big trees).
- Keyboard and focus: roving \`tabindex\`, moving DOM focus after state changes, ignoring keys typed into the inline input.
- Validation and edge cases: duplicate names (case-insensitive), deleting the selected folder, creating inside a closed folder.

**Clarifying questions expected:**
- "Is the whole tree loaded up front, or should folders load their children lazily?"
- "How large can a folder get? Do we need virtualization?"
- "Are names unique per folder, and is the comparison case-sensitive?"

**Code / implementation expected:** Yes. A working component with recursion, expand/collapse and add/rename/delete; keyboard navigation is a strong plus.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round. You know a little React (components, \`useState\`); no tree or accessibility experience needed.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain words first, then tagged with <code>📌 Interview term:</code> so you also learn the vocabulary an interviewer listens for. All code comes from the runnable solution next to this tutorial, and the Verified section quotes what it printed when a script clicked and typed into it on React 19.3.1.

## 1. Why This Even Matters — A Story First

Think of a filing cabinet. A drawer holds folders, a folder holds more folders and papers, and you never know in advance how deep it goes. If you had to write a separate drawing routine for "level 1", "level 2" and "level 3", you would always be one level short.

The trick that makes a file explorer easy is the same trick the cabinet uses: **a folder is just a smaller cabinet**. So you write one piece of UI that knows how to draw a single item, and when that item is a folder, it draws itself again for each thing inside. That one idea, plus a clean split between "the files" and "what is open on screen", is the whole question.

Interviewers like it because it tests recursion, immutable updates on nested data, derived state and keyboard accessibility in about 45 minutes.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the full tree loaded at once, or per folder on expand? | Lazy loading adds a loading state per folder and changes where children live. |
| Roughly how many items can a folder hold? | Thousands of rows means a flat, [virtualized list](/interview-question/build-a-virtualized-list) instead of plain recursion. |
| Are names unique per folder? Case-sensitive? | Decides the validation rule for new and rename. This solution rejects duplicates case-insensitively, like macOS and Windows. |
| What order: as stored, or folders first then A to Z? | Sorting must be shared by rendering and keyboard navigation, or arrow keys jump around. |
| Does Delete need a confirm step or undo? | A folder delete removes a whole subtree; real products confirm or offer undo. |
| Is drag-and-drop in scope? | It is a separate, harder question: [nested drag-and-drop](/interview-question/build-a-file-explorer-with-nested-drag-and-drop). |

## 3. Requirements and Plan

The build covers: recursive rendering, expand/collapse, selection, New file / New folder / Rename / Delete with an inline input, sorting, and the ARIA tree keyboard keys.

### Component tree

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="App owns all state and renders a toolbar, a tree list and a status line. Each TreeNode renders itself again for every child of an open folder.">
  <defs>
    <marker id="fe1r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="220" y="20" width="200" height="60" rx="10"/>
  <text class="d-text d-accent" x="320" y="46" text-anchor="middle">App</text>
  <text class="d-sub" x="320" y="66" text-anchor="middle">tree, expanded, selection</text>
  <rect class="d-box-muted" x="20" y="150" width="160" height="56" rx="10"/>
  <text class="d-text" x="100" y="183" text-anchor="middle">Toolbar</text>
  <rect class="d-box" x="240" y="150" width="160" height="56" rx="10"/>
  <text class="d-text" x="320" y="174" text-anchor="middle">TreeNode</text>
  <text class="d-sub" x="320" y="194" text-anchor="middle">node, depth, api</text>
  <rect class="d-box-muted" x="460" y="150" width="160" height="56" rx="10"/>
  <text class="d-text" x="540" y="183" text-anchor="middle">Status line</text>
  <rect class="d-box-muted" x="240" y="240" width="160" height="50" rx="10"/>
  <text class="d-text" x="320" y="270" text-anchor="middle">NameInput</text>
  <path class="d-edge" d="M 260 80 L 120 150" marker-end="url(#fe1r-arrow)"/>
  <path class="d-edge" d="M 320 80 L 320 150" marker-end="url(#fe1r-arrow)"/>
  <path class="d-edge" d="M 380 80 L 520 150" marker-end="url(#fe1r-arrow)"/>
  <path class="d-edge" d="M 320 206 L 320 240" marker-end="url(#fe1r-arrow)"/>
  <path class="d-edge-accent" d="M 400 170 C 470 120 470 230 400 190" marker-end="url(#fe1r-arrow)"/>
</svg>

The curved arrow is the recursion: a \`TreeNode\` for an open folder renders one \`TreeNode\` per child. \`NameInput\` appears only while a name is being typed.

### State model

| Piece | Kind | Why |
| :--- | :--- | :--- |
| \`tree\` | state | The nested data: \`{ id, name, type, children? }\` |
| \`expanded\` | state, a \`Set\` of ids | Open or closed is screen state, not file data; keeping it apart means sorting, renaming or reloading data never closes folders by accident |
| \`selectedId\` | state | One id, not a copy of the node, so it can never go stale |
| \`editing\` | state | \`{ kind: 'new', parentId, type }\` or \`{ kind: 'rename', id }\` |
| \`error\`, \`status\` | state | Validation message and the live-region announcement |
| \`rows\` | derived (\`useMemo\`) | The visible rows in order, used by the arrow keys |
| \`selected\`, \`tabStopId\` | derived | Looked up from the id on every render |
| \`focusPending\` | ref | "Focus the selected row after the next commit": a flag, not something to render |

📌 **Interview term: Derived state** — a value you can compute from other state, so you compute it during render instead of storing it. Storing it twice is how UIs drift out of sync. Memoize it with [useMemo](/interview-question/what-is-the-difference-between-usememo-and-usecallback) only when computing is expensive.

## 4. Build It Step by Step

### Step 1: The data and an immutable update by id

📌 **Interview term: Nested vs normalized data** — *nested* data stores children inside their parent (exactly what an API returns). *Normalized* data stores every node in a flat \`id -> node\` map with \`parentId\` and \`childIds\`. Nested is simplest to render; normalized makes lookups and moves O(1). For add/rename/delete, nested is fine; the [drag-and-drop sibling](/interview-question/build-a-file-explorer-with-nested-drag-and-drop) switches to normalized because moving subtrees is its whole job.

React state must be replaced, never mutated (see [why React state updates must be immutable](/interview-question/why-must-react-state-updates-be-immutable)). The helper below walks the tree and copies only the folders on the path to the changed node; every other branch keeps its old object, so unchanged subtrees keep their identity.

~~~js
export function updateNode(nodes, id, fn) {
  let changed = false;
  const next = nodes.map((n) => {
    if (n.id === id) {
      changed = true;
      return fn(n);
    }
    if (n.children) {
      const kids = updateNode(n.children, id, fn);
      if (kids !== n.children) {
        changed = true;
        return { ...n, children: kids };
      }
    }
    return n;
  });
  return changed ? next : nodes;
}
~~~

📌 **Interview term: Structural sharing** — an immutable update that reuses every untouched object and copies only the path from the root to the change. A rename deep in the tree costs O(depth) new objects, not a copy of the whole tree.

The same pattern gives \`removeNode\` (filter out the id, which drops its whole subtree) and \`insertNode\` (append to a folder's \`children\`).

### Step 2: The recursive component

📌 **Interview term: Recursive component** — a component that renders itself for its children. It needs a base case: here, a file or a closed folder renders no children, so the recursion stops.

~~~jsx
{
  open && (
    <ul role="group">
      {sortNodes(node.children).map((child) => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          api={api}
        />
      ))}
      {creatingHere && (
        <NewItemRow
          depth={depth + 1}
          type={api.editing.type}
          api={api}
        />
      )}
    </ul>
  );
}
~~~

Each child gets \`key={child.id}\`, never the array index: sorting or inserting changes indexes, and index keys would let React reuse the wrong row (see [the key prop](/interview-question/what-is-the-purpose-of-the-key-prop-when-rendering-lists-in-react)). \`depth\` drives both \`aria-level\` and the indentation.

The shared values travel down as one \`api\` object. For a tree that is a few levels deep this is simpler than [Context](/interview-question/what-is-the-context-api-in-react-and-when-would-you-use-it); for a big tree, Context or memoized rows avoid re-rendering every node on each change.

### Step 3: One sort, used everywhere

~~~js
export function sortNodes(nodes) {
  return [...nodes].sort((a, b) =>
    a.type !== b.type
      ? a.type === "folder"
        ? -1
        : 1
      : a.name.localeCompare(b.name),
  );
}
~~~

Rendering and the keyboard both go through \`sortNodes\`, so the row under ArrowDown is always the row the user sees next. \`visibleRows\` walks the same sorted order but only into open folders:

~~~js
export function visibleRows(
  nodes,
  expanded,
  depth = 1,
  parentId = null,
  out = [],
) {
  for (const n of sortNodes(nodes)) {
    out.push({ id: n.id, parentId, depth, node: n });
    if (n.children && expanded.has(n.id))
      visibleRows(n.children, expanded, depth + 1, n.id, out);
  }
  return out;
}
~~~

### Step 4: Expand, collapse and select

\`expanded\` is a \`Set\`. A \`Set\` is mutable, so the updater builds a new one:

~~~jsx
function setOpen(id, open) {
  setExpanded((prev) => {
    const next = new Set(prev);
    if (open) next.add(id);
    else next.delete(id);
    return next;
  });
}
~~~

A row click selects it and toggles a folder. Selection stores the id; the node itself is found with \`findNode\` on each render.

### Step 5: New, rename and validation

📌 **Interview term: Draft state** — the half-finished thing the user is typing (here \`editing\` plus the input text) kept apart from the committed data until they press Enter. Escape just throws the draft away.

~~~jsx
function commit(raw) {
  const name = raw.trim();
  if (!name) {
    cancel();
    return;
  }
  const parentId =
    editing.kind === "new"
      ? editing.parentId
      : findParentId(tree, editing.id);
  const problem = validateName(
    tree,
    parentId,
    name,
    editing.kind === "rename" ? editing.id : null,
  );
  if (problem) {
    setError(problem);
    return;
  }
  if (editing.kind === "new") {
    const node = { id: makeId(), name, type: editing.type };
    if (editing.type === "folder") node.children = [];
    setTree((t) => insertNode(t, parentId, node));
    setSelectedId(node.id);
    setStatus("Created " + name);
  } else {
    setTree((t) => updateNode(t, editing.id, (n) => ({ ...n, name })));
    setStatus("Renamed to " + name);
  }
  setEditing(null);
  setError("");
  focusPending.current = true;
}
~~~

\`validateName\` compares lower-cased names among the siblings and skips the node being renamed, so renaming \`README.md\` to \`readme.md\` is allowed. The \`NameInput\` focuses itself in a mount effect and stops click propagation, so clicking inside the box does not toggle the folder underneath.

### Step 6: Keyboard navigation and focus

📌 **Interview term: Roving tabindex** — only one item in a composite widget has \`tabIndex={0}\` (it is the single Tab stop); all others have \`-1\`. Arrow keys move that one stop and call \`.focus()\` on the new item. Tab then leaves the whole tree in one press.

~~~jsx
function onKeyDown(e, id) {
  const i = rows.findIndex((r) => r.id === id);
  const { node, parentId } = rows[i];
  const isFolder = node.type === "folder";
  const open = expanded.has(id);
  if (e.key === "ArrowDown") {
    if (rows[i + 1]) select(rows[i + 1].id);
  } else if (e.key === "ArrowUp") {
    if (rows[i - 1]) select(rows[i - 1].id);
  } else if (e.key === "ArrowRight") {
    if (isFolder && !open) setOpen(id, true);
    else if (isFolder && node.children.length) select(rows[i + 1].id);
  } else if (e.key === "ArrowLeft") {
    if (isFolder && open) setOpen(id, false);
    else if (parentId) select(parentId);
  } else if (e.key === "Enter") {
    setSelectedId(id);
    if (isFolder) setOpen(id, !open);
  } else if (e.key === "F2") startRename(node);
  else if (e.key === "Delete") remove(node);
  else return;
  e.preventDefault();
}
~~~

State updates are asynchronous, so the new row is focused after the commit, from an effect that reads a [ref](/interview-question/describe-the-useref-hook-and-its-typical-use-cases) flag:

~~~jsx
useEffect(() => {
  if (!focusPending.current || !selectedId) return;
  focusPending.current = false;
  treeRef.current.querySelector(\`[data-id="\${selectedId}"]\`)?.focus();
});
~~~

\`treeitem\` elements nest (a folder \`li\` contains its children), so a keydown on a child bubbles to every ancestor. Each \`li\` handles only \`e.target === e.currentTarget\`; the same guard keeps Delete and arrows typed into the rename box from acting on the tree.

## 5. Verified

The solution was bundled with esbuild and mounted in jsdom exactly like the playground (\`createRoot(...).render(<StrictMode><App /></StrictMode>)\`). A driver clicked rows, pressed keys on the focused \`treeitem\`, typed into the inline input and printed the tree after each step. In the dump, \`v\` is an open folder, \`>\` a closed one, and each leading dot is one level of depth. Unedited output:

~~~text
[react] RENDERED: Files+ File+ FolderRenameDelete▸📁public▸📁src📄package.json📄README.md
[react] tree: > public  > src  package.json  README.md
[react] roles: Project files | tab stops: 1
[react] click src: > public  v src  .> components  .App.jsx  .index.js  package.json  README.md
[react] ArrowDown -> focus: components
[react] ArrowRight: > public  v src  .v components  ..Button.jsx  ..Modal.jsx  .App.jsx  .index.js  package.json  README.md
[react] ArrowDown -> focus: Button.jsx | aria-selected: true
[react] ArrowLeft on file -> focus: components
[react] ArrowLeft on open folder: > public  v src  .> components  .App.jsx  .index.js  package.json  README.md
[react] new file input: New file name | focused: true
[react] after Enter: > public  v src  .v components  ..Button.jsx  ..Card.jsx  ..Modal.jsx  .App.jsx  .index.js  package.json  README.md
[react] status: Created Card.jsx | focus: Card.jsx
[react] duplicate: A file or folder named "button.jsx" already exists here | input still open: true
[react] after Escape: input open: false | tree: > public  v src  .v components  ..Button.jsx  ..Card.jsx  ..Modal.jsx  .App.jsx  .index.js  package.json  README.md
[react] rename input value: README.md
[react] after rename: > public  v src  .v components  ..Button.jsx  ..Card.jsx  ..Modal.jsx  .App.jsx  .index.js  NOTES.md  package.json
[react] Delete key on src: Deleted src and 6 items inside
[react] tree: > public  NOTES.md  package.json
[react] new root folder: > docs  > public  NOTES.md  package.json | selected: docs
~~~

What this proves: the tree starts with folders first and A to Z (\`public\` before \`src\`, \`package.json\` before \`README.md\`); ArrowRight opens a closed folder, ArrowLeft on a file jumps to its parent, ArrowLeft on an open folder closes it; the new file lands in the sorted position (\`Card.jsx\` between \`Button.jsx\` and \`Modal.jsx\`) and receives focus; \`button.jsx\` is rejected because \`Button.jsx\` exists (case-insensitive); renaming re-sorts (\`NOTES.md\` now sorts before \`package.json\`); Delete on \`src\` removes it and its 6 descendants; with nothing selected, a new folder goes to the top level. No \`console.error\` was printed. What jsdom cannot show: visual indentation and focus rings (styles are dropped) and real screen-reader output.

## 6. Edge Cases and Accessibility

| Case | What the solution does |
| :--- | :--- |
| Create inside a closed folder | \`startNew\` opens the parent first, so the input is visible |
| Selected file, then New file | Creates a sibling in the file parent folder |
| Delete the selected folder | Selection moves to the parent; focus follows |
| Empty name on Enter | Treated as cancel |
| Duplicate name | \`role="alert"\` message, \`aria-invalid\`, box stays open |
| Keys typed in the input | Ignored by the tree (target guard) |
| Screen readers | \`role="tree"\`, \`treeitem\` with \`aria-level\`, \`aria-expanded\` on folders only, \`aria-selected\`, \`group\` for children, \`role="status"\` announces Created / Renamed / Deleted |
| Icons | Emoji are \`aria-hidden\`; the folder or file nature is exposed by \`aria-expanded\` |

📌 **Interview term: ARIA tree pattern** — the WAI-ARIA Authoring Practices recipe for hierarchical lists: a \`tree\` containing \`treeitem\`s, nested \`group\`s, one Tab stop, Up/Down to move, Right to open or enter, Left to close or go to the parent.

## 7. Common Pitfalls

- **Storing \`isOpen\` inside the file data.** Then a refetch or an immutable rename can silently close folders, and the same data cannot be shown open in two panels. Keep a separate \`expanded\` set.
- **Index keys on children.** Sorting or inserting shifts indexes and React reuses the wrong row, so an open input or focus jumps to a neighbour.
- **Sorting in render but not in the keyboard list.** ArrowDown then follows storage order while the eye follows sorted order.
- **Deep-cloning the tree on every change** (\`structuredClone\` or JSON round trips). It works, but every row gets a new identity, so memoized rows all re-render. Copy only the path.
- **Handling keydown on every nested \`li\`.** One ArrowDown runs the handler once per ancestor and skips several rows. Guard with \`e.target === e.currentTarget\`.
- **Calling \`.focus()\` right after \`setState\`.** The new row is not in the DOM yet; focus after the commit.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Data and state:</strong> <span style="color:#f0e2c8;">"I keep the tree as nested JSON, plus three separate pieces of state: a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> of expanded ids, the selected id, and an editing draft. Visible rows and the selected node are derived."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Recursion:</strong> <span style="color:#f0e2c8;">"One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TreeNode</code> component renders a row, and for an open folder it maps its sorted children to more <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TreeNode</code>s with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key={child.id}</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">depth + 1</code>. A file or a closed folder is the base case."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Updates:</strong> <span style="color:#f0e2c8;">"Edits go through small immutable helpers by id that copy only the path to the change, so untouched branches keep their identity."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Add, rename, delete:</strong> <span style="color:#f0e2c8;">"New and rename share an inline input: Enter commits after a case-insensitive duplicate check, Escape cancels. Deleting a folder drops its subtree and moves selection to the parent."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Accessibility:</strong> <span style="color:#f0e2c8;">"I follow the ARIA tree pattern: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tree</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">treeitem</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">group</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-expanded</code>, a roving <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tabindex</code>, arrow keys from a flattened visible-rows list, and focus moved after the commit."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you load folder children lazily?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Give folders a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">children: null</code> meaning "not loaded". On first expand, set a loading flag for that id, fetch, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">updateNode</code> the folder with the result. Cache by folder id, and ignore a response if the folder was deleted or the request was superseded.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The tree has 50,000 files. What changes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Recursion renders every open row, which gets slow. Flatten the visible rows (the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">visibleRows</code> list) and render it with a windowed list, indenting by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">depth</code>. A normalized <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">id -&gt; node</code> map also makes lookups O(1) instead of a tree walk.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not keep <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">isOpen</code> on each node?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It mixes view state into data. A refetch or an immutable update can reset it, two views of the same tree cannot differ, and saving the tree would persist UI state. A separate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> of ids survives all of that.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With Testing Library: render, click a folder and assert its children appear, press ArrowDown and assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.activeElement</code>, type a duplicate name and assert the alert. Unit-test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">updateNode</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">removeNode</code> separately, including that untouched branches keep the same object.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you use Context instead of passing <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">api</code> down?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a deep or large tree, yes, or a store, so intermediate nodes do not need the prop. The bigger win is memoizing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TreeNode</code> and passing stable callbacks so a selection change does not re-render every row.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Recursive component | A component that renders itself for its children |
| Derived state | A value computed from state during render, not stored |
| Nested vs normalized data | Children inside parents, or a flat \`id -> node\` map with parent and child ids |
| Structural sharing | Immutable update that copies only the changed path |
| Draft state | Uncommitted user input kept apart from the data |
| Roving tabindex | One Tab stop that arrow keys move around a widget |
| ARIA tree pattern | Roles, states and keys for an accessible tree view |

---

**Conclusion:** A file explorer is one recursive component plus a disciplined state model. Keep the files, the open folders, the selection and the draft as separate pieces of state, derive everything else, update the tree immutably by id, and move a single tab stop with the arrow keys. With that base, the follow-ups (a [toolbar with breadcrumbs, search and a context menu](/interview-question/build-a-file-explorer-toolbar-breadcrumbs-search-context-menu), or drag-and-drop) are additions rather than rewrites.`,
        files: {
          "/App.js": `import { useEffect, useMemo, useRef, useState } from "react";
import TreeNode, { NewItemRow } from "./src/TreeNode";
import {
  initialTree,
  makeId,
  sortNodes,
  findNode,
  findParentId,
  updateNode,
  removeNode,
  insertNode,
  countDescendants,
  visibleRows,
  validateName,
} from "./src/treeUtils";

export default function App() {
  const [tree, setTree] = useState(initialTree);
  const [expanded, setExpanded] = useState(() => new Set());
  const [selectedId, setSelectedId] = useState(null);
  // { kind: 'new', parentId, type } | { kind: 'rename', id }
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const treeRef = useRef(null);
  const focusPending = useRef(false);

  // Derived, never stored: the visible rows
  // (for the keyboard) and the selected node.
  const rows = useMemo(() => visibleRows(tree, expanded), [tree, expanded]);
  const selected = selectedId ? findNode(tree, selectedId) : null;
  const tabStopId = rows.some((r) => r.id === selectedId)
    ? selectedId
    : rows[0]?.id;

  // After a keyboard move, put DOM focus on the newly selected row.
  useEffect(() => {
    if (!focusPending.current || !selectedId) return;
    focusPending.current = false;
    treeRef.current.querySelector(\`[data-id="\${selectedId}"]\`)?.focus();
  });

  function setOpen(id, open) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function select(id) {
    setSelectedId(id);
    focusPending.current = true;
  }

  function startNew(type) {
    let parentId = null;
    if (selected)
      parentId =
        selected.type === "folder"
          ? selected.id
          : findParentId(tree, selected.id);
    if (parentId) setOpen(parentId, true);
    setEditing({ kind: "new", parentId, type });
    setError("");
  }

  function startRename(node) {
    if (!node) return;
    setSelectedId(node.id);
    setEditing({ kind: "rename", id: node.id });
    setError("");
  }

  function cancel() {
    setEditing(null);
    setError("");
    focusPending.current = true;
  }

  function commit(raw) {
    const name = raw.trim();
    if (!name) {
      cancel();
      return;
    }
    const parentId =
      editing.kind === "new"
        ? editing.parentId
        : findParentId(tree, editing.id);
    const problem = validateName(
      tree,
      parentId,
      name,
      editing.kind === "rename" ? editing.id : null,
    );
    if (problem) {
      setError(problem);
      return;
    }
    if (editing.kind === "new") {
      const node = { id: makeId(), name, type: editing.type };
      if (editing.type === "folder") node.children = [];
      setTree((t) => insertNode(t, parentId, node));
      setSelectedId(node.id);
      setStatus("Created " + name);
    } else {
      setTree((t) => updateNode(t, editing.id, (n) => ({ ...n, name })));
      setStatus("Renamed to " + name);
    }
    setEditing(null);
    setError("");
    focusPending.current = true;
  }

  function remove(node) {
    if (!node) return;
    const inside = countDescendants(node);
    const parentId = findParentId(tree, node.id);
    setTree((t) => removeNode(t, node.id));
    setSelectedId(parentId);
    focusPending.current = true;
    setStatus(
      "Deleted " +
        node.name +
        (inside
          ? " and " + inside + " item" + (inside === 1 ? "" : "s") + " inside"
          : ""),
    );
  }

  function onRowClick(node) {
    setSelectedId(node.id);
    if (node.type === "folder") setOpen(node.id, !expanded.has(node.id));
  }

  function onKeyDown(e, id) {
    const i = rows.findIndex((r) => r.id === id);
    const { node, parentId } = rows[i];
    const isFolder = node.type === "folder";
    const open = expanded.has(id);
    if (e.key === "ArrowDown") {
      if (rows[i + 1]) select(rows[i + 1].id);
    } else if (e.key === "ArrowUp") {
      if (rows[i - 1]) select(rows[i - 1].id);
    } else if (e.key === "ArrowRight") {
      if (isFolder && !open) setOpen(id, true);
      else if (isFolder && node.children.length) select(rows[i + 1].id);
    } else if (e.key === "ArrowLeft") {
      if (isFolder && open) setOpen(id, false);
      else if (parentId) select(parentId);
    } else if (e.key === "Enter") {
      setSelectedId(id);
      if (isFolder) setOpen(id, !open);
    } else if (e.key === "F2") startRename(node);
    else if (e.key === "Delete") remove(node);
    else return;
    e.preventDefault();
  }

  const api = {
    expanded,
    selectedId,
    tabStopId,
    editing,
    error,
    onRowClick,
    onKeyDown,
    commit,
    cancel,
  };

  return (
    <div className="app">
      <h1>Files</h1>
      <div className="toolbar" role="toolbar" aria-label="File actions">
        <button data-testid="new-file" onClick={() => startNew("file")}>
          + File
        </button>
        <button data-testid="new-folder" onClick={() => startNew("folder")}>
          + Folder
        </button>
        <button
          data-testid="rename"
          disabled={!selected}
          onClick={() => startRename(selected)}
        >
          Rename
        </button>
        <button
          data-testid="delete"
          disabled={!selected}
          onClick={() => remove(selected)}
        >
          Delete
        </button>
      </div>
      <ul role="tree" aria-label="Project files" className="tree" ref={treeRef}>
        {sortNodes(tree).map((node) => (
          <TreeNode key={node.id} node={node} depth={1} api={api} />
        ))}
        {editing?.kind === "new" && editing.parentId === null && (
          <NewItemRow depth={1} type={editing.type} api={api} />
        )}
      </ul>
      <p className="status" role="status" data-testid="status">
        {status}
      </p>
    </div>
  );
}
`,
          "/src/TreeNode.js": `import { useEffect, useRef, useState } from "react";
import { sortNodes } from "./treeUtils";

// One inline text box, used both for "new file / folder" and for "rename".
export function NameInput({ initial, label, error, onCommit, onCancel }) {
  const [value, setValue] = useState(initial);
  const ref = useRef(null);
  useEffect(() => {
    ref.current.focus();
    ref.current.select();
  }, []);
  return (
    <span className="edit" onClick={(e) => e.stopPropagation()}>
      <input
        ref={ref}
        data-testid="name-input"
        aria-label={label}
        aria-invalid={error ? true : undefined}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onCommit(value);
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
      />
      {error && (
        <span role="alert" className="error">
          {error}
        </span>
      )}
    </span>
  );
}

export function NewItemRow({ depth, type, api }) {
  return (
    <li role="none">
      <div className="row" style={{ paddingLeft: 8 + (depth - 1) * 16 }}>
        <span className="chevron" />
        <span aria-hidden="true">{type === "folder" ? "📁" : "📄"}</span>
        <NameInput
          initial=""
          label={"New " + type + " name"}
          error={api.error}
          onCommit={api.commit}
          onCancel={api.cancel}
        />
      </div>
    </li>
  );
}

// The recursive component: it renders one
// node, and for an open folder it renders
// itself again for every child, one level deeper.
export default function TreeNode({ node, depth, api }) {
  const isFolder = node.type === "folder";
  const open = isFolder && api.expanded.has(node.id);
  const selected = api.selectedId === node.id;
  const renaming = api.editing?.kind === "rename" && api.editing.id === node.id;
  const creatingHere =
    api.editing?.kind === "new" && api.editing.parentId === node.id;

  return (
    <li
      role="treeitem"
      aria-level={depth}
      aria-expanded={isFolder ? open : undefined}
      aria-selected={selected}
      tabIndex={api.tabStopId === node.id ? 0 : -1}
      data-id={node.id}
      data-name={node.name}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget) api.onKeyDown(e, node.id);
      }}
    >
      <div
        className={"row" + (selected ? " selected" : "")}
        style={{ paddingLeft: 8 + (depth - 1) * 16 }}
        onClick={() => api.onRowClick(node)}
      >
        <span className="chevron" aria-hidden="true">
          {isFolder ? (open ? "▾" : "▸") : ""}
        </span>
        <span aria-hidden="true">{isFolder ? "📁" : "📄"}</span>
        {renaming ? (
          <NameInput
            initial={node.name}
            label={"Rename " + node.name}
            error={api.error}
            onCommit={api.commit}
            onCancel={api.cancel}
          />
        ) : (
          <span className="name">{node.name}</span>
        )}
      </div>
      {open && (
        <ul role="group">
          {sortNodes(node.children).map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} api={api} />
          ))}
          {creatingHere && (
            <NewItemRow depth={depth + 1} type={api.editing.type} api={api} />
          )}
        </ul>
      )}
    </li>
  );
}
`,
          "/src/treeUtils.js": `// Pure helpers for a NESTED tree: [{ id,
// name, type: 'folder' | 'file', children? }]
// Every update returns a new array and copies
// only the folders on the path to the change.

let nextId = 1;
export const makeId = () => "n" + nextId++;

export const initialTree = [
  {
    id: "src",
    name: "src",
    type: "folder",
    children: [
      {
        id: "components",
        name: "components",
        type: "folder",
        children: [
          { id: "modal", name: "Modal.jsx", type: "file" },
          { id: "button", name: "Button.jsx", type: "file" },
        ],
      },
      { id: "app", name: "App.jsx", type: "file" },
      { id: "index", name: "index.js", type: "file" },
    ],
  },
  {
    id: "public",
    name: "public",
    type: "folder",
    children: [{ id: "favicon", name: "favicon.ico", type: "file" }],
  },
  { id: "readme", name: "README.md", type: "file" },
  { id: "pkg", name: "package.json", type: "file" },
];

// Folders first, then A-Z. Used for rendering
// AND for keyboard order, so they agree.
export function sortNodes(nodes) {
  return [...nodes].sort((a, b) =>
    a.type !== b.type
      ? a.type === "folder"
        ? -1
        : 1
      : a.name.localeCompare(b.name),
  );
}

export function findNode(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = n.children ? findNode(n.children, id) : null;
    if (hit) return hit;
  }
  return null;
}

// null = top level, undefined = not found
export function findParentId(nodes, id, parentId = null) {
  for (const n of nodes) {
    if (n.id === id) return parentId;
    if (n.children) {
      const hit = findParentId(n.children, id, n.id);
      if (hit !== undefined) return hit;
    }
  }
  return undefined;
}

export function updateNode(nodes, id, fn) {
  let changed = false;
  const next = nodes.map((n) => {
    if (n.id === id) {
      changed = true;
      return fn(n);
    }
    if (n.children) {
      const kids = updateNode(n.children, id, fn);
      if (kids !== n.children) {
        changed = true;
        return { ...n, children: kids };
      }
    }
    return n;
  });
  return changed ? next : nodes;
}

export function removeNode(nodes, id) {
  let changed = false;
  const next = [];
  for (const n of nodes) {
    if (n.id === id) {
      changed = true;
      continue;
    }
    if (n.children) {
      const kids = removeNode(n.children, id);
      if (kids !== n.children) {
        changed = true;
        next.push({ ...n, children: kids });
        continue;
      }
    }
    next.push(n);
  }
  return changed ? next : nodes;
}

export function insertNode(nodes, parentId, node) {
  if (parentId === null) return [...nodes, node];
  return updateNode(nodes, parentId, (f) => ({
    ...f,
    children: [...f.children, node],
  }));
}

export function countDescendants(node) {
  return (node.children || []).reduce(
    (sum, c) => sum + 1 + countDescendants(c),
    0,
  );
}

// The rows a keyboard user can reach right
// now: open folders only, in render order.
export function visibleRows(
  nodes,
  expanded,
  depth = 1,
  parentId = null,
  out = [],
) {
  for (const n of sortNodes(nodes)) {
    out.push({ id: n.id, parentId, depth, node: n });
    if (n.children && expanded.has(n.id))
      visibleRows(n.children, expanded, depth + 1, n.id, out);
  }
  return out;
}

export function validateName(nodes, parentId, name, exceptId) {
  const siblings =
    parentId === null ? nodes : findNode(nodes, parentId).children;
  const clash = siblings.some(
    (s) => s.id !== exceptId && s.name.toLowerCase() === name.toLowerCase(),
  );
  return clash
    ? 'A file or folder named "' + name + '" already exists here'
    : "";
}
`,
          "/styles.css": `body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.app {
  max-width: 520px;
  margin: 0 auto;
  padding: 16px;
}
h1 {
  font-size: 18px;
  margin: 0 0 12px;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
button {
  background: #1d2230;
  color: #e6e6e6;
  border: 1px solid #343b4f;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
}
button:disabled {
  opacity: 0.45;
  cursor: default;
}
.tree,
.tree ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
.tree {
  background: #161a23;
  border: 1px solid #262c3b;
  border-radius: 8px;
  padding: 6px 0;
}
.row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
}
.row:hover {
  background: #1f2533;
}
.row.selected {
  background: #263354;
}
[role="treeitem"]:focus {
  outline: none;
}
[role="treeitem"]:focus-visible > .row {
  outline: 2px solid #6ea8ff;
  outline-offset: -2px;
}
.chevron {
  width: 12px;
  color: #8a93a8;
}
.edit {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}
.edit input {
  background: #0f1115;
  color: #e6e6e6;
  border: 1px solid #6ea8ff;
  border-radius: 4px;
  padding: 3px 6px;
}
.error {
  color: #ff8a80;
  font-size: 12px;
}
.status {
  min-height: 1.2em;
  color: #9aa3b5;
  font-size: 13px;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Frontend candidates who know basic Vue 3 (\`ref\`, \`v-for\`, \`<script setup>\`) and want to build a tree view from scratch.
**Difficulty:** Medium

> **How to read this doc:** Plain words first, then a <code>📌 Interview term:</code> tag with the vocabulary interviewers expect. Every snippet is taken from the runnable Vue solution beside this tutorial, and the Verified section quotes its real output on Vue 3.5.44.

## 1. Why This Even Matters — A Story First

A filing cabinet has drawers, folders inside drawers, and folders inside folders. You do not need a different way of looking at each level, because a folder is just a smaller cabinet. A file explorer UI works the same way: one component that draws one item, and that draws itself again for whatever is inside a folder.

The Vue version is pleasant because Vue tracks nested objects for you. You can push a new file into a folder's \`children\` array and the right row appears, with no copying.

## 2. Requirements and Plan

Render nested folders and files (folders first, A to Z), toggle folders, select, New file / New folder / Rename / Delete with an inline input and duplicate check, and the ARIA tree keys (arrows, Enter, F2, Delete).

| Piece | Vue tool | Why |
| :--- | :--- | :--- |
| \`tree\` | \`reactive(createTree())\` | Deep reactive, so \`push\`, \`splice\` and \`node.name = x\` re-render |
| \`expanded\` | \`reactive(new Set())\` | Vue makes \`Set.has / add / delete\` reactive; open state stays out of the data |
| \`selectedId\`, \`editing\`, \`error\`, \`status\` | \`ref\` | Simple values |
| \`rows\`, \`selected\`, \`tabStopId\`, \`topLevel\` | \`computed\` | Derived, cached until what they read changes |
| shared state for every level | \`provide\` / \`inject\` | No prop drilling through the recursion |

📌 **Interview term: Deep reactivity** — \`reactive()\` wraps nested objects and arrays in proxies as you read them, so a mutation anywhere in the tree is tracked. This is why the Vue solution can mutate in place where the React and Angular ones copy. See [ref vs reactive](/interview-question/what-is-the-difference-between-ref-and-reactive).

## 3. Build It Step by Step

### Step 1: A component that renders itself

📌 **Interview term: Recursive component** — a component used inside its own template. In \`<script setup>\`, an SFC can refer to itself by its file name, so \`TreeNode.vue\` simply writes \`<TreeNode>\` with no import.

~~~vue
<ul v-if="open" role="group">
  <!-- The component renders itself: Vue resolves TreeNode from this file name. -->
  <TreeNode
    v-for="child in children"
    :key="child.id"
    :node="child"
    :depth="depth + 1"
  />
  <li v-if="creatingHere" role="none">
    <div class="row" :style="{ paddingLeft: 8 + depth * 16 + 'px' }">
      <span class="chevron"></span>
      <span aria-hidden="true">{{ api.editing.type === 'folder' ? '📁' : '📄' }}</span>
      <NameInput
        :label="'New ' + api.editing.type + ' name'"
        :error="api.error"
        @commit="api.commit"
        @cancel="api.cancel"
      />
    </div>
  </li>
</ul>
~~~

The base case is a file or a closed folder: \`v-if="open"\` is false and the recursion stops. \`:key="child.id"\` keeps each row tied to its node when sorting or inserting moves it (see [why :key matters in v-for](/interview-question/why-is-the-key-attribute-important-in-v-for)).

### Step 2: Shared state through provide / inject

📌 **Interview term: provide / inject** — an ancestor makes a value available to every descendant, at any depth, without passing props through each level. See [provide and inject](/interview-question/what-are-provide-and-inject).

~~~js
// reactive() unwraps the refs, so children read
// api.selectedId, not api.selectedId.value
provide(
  "explorer",
  reactive({
    expanded,
    selectedId,
    tabStopId,
    editing,
    error,
    onRowClick,
    onKeyDown,
    commit,
    cancel,
  }),
);
~~~

Wrapping the object in \`reactive()\` unwraps the refs inside it, so a child reads \`api.selectedId\`, not \`api.selectedId.value\`, and the read is still tracked. Each \`TreeNode\` then only receives what differs per level: \`node\` and \`depth\`.

### Step 3: Derived rows with computed

~~~js
const rows = computed(() => visibleRows(tree, expanded));
const selected = computed(() =>
  selectedId.value
    ? (locate(tree, selectedId.value)?.node ?? null)
    : null,
);
const tabStopId = computed(() =>
  rows.value.some((r) => r.id === selectedId.value)
    ? selectedId.value
    : rows.value[0]?.id,
);
const topLevel = computed(() => sortNodes(tree));
~~~

\`visibleRows\` walks the tree in the same sorted order the template uses, going only into open folders. Because it reads the \`expanded\` Set and the tree, the \`computed\` re-runs when either changes, and not otherwise (see [computed vs watch](/interview-question/what-is-the-difference-between-computed-and-watch)).

### Step 4: Mutating in place

~~~js
function commit(raw) {
  const name = raw.trim();
  if (!name) return cancel();
  const e = editing.value;
  const parentId =
    e.kind === "new"
      ? e.parentId
      : (locate(tree, e.id).parent?.id ?? null);
  const problem = validateName(
    siblingsOf(parentId),
    name,
    e.kind === "rename" ? e.id : null,
  );
  if (problem) {
    error.value = problem;
    return;
  }
  if (e.kind === "new") {
    const node = { id: makeId(), name, type: e.type };
    if (e.type === "folder") node.children = [];
    siblingsOf(parentId).push(node);
    selectedId.value = node.id;
    status.value = "Created " + name;
  } else {
    locate(tree, e.id).node.name = name;
    status.value = "Renamed to " + name;
  }
  editing.value = null;
  error.value = "";
  focusSelected();
}
~~~

\`locate\` returns a node together with the array that holds it and its parent, which is everything an in-place edit needs: \`siblings.push(node)\` to add, \`node.name = name\` to rename and \`siblings.splice(i, 1)\` to delete.

### Step 5: Keyboard, \`.self\` and focus

📌 **Interview term: Event modifier \`.self\`** — \`@keydown.self\` runs the handler only when the event target is the element itself. Nested \`treeitem\`s would otherwise run every ancestor handler for one key press, and keys typed in the rename box would reach the tree.

~~~vue
@keydown.self="api.onKeyDown($event, node.id)"
~~~

A roving \`tabindex\` keeps one Tab stop. After moving the selection, \`focusSelected\` waits for \`nextTick()\` so the DOM has updated, then focuses the row by \`data-id\`. The inline \`NameInput\` uses \`v-model\`, emits \`commit\` and \`cancel\`, and listens with \`@keydown.enter.prevent\` and \`@keydown.escape.prevent\`.

## 4. Verified

Compiled with \`@vue/compiler-sfc\` and mounted with \`createApp(App).mount("#app")\` in jsdom. The same driver as the React and Angular versions clicked, typed and pressed keys. In the dump, \`v\` is an open folder, \`>\` a closed one, each dot one level deeper. Unedited output:

~~~text
[vue] RENDERED: Files+ File+ FolderRenameDelete▸📁public▸📁src📄package.json📄README.md
[vue] tree: > public  > src  package.json  README.md
[vue] roles: Project files | tab stops: 1
[vue] click src: > public  v src  .> components  .App.jsx  .index.js  package.json  README.md
[vue] ArrowDown -> focus: components
[vue] ArrowRight: > public  v src  .v components  ..Button.jsx  ..Modal.jsx  .App.jsx  .index.js  package.json  README.md
[vue] ArrowDown -> focus: Button.jsx | aria-selected: true
[vue] ArrowLeft on file -> focus: components
[vue] ArrowLeft on open folder: > public  v src  .> components  .App.jsx  .index.js  package.json  README.md
[vue] new file input: New file name | focused: true
[vue] after Enter: > public  v src  .v components  ..Button.jsx  ..Card.jsx  ..Modal.jsx  .App.jsx  .index.js  package.json  README.md
[vue] status: Created Card.jsx | focus: Card.jsx
[vue] duplicate: A file or folder named "button.jsx" already exists here | input still open: true
[vue] after Escape: input open: false | tree: > public  v src  .v components  ..Button.jsx  ..Card.jsx  ..Modal.jsx  .App.jsx  .index.js  package.json  README.md
[vue] rename input value: README.md
[vue] after rename: > public  v src  .v components  ..Button.jsx  ..Card.jsx  ..Modal.jsx  .App.jsx  .index.js  NOTES.md  package.json
[vue] Delete key on src: Deleted src and 6 items inside
[vue] tree: > public  NOTES.md  package.json
[vue] new root folder: > docs  > public  NOTES.md  package.json | selected: docs
~~~

It matches the other two frameworks line for line: arrow keys move focus and open or close folders, \`Card.jsx\` lands sorted and focused, \`button.jsx\` is rejected as a duplicate of \`Button.jsx\`, the rename re-sorts, and Delete on \`src\` reports its 6 descendants. No \`console.error\`. Not checked in jsdom: layout, focus rings and real screen-reader speech.

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| New item in a closed folder | The parent is opened first |
| Delete the selection | Selection and focus move to the parent |
| Duplicate or empty name | Alert and stay open, or cancel |
| ARIA | \`tree\`, \`treeitem\` + \`aria-level\`, \`aria-expanded\` as the strings \`"true"\` / \`"false"\`, \`aria-selected\`, \`group\`, \`role="status"\` |

\`aria-expanded\` is bound with \`String(open)\` so the attribute always says \`"true"\` or \`"false"\`; leaving it undefined on files removes it, which is right because files are not expandable.

## 6. Common Pitfalls

- **Expecting \`<TreeNode>\` to need an import inside itself.** It does not in \`<script setup>\`; it resolves from the file name. Renaming the file without updating the tag breaks recursion.
- **Using \`.value\` on injected refs.** Inside a \`reactive()\` wrapper they are already unwrapped; \`api.selectedId.value\` is \`undefined\`.
- **Storing open state on the node.** It mixes view state into data and breaks when the data is reloaded.
- **Putting the keyboard handler on every \`li\` without \`.self\`.** One key press runs once per ancestor.
- **Focusing before \`nextTick()\`.** The new row is not in the DOM yet.
- **Using \`v-model\` for the whole node name.** Typing would rename live; edit a local draft and commit on Enter.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State:</strong> <span style="color:#f0e2c8;">"The tree is a deep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reactive</code> array, open folders are a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reactive(new Set())</code>, and selection and the editing draft are refs. Visible rows and the selected node are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Recursion:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TreeNode.vue</code> renders a row and, for an open folder, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;TreeNode v-for&gt;</code> over its sorted children with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:key</code> by id. Vue resolves the self-reference from the file name."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Sharing:</strong> <span style="color:#f0e2c8;">"The root <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provide</code>s one reactive object with state and actions, every level <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject</code>s it, so props are only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">depth</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Edits:</strong> <span style="color:#f0e2c8;">"Because Vue tracks nested data, add is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code>, rename is an assignment and delete is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">splice</code>, after a case-insensitive duplicate check."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Keyboard:</strong> <span style="color:#f0e2c8;">"Roving tabindex, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@keydown.self</code> on each treeitem, arrow keys over the computed visible rows, and focus moved after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextTick</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">reactive</code> for the tree but <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ref</code> for the selection?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The tree is a nested structure I mutate deeply, which is what <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reactive</code> is for. The selection is a single replaceable value, which reads more clearly as a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code>. Either would work.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you not mutate in place?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the same data is shared with code that compares references, such as an undo history or a cache keyed by object. Then I copy on write, like the React version, or keep snapshots.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you load a folder lazily?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mark unloaded folders with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">children: null</code>, show a loading row on expand, fetch, then assign <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node.children = result</code>. Keep a per-folder loading flag and ignore a response for a folder that was deleted meanwhile.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Vue Test Utils or Testing Library: mount, trigger a click on a folder row, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await nextTick()</code>, assert the children, press ArrowDown and assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.activeElement</code>.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Recursive component | A component that renders itself for its children |
| Deep reactivity | \`reactive()\` tracks mutations at any depth |
| provide / inject | Pass values to all descendants without props |
| \`.self\` modifier | Run a handler only when the target is the element itself |
| Roving tabindex | One Tab stop moved by arrow keys |

---

**Conclusion:** In Vue a file explorer is one self-referencing SFC, a deep \`reactive\` tree that you mutate directly, a reactive \`Set\` for open folders, and \`provide\` / \`inject\` so the recursion only passes \`node\` and \`depth\`. Add the ARIA tree keys with \`.self\` and \`nextTick\` focus, and you have the base that the [toolbar](/interview-question/build-a-file-explorer-toolbar-breadcrumbs-search-context-menu) and [drag-and-drop](/interview-question/build-a-file-explorer-with-nested-drag-and-drop) questions build on.`,
        files: {
          "/src/App.vue": `<script setup>
import { computed, nextTick, provide, reactive, ref } from "vue";
import TreeNode from "./components/TreeNode.vue";
import NameInput from "./components/NameInput.vue";
import {
  createTree,
  makeId,
  sortNodes,
  locate,
  countDescendants,
  visibleRows,
  validateName,
} from "./treeData.js";

// deep reactive: push / splice / assign just work
const tree = reactive(createTree());
// ids of open folders, kept apart from the data
const expanded = reactive(new Set());
const selectedId = ref(null);
// { kind: 'new', parentId, type } | { kind: 'rename', id }
const editing = ref(null);
const error = ref("");
const status = ref("");
const treeEl = ref(null);

const rows = computed(() => visibleRows(tree, expanded));
const selected = computed(() =>
  selectedId.value ? (locate(tree, selectedId.value)?.node ?? null) : null,
);
const tabStopId = computed(() =>
  rows.value.some((r) => r.id === selectedId.value)
    ? selectedId.value
    : rows.value[0]?.id,
);
const topLevel = computed(() => sortNodes(tree));

async function focusSelected() {
  await nextTick();
  treeEl.value?.querySelector(\`[data-id="\${selectedId.value}"]\`)?.focus();
}
function select(id) {
  selectedId.value = id;
  focusSelected();
}
function setOpen(id, open) {
  if (open) expanded.add(id);
  else expanded.delete(id);
}
const siblingsOf = (parentId) =>
  parentId === null ? tree : locate(tree, parentId).node.children;

function startNew(type) {
  let parentId = null;
  const node = selected.value;
  if (node)
    parentId =
      node.type === "folder"
        ? node.id
        : (locate(tree, node.id).parent?.id ?? null);
  if (parentId) setOpen(parentId, true);
  editing.value = { kind: "new", parentId, type };
  error.value = "";
}

function startRename(node) {
  if (!node) return;
  selectedId.value = node.id;
  editing.value = { kind: "rename", id: node.id };
  error.value = "";
}

function cancel() {
  editing.value = null;
  error.value = "";
  focusSelected();
}

function commit(raw) {
  const name = raw.trim();
  if (!name) return cancel();
  const e = editing.value;
  const parentId =
    e.kind === "new" ? e.parentId : (locate(tree, e.id).parent?.id ?? null);
  const problem = validateName(
    siblingsOf(parentId),
    name,
    e.kind === "rename" ? e.id : null,
  );
  if (problem) {
    error.value = problem;
    return;
  }
  if (e.kind === "new") {
    const node = { id: makeId(), name, type: e.type };
    if (e.type === "folder") node.children = [];
    siblingsOf(parentId).push(node);
    selectedId.value = node.id;
    status.value = "Created " + name;
  } else {
    locate(tree, e.id).node.name = name;
    status.value = "Renamed to " + name;
  }
  editing.value = null;
  error.value = "";
  focusSelected();
}

function remove(node) {
  if (!node) return;
  const inside = countDescendants(node);
  const { siblings, parent } = locate(tree, node.id);
  siblings.splice(
    siblings.findIndex((s) => s.id === node.id),
    1,
  );
  select(parent ? parent.id : null);
  status.value =
    "Deleted " +
    node.name +
    (inside
      ? " and " + inside + " item" + (inside === 1 ? "" : "s") + " inside"
      : "");
}

function onRowClick(node) {
  selectedId.value = node.id;
  if (node.type === "folder") setOpen(node.id, !expanded.has(node.id));
}

function onKeyDown(e, id) {
  const list = rows.value;
  const i = list.findIndex((r) => r.id === id);
  const { node, parentId } = list[i];
  const isFolder = node.type === "folder";
  const open = expanded.has(id);
  if (e.key === "ArrowDown") {
    if (list[i + 1]) select(list[i + 1].id);
  } else if (e.key === "ArrowUp") {
    if (list[i - 1]) select(list[i - 1].id);
  } else if (e.key === "ArrowRight") {
    if (isFolder && !open) setOpen(id, true);
    else if (isFolder && node.children.length) select(list[i + 1].id);
  } else if (e.key === "ArrowLeft") {
    if (isFolder && open) setOpen(id, false);
    else if (parentId) select(parentId);
  } else if (e.key === "Enter") {
    selectedId.value = id;
    if (isFolder) setOpen(id, !open);
  } else if (e.key === "F2") startRename(node);
  else if (e.key === "Delete") remove(node);
  else return;
  e.preventDefault();
}

// reactive() unwraps the refs, so children read
// api.selectedId, not api.selectedId.value
provide(
  "explorer",
  reactive({
    expanded,
    selectedId,
    tabStopId,
    editing,
    error,
    onRowClick,
    onKeyDown,
    commit,
    cancel,
  }),
);
</script>

<template>
  <div class="app">
    <h1>Files</h1>
    <div class="toolbar" role="toolbar" aria-label="File actions">
      <button data-testid="new-file" @click="startNew('file')">+ File</button>
      <button
        data-testid="new-folder"
        @click="startNew('folder')"
      >+ Folder</button>
      <button
        data-testid="rename"
        :disabled="!selected"
        @click="startRename(selected)"
      >Rename</button>
      <button
        data-testid="delete"
        :disabled="!selected"
        @click="remove(selected)"
      >Delete</button>
    </div>
    <ul ref="treeEl" role="tree" aria-label="Project files" class="tree">
      <TreeNode
        v-for="node in topLevel"
        :key="node.id"
        :node="node"
        :depth="1"
      />
      <li
        v-if="editing?.kind === 'new' && editing.parentId === null"
        role="none"
      >
        <div class="row" style="padding-left: 8px">
          <span class="chevron"></span>
          <span aria-hidden="true">{{ editing.type === 'folder' ? '📁' : '📄' }}</span>
          <NameInput
            :label="'New ' + editing.type + ' name'"
            :error="error"
            @commit="commit"
            @cancel="cancel"
          />
        </div>
      </li>
    </ul>
    <p class="status" role="status" data-testid="status">{{ status }}</p>
  </div>
</template>

<style>
body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.app {
  max-width: 520px;
  margin: 0 auto;
  padding: 16px;
}
h1 {
  font-size: 18px;
  margin: 0 0 12px;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
button {
  background: #1d2230;
  color: #e6e6e6;
  border: 1px solid #343b4f;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
}
button:disabled {
  opacity: 0.45;
  cursor: default;
}
.tree,
.tree ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
.tree {
  background: #161a23;
  border: 1px solid #262c3b;
  border-radius: 8px;
  padding: 6px 0;
}
.row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
}
.row:hover {
  background: #1f2533;
}
.row.selected {
  background: #263354;
}
[role="treeitem"]:focus {
  outline: none;
}
[role="treeitem"]:focus-visible > .row {
  outline: 2px solid #6ea8ff;
  outline-offset: -2px;
}
.chevron {
  width: 12px;
  color: #8a93a8;
}
.edit {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}
.edit input {
  background: #0f1115;
  color: #e6e6e6;
  border: 1px solid #6ea8ff;
  border-radius: 4px;
  padding: 3px 6px;
}
.error {
  color: #ff8a80;
  font-size: 12px;
}
.status {
  min-height: 1.2em;
  color: #9aa3b5;
  font-size: 13px;
}
</style>
`,
          "/src/components/NameInput.vue": `<script setup>
import { onMounted, ref } from "vue";

const props = defineProps({
  initial: { type: String, default: "" },
  label: { type: String, required: true },
  error: { type: String, default: "" },
});
const emit = defineEmits(["commit", "cancel"]);

const value = ref(props.initial);
const el = ref(null);
onMounted(() => {
  el.value.focus();
  el.value.select();
});
</script>

<template>
  <span class="edit" @click.stop>
    <input
      ref="el"
      v-model="value"
      data-testid="name-input"
      :aria-label="label"
      :aria-invalid="error ? 'true' : undefined"
      @keydown.enter.prevent="emit('commit', value)"
      @keydown.escape.prevent="emit('cancel')"
    />
    <span v-if="error" role="alert" class="error">{{ error }}</span>
  </span>
</template>
`,
          "/src/components/TreeNode.vue": `<script setup>
import { computed, inject } from "vue";
import NameInput from "./NameInput.vue";
import { sortNodes } from "../treeData.js";

const props = defineProps({
  node: { type: Object, required: true },
  depth: { type: Number, default: 1 },
});
// Shared explorer state comes from App.vue through provide / inject, so the
// recursion only passes what changes per level: the node and its depth.
const api = inject("explorer");

const isFolder = computed(() => props.node.type === "folder");
const open = computed(() => isFolder.value && api.expanded.has(props.node.id));
const selected = computed(() => api.selectedId === props.node.id);
const renaming = computed(
  () => api.editing?.kind === "rename" && api.editing.id === props.node.id,
);
const creatingHere = computed(
  () => api.editing?.kind === "new" && api.editing.parentId === props.node.id,
);
const children = computed(() =>
  open.value ? sortNodes(props.node.children) : [],
);
const indent = computed(() => ({
  paddingLeft: 8 + (props.depth - 1) * 16 + "px",
}));
</script>

<template>
  <li
    role="treeitem"
    :aria-level="depth"
    :aria-expanded="isFolder ? String(open) : undefined"
    :aria-selected="String(selected)"
    :tabindex="api.tabStopId === node.id ? 0 : -1"
    :data-id="node.id"
    :data-name="node.name"
    @keydown.self="api.onKeyDown($event, node.id)"
  >
    <div
      class="row"
      :class="{ selected }"
      :style="indent"
      @click="api.onRowClick(node)"
    >
      <span
        class="chevron"
        aria-hidden="true"
      >{{ isFolder ? (open ? '▾' : '▸') : '' }}</span>
      <span aria-hidden="true">{{ isFolder ? '📁' : '📄' }}</span>
      <NameInput
        v-if="renaming"
        :initial="node.name"
        :label="'Rename ' + node.name"
        :error="api.error"
        @commit="api.commit"
        @cancel="api.cancel"
      />
      <span v-else class="name">{{ node.name }}</span>
    </div>
    <ul v-if="open" role="group">
      <!-- The component renders itself: Vue resolves TreeNode from this file name. -->
      <TreeNode
        v-for="child in children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
      />
      <li v-if="creatingHere" role="none">
        <div class="row" :style="{ paddingLeft: 8 + depth * 16 + 'px' }">
          <span class="chevron"></span>
          <span aria-hidden="true">{{ api.editing.type === 'folder' ? '📁' : '📄' }}</span>
          <NameInput
            :label="'New ' + api.editing.type + ' name'"
            :error="api.error"
            @commit="api.commit"
            @cancel="api.cancel"
          />
        </div>
      </li>
    </ul>
  </li>
</template>
`,
          "/src/treeData.js": `// Data and lookups for a NESTED tree: [{ id,
// name, type: 'folder' | 'file', children? }]
// Vue tracks nested arrays and objects, so App.vue mutates this tree in place.

let nextId = 1;
export const makeId = () => "n" + nextId++;

export const createTree = () => [
  {
    id: "src",
    name: "src",
    type: "folder",
    children: [
      {
        id: "components",
        name: "components",
        type: "folder",
        children: [
          { id: "modal", name: "Modal.jsx", type: "file" },
          { id: "button", name: "Button.jsx", type: "file" },
        ],
      },
      { id: "app", name: "App.jsx", type: "file" },
      { id: "index", name: "index.js", type: "file" },
    ],
  },
  {
    id: "public",
    name: "public",
    type: "folder",
    children: [{ id: "favicon", name: "favicon.ico", type: "file" }],
  },
  { id: "readme", name: "README.md", type: "file" },
  { id: "pkg", name: "package.json", type: "file" },
];

// Folders first, then A-Z. Returns a sorted
// COPY so the stored order is untouched.
export function sortNodes(nodes) {
  return [...nodes].sort((a, b) =>
    a.type !== b.type
      ? a.type === "folder"
        ? -1
        : 1
      : a.name.localeCompare(b.name),
  );
}

// Finds a node together with the array that holds it and its parent folder.
export function locate(nodes, id, parent = null) {
  for (const node of nodes) {
    if (node.id === id) return { node, siblings: nodes, parent };
    if (node.children) {
      const hit = locate(node.children, id, node);
      if (hit) return hit;
    }
  }
  return null;
}

export function countDescendants(node) {
  return (node.children || []).reduce(
    (sum, c) => sum + 1 + countDescendants(c),
    0,
  );
}

export function visibleRows(
  nodes,
  expanded,
  depth = 1,
  parentId = null,
  out = [],
) {
  for (const n of sortNodes(nodes)) {
    out.push({ id: n.id, parentId, depth, node: n });
    if (n.children && expanded.has(n.id))
      visibleRows(n.children, expanded, depth + 1, n.id, out);
  }
  return out;
}

export function validateName(siblings, name, exceptId) {
  const clash = siblings.some(
    (s) => s.id !== exceptId && s.name.toLowerCase() === name.toLowerCase(),
  );
  return clash
    ? 'A file or folder named "' + name + '" already exists here'
    : "";
}
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Frontend candidates who know basic Angular (standalone components, \`@Input\`, templates) and want to build a tree view with signals.
**Difficulty:** Medium

> **How to read this doc:** Plain words first, then a <code>📌 Interview term:</code> tag with the exact vocabulary. Every snippet is from the runnable Angular solution beside this tutorial, which was booted on Angular 22.2.3 both ahead-of-time with strict templates and with the playground runtime compiler; the Verified section quotes that run.

## 1. Why This Even Matters — A Story First

In a filing cabinet, a folder is just a smaller cabinet: it can hold papers and more folders. So you only need one way to look at "a thing in the cabinet", applied again inside every folder you open. A file explorer is that idea as a component: one component draws an item, and if the item is an open folder it draws itself for each child.

Angular adds two interesting twists: the component can be its own \`<li>\` (so the HTML stays a clean list), and all state lives in signals that the recursive children read from one injected store.

## 2. Requirements and Plan

Recursive render (folders first, A to Z), toggle folders, select, New file / New folder / Rename / Delete with an inline input and a duplicate check, and the ARIA tree keys.

| Piece | Angular tool | Why |
| :--- | :--- | :--- |
| \`tree\`, \`expanded\`, \`selectedId\`, \`editing\`, \`error\`, \`status\` | \`signal()\` in \`ExplorerStore\` | Zoneless rendering re-runs a template when a signal it read changes |
| \`rows\`, \`selected\`, \`tabStopId\` | \`computed()\` | Derived and cached |
| store scope | \`providers: [ExplorerStore]\` on \`AppComponent\` | One store per explorer, shared by every recursive node through \`inject()\` |
| node and depth | \`@Input()\` | Signal \`input()\` does not register under the playground JIT |

📌 **Interview term: Signals** — reactive values read by calling them (\`tree()\`), written with \`set\` or \`update\`. A \`computed()\` caches a value derived from other signals. See [Angular signals](/interview-question/what-are-angular-signals). Signals compare with \`Object.is\`, so an update must produce a new object, which is why this solution copies on write.

📌 **Interview term: Component-level provider** — listing a service in a component \`providers\` creates one instance for that component and its descendants, instead of one for the whole app. See [root vs component providers](/interview-question/what-is-the-difference-between-providing-a-service-in-root-vs-in-a-component).

## 3. Build It Step by Step

### Step 1: The node component is its own \`<li>\`

📌 **Interview term: Attribute selector component** — a selector like \`li[app-tree-node]\` makes the matched \`<li>\` itself the component host, so no extra wrapper element sits between \`ul\` and \`li\`. The ARIA tree pattern relies on that \`ul > li\` shape, and \`host\` bindings put \`role\`, \`aria-*\` and the keydown listener on the \`<li>\`.

~~~ts
@Component({
  selector: 'li[app-tree-node]',
  standalone: true,
  imports: [NameInputComponent, forwardRef(() => TreeNodeComponent)],
  host: {
    role: 'treeitem',
    '[attr.aria-level]': 'depth',
    '[attr.aria-expanded]': 'isFolder ? open : null',
    '[attr.aria-selected]': 'selected',
    '[attr.tabindex]': 'store.tabStopId() === node.id ? 0 : -1',
    '[attr.data-id]': 'node.id',
    '[attr.data-name]': 'node.name',
    '(keydown)': 'onKey($event)',
  },
~~~

### Step 2: Recursion, and a JIT surprise

The template renders more \`<li app-tree-node>\` for the children with the built-in control flow (see [@for and track](/interview-question/why-does-for-require-track-and-how-does-empty-improve-ux)):

~~~ts
@if (open) {
  <ul role="group">
    @for (child of children; track child.id) {
      <li app-tree-node [node]="child" [depth]="depth + 1"></li>
    }
    @if (newType; as type) {
      <li role="none">
        <div class="row" [style.padding-left.px]="8 + depth * 16">
          <span class="chevron"></span>
          <span aria-hidden="true">{{ type === 'folder' ? '📁' : '📄' }}</span>
          <app-name-input [label]="'New ' + type + ' name'" [error]="store.error()"
            (commit)="store.commit($event)" (cancel)="store.cancel()" />
        </div>
      </li>
    }
  </ul>
}
~~~

Standalone components may use their own selector. While building the sibling [toolbar question](/interview-question/build-a-file-explorer-toolbar-breadcrumbs-search-context-menu), a recursive component with no \`imports\` array passed the AOT build but failed in the playground runtime compiler with \`NG0303: Can't bind to 'node' since it isn't a known property of 'li'\`. Listing the component in its own \`imports\` through \`forwardRef\` (the class is not defined yet when the decorator runs) fixed it in both modes, so every recursive component in this batch does that.

### Step 3: Getters for input-based values

~~~ts
// Getters, not computed(): @Input fields
// are plain properties, and the template
// re-reads these on every check while
// the signals inside them stay tracked.
get isFolder() {
  return this.node.type === "folder";
}
get open() {
  return this.isFolder && this.store.expanded().has(this.node.id);
}
get selected() {
  return this.store.selectedId() === this.node.id;
}
get renaming() {
  const e = this.store.editing();
  return e?.kind === "rename" && e.id === this.node.id;
}
get newType() {
  const e = this.store.editing();
  return e?.kind === "new" && e.parentId === this.node.id
    ? e.type
    : null;
}
get children() {
  return sortNodes(this.node.children ?? []);
}
~~~

\`node\` and \`depth\` are plain \`@Input\` fields, which a \`computed()\` cannot track. Getters are re-read whenever the template is checked, and the signals they call (\`expanded()\`, \`selectedId()\`) are still tracked, so changing a signal re-renders exactly the nodes that read it. See [computed vs getters](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls).

### Step 4: Copy-on-write updates in the store

~~~ts
commit(raw: string) {
  const name = raw.trim();
  const e = this.editing();
  if (!e) return;
  if (!name) {
    this.cancel();
    return;
  }
  const parentId =
    e.kind === "new"
      ? e.parentId
      : (findParentId(this.tree(), e.id) ?? null);
  const problem = validateName(
    this.tree(),
    parentId,
    name,
    e.kind === "rename" ? e.id : null,
  );
  if (problem) {
    this.error.set(problem);
    return;
  }
  if (e.kind === "new") {
    const node: FsNode = { id: makeId(), name, type: e.type };
    if (e.type === "folder") node.children = [];
    this.tree.update((t) => insertNode(t, parentId, node));
    this.selectedId.set(node.id);
    this.status.set("Created " + name);
  } else {
    this.tree.update((t) =>
      updateNode(t, e.id, (n) => ({ ...n, name })),
    );
    this.status.set("Renamed to " + name);
  }
  this.editing.set(null);
  this.error.set("");
  this.focusSelected();
}
~~~

\`insertNode\`, \`updateNode\` and \`removeNode\` in \`tree-utils.ts\` copy only the folders on the path to the change, so \`tree.update(...)\` always receives a new array reference (that is what tells the signal it changed), while untouched branches keep their objects.

### Step 5: Keyboard and focus after render

Each host \`<li>\` listens to \`keydown\`, but only acts when \`e.target === e.currentTarget\`; otherwise one key press on a deep row would run in every ancestor. The store moves focus once Angular has rendered:

~~~ts
private focusSelected() {
  afterNextRender(
    () => {
      const id = this.selectedId();
      if (id)
        this.host.nativeElement
          .querySelector<HTMLElement>(\`[data-id="\${id}"]\`)
          ?.focus();
    },
    { injector: this.injector },
  );
}
~~~

📌 **Interview term: afterNextRender** — runs a callback once, after Angular next finishes rendering, which is the right moment to touch the new DOM. It needs an injection context, so the store passes its \`Injector\`. The store also injects \`ElementRef\`: because it is provided by \`AppComponent\`, that is the app host element, which scopes the \`querySelector\`.

## 4. Verified

The solution was run twice by \`scripts/verify-mc-solution.mjs\`: compiled with \`ngc\` and \`strictTemplates\`, and transpiled for the runtime JIT compiler the playground uses, each booted with \`bootstrapApplication(AppComponent)\` and no providers, in jsdom. Both runs printed the same lines; this is the JIT run (the AOT run differs only in the \`[angular:app]\` tag):

~~~text
[angular:playground] RENDERED: Files+ File+ FolderRenameDelete▸📁public▸📁src📄package.json📄README.md
[angular:playground] tree: > public  > src  package.json  README.md
[angular:playground] roles: Project files | tab stops: 1
[angular:playground] click src: > public  v src  .> components  .App.jsx  .index.js  package.json  README.md
[angular:playground] ArrowDown -> focus: components
[angular:playground] ArrowRight: > public  v src  .v components  ..Button.jsx  ..Modal.jsx  .App.jsx  .index.js  package.json  README.md
[angular:playground] ArrowDown -> focus: Button.jsx | aria-selected: true
[angular:playground] ArrowLeft on file -> focus: components
[angular:playground] ArrowLeft on open folder: > public  v src  .> components  .App.jsx  .index.js  package.json  README.md
[angular:playground] new file input: New file name | focused: true
[angular:playground] after Enter: > public  v src  .v components  ..Button.jsx  ..Card.jsx  ..Modal.jsx  .App.jsx  .index.js  package.json  README.md
[angular:playground] status: Created Card.jsx | focus: Card.jsx
[angular:playground] duplicate: A file or folder named "button.jsx" already exists here | input still open: true
[angular:playground] after Escape: input open: false | tree: > public  v src  .v components  ..Button.jsx  ..Card.jsx  ..Modal.jsx  .App.jsx  .index.js  package.json  README.md
[angular:playground] rename input value: README.md
[angular:playground] after rename: > public  v src  .v components  ..Button.jsx  ..Card.jsx  ..Modal.jsx  .App.jsx  .index.js  NOTES.md  package.json
[angular:playground] Delete key on src: Deleted src and 6 items inside
[angular:playground] tree: > public  NOTES.md  package.json
[angular:playground] new root folder: > docs  > public  NOTES.md  package.json | selected: docs
~~~

The output matches React and Vue exactly: arrows move focus and open or close folders, the new file lands sorted and focused, a case-insensitive duplicate is refused, renaming re-sorts, and deleting \`src\` reports 6 descendants. No \`console.error\` in either mode. Not checked here: layout, focus styling and screen-reader speech.

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| New item in a closed folder | Parent opened first |
| Delete the selection | Selection and focus go to the parent |
| Duplicate or empty name | Alert and stay open, or cancel |
| ARIA | Host bindings set \`role="treeitem"\`, \`aria-level\`, \`aria-expanded\` (null on files removes it), \`aria-selected\`, roving \`tabindex\` |
| Styles | \`ViewEncapsulation.None\` on the root, because emulated encapsulation would not style the recursive child components |

## 6. Common Pitfalls

- **Mutating a node inside a signal.** \`tree().find(...).name = x\` changes the object but not the reference, so nothing re-renders. Use \`update\` with a copy.
- **A recursive component with no \`imports\`.** Fine in AOT, \`NG0303\` in the playground JIT; add \`forwardRef(() => Self)\` to \`imports\`.
- **\`computed()\` over an \`@Input\` field.** It is computed once and never updates; use a getter or a signal input where available.
- **An element selector for the node.** \`<app-tree-node>\` inside \`<ul>\` breaks the list and tree semantics; use \`li[app-tree-node]\`.
- **Focusing in the same tick as the signal update.** Zoneless rendering has not run yet; use \`afterNextRender\`.
- **Setting state in a plain field from a timer.** Without zone.js nothing schedules a render; keep UI state in signals.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State:</strong> <span style="color:#f0e2c8;">"All state is signals in an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ExplorerStore</code> provided on the root component: the tree, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> of expanded ids, the selected id and an editing draft. Visible rows are a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Recursion:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">li[app-tree-node]</code> is the host <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;li&gt;</code> and renders <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@for</code> over its sorted children with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">track child.id</code>. It lists itself in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">imports</code> via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">forwardRef</code> so the runtime compiler finds it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Inputs:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">depth</code> are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Input</code>s; values derived from them are getters, and the signals those getters call stay tracked."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Edits:</strong> <span style="color:#f0e2c8;">"Edits are copy-on-write helpers by id, passed to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tree.update</code>, so the signal sees a new reference and untouched branches keep identity."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Keyboard:</strong> <span style="color:#f0e2c8;">"Roving <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tabindex</code> through host bindings, a target check on keydown, arrow keys over the computed rows, and focus moved in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterNextRender</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a service instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@Output</code> events up the tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every level would have to re-emit its children's events. Injecting one component-scoped store gives every depth the same state and actions directly, and two explorers on a page still get separate stores.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">OnPush</code> help?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With signals and zoneless change detection, components already re-render only when a signal they read changes. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OnPush</code> adds little here; the bigger win for a huge tree is a virtual scroll over the flattened rows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">TestBed with the standalone component, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fixture.detectChanges()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await fixture.whenStable()</code>, dispatch a keydown on a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">treeitem</code> and assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.activeElement</code> and the rendered rows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would lazy loading fit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mark unloaded folders with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">children: undefined</code>, call a service on first expand, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">update</code> the folder when the result arrives; a per-id loading signal drives a spinner row.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Signals | Reactive values read by calling them, updated by reference |
| Component-level provider | A service instance scoped to one component subtree |
| Attribute selector component | A component whose host is an existing element such as \`li\` |
| afterNextRender | Run code once after the next render |
| Copy-on-write | Return new objects along the changed path |

---

**Conclusion:** The Angular explorer is one attribute-selector component that renders itself, a component-scoped signal store with copy-on-write tree helpers, getters for input-derived values, and \`afterNextRender\` for focus. Remember the \`forwardRef\` self-import for the playground compiler, and the same structure carries straight into the [drag-and-drop version](/interview-question/build-a-file-explorer-with-nested-drag-and-drop).`,
        files: {
          "/src/app/app.component.ts": `import { Component, ViewEncapsulation, computed, inject } from "@angular/core";
import { ExplorerStore } from "./explorer.store";
import { NameInputComponent } from "./name-input.component";
import { TreeNodeComponent } from "./tree-node.component";
import { sortNodes } from "./tree-utils";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [TreeNodeComponent, NameInputComponent],
  providers: [ExplorerStore],
  // the recursive children share these styles
  encapsulation: ViewEncapsulation.None,
  template: \`
    <div class="app">
      <h1>Files</h1>
      <div class="toolbar" role="toolbar" aria-label="File actions">
        <button
          data-testid="new-file"
          (click)="store.startNew('file')"
        >+ File</button>
        <button
          data-testid="new-folder"
          (click)="store.startNew('folder')"
        >+ Folder</button>
        <button
          data-testid="rename"
          [disabled]="!store.selected()"
          (click)="store.startRename(store.selected())"
        >Rename</button>
        <button
          data-testid="delete"
          [disabled]="!store.selected()"
          (click)="store.remove(store.selected())"
        >Delete</button>
      </div>
      <ul role="tree" aria-label="Project files" class="tree">
        @for (node of topLevel(); track node.id) {
          <li app-tree-node [node]="node" [depth]="1"></li>
        }
        @if (rootNewType(); as type) {
          <li role="none">
            <div class="row" style="padding-left: 8px">
              <span class="chevron"></span>
              <span aria-hidden="true">{{ type === 'folder' ? '📁' : '📄' }}</span>
              <app-name-input [label]="'New ' + type + ' name'" [error]="store.error()"
                (commit)="store.commit($event)" (cancel)="store.cancel()" />
            </div>
          </li>
        }
      </ul>
      <p
        class="status"
        role="status"
        data-testid="status"
      >{{ store.status() }}</p>
    </div>
  \`,
  styles: [
    \`
    body { margin: 0; background: #0f1115; color: #e6e6e6; font-family: system-ui, sans-serif; }
    .app { max-width: 520px; margin: 0 auto; padding: 16px; }
    h1 { font-size: 18px; margin: 0 0 12px; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
    button { background: #1d2230; color: #e6e6e6; border: 1px solid #343b4f; border-radius: 6px; padding: 6px 10px; cursor: pointer; }
    button:disabled { opacity: 0.45; cursor: default; }
    .tree, .tree ul { list-style: none; margin: 0; padding: 0; }
    .tree { background: #161a23; border: 1px solid #262c3b; border-radius: 8px; padding: 6px 0; }
    .row { display: flex; align-items: center; gap: 6px; padding: 4px 8px; cursor: pointer; border-radius: 4px; }
    .row:hover { background: #1f2533; }
    .row.selected { background: #263354; }
    [role="treeitem"]:focus { outline: none; }
    [role="treeitem"]:focus-visible > .row { outline: 2px solid #6ea8ff; outline-offset: -2px; }
    .chevron { width: 12px; color: #8a93a8; }
    .edit { display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .edit input { background: #0f1115; color: #e6e6e6; border: 1px solid #6ea8ff; border-radius: 4px; padding: 3px 6px; }
    .error { color: #ff8a80; font-size: 12px; }
    .status { min-height: 1.2em; color: #9aa3b5; font-size: 13px; }
  \`,
  ],
})
export class AppComponent {
  store = inject(ExplorerStore);
  topLevel = computed(() => sortNodes(this.store.tree()));
  rootNewType = computed(() => {
    const e = this.store.editing();
    return e?.kind === "new" && e.parentId === null ? e.type : null;
  });
}
`,
          "/src/app/explorer.store.ts": `import {
  ElementRef,
  Injectable,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
} from "@angular/core";
import {
  FsNode,
  initialTree,
  makeId,
  findNode,
  findParentId,
  updateNode,
  removeNode,
  insertNode,
  countDescendants,
  visibleRows,
  validateName,
} from "./tree-utils";

export type Editing =
  | { kind: "new"; parentId: string | null; type: "file" | "folder" }
  | { kind: "rename"; id: string };

// One store per explorer: AppComponent lists it in \`providers\`, every
// recursive tree node injects the same instance.
@Injectable()
export class ExplorerStore {
  // the AppComponent element
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private injector = inject(Injector);

  readonly tree = signal<FsNode[]>(initialTree);
  readonly expanded = signal<ReadonlySet<string>>(new Set());
  readonly selectedId = signal<string | null>(null);
  readonly editing = signal<Editing | null>(null);
  readonly error = signal("");
  readonly status = signal("");

  readonly rows = computed(() => visibleRows(this.tree(), this.expanded()));
  readonly selected = computed(() => {
    const id = this.selectedId();
    return id ? findNode(this.tree(), id) : null;
  });
  readonly tabStopId = computed(() => {
    const rows = this.rows();
    const id = this.selectedId();
    return rows.some((r) => r.id === id) ? id : (rows[0]?.id ?? null);
  });

  private focusSelected() {
    afterNextRender(
      () => {
        const id = this.selectedId();
        if (id)
          this.host.nativeElement
            .querySelector<HTMLElement>(\`[data-id="\${id}"]\`)
            ?.focus();
      },
      { injector: this.injector },
    );
  }

  select(id: string | null) {
    this.selectedId.set(id);
    this.focusSelected();
  }

  setOpen(id: string, open: boolean) {
    this.expanded.update((prev) => {
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  startNew(type: "file" | "folder") {
    const node = this.selected();
    let parentId: string | null = null;
    if (node)
      parentId =
        node.type === "folder"
          ? node.id
          : (findParentId(this.tree(), node.id) ?? null);
    if (parentId) this.setOpen(parentId, true);
    this.editing.set({ kind: "new", parentId, type });
    this.error.set("");
  }

  startRename(node: FsNode | null) {
    if (!node) return;
    this.selectedId.set(node.id);
    this.editing.set({ kind: "rename", id: node.id });
    this.error.set("");
  }

  cancel() {
    this.editing.set(null);
    this.error.set("");
    this.focusSelected();
  }

  commit(raw: string) {
    const name = raw.trim();
    const e = this.editing();
    if (!e) return;
    if (!name) {
      this.cancel();
      return;
    }
    const parentId =
      e.kind === "new" ? e.parentId : (findParentId(this.tree(), e.id) ?? null);
    const problem = validateName(
      this.tree(),
      parentId,
      name,
      e.kind === "rename" ? e.id : null,
    );
    if (problem) {
      this.error.set(problem);
      return;
    }
    if (e.kind === "new") {
      const node: FsNode = { id: makeId(), name, type: e.type };
      if (e.type === "folder") node.children = [];
      this.tree.update((t) => insertNode(t, parentId, node));
      this.selectedId.set(node.id);
      this.status.set("Created " + name);
    } else {
      this.tree.update((t) => updateNode(t, e.id, (n) => ({ ...n, name })));
      this.status.set("Renamed to " + name);
    }
    this.editing.set(null);
    this.error.set("");
    this.focusSelected();
  }

  remove(node: FsNode | null) {
    if (!node) return;
    const inside = countDescendants(node);
    const parentId = findParentId(this.tree(), node.id) ?? null;
    this.tree.update((t) => removeNode(t, node.id));
    this.select(parentId);
    this.status.set(
      "Deleted " +
        node.name +
        (inside
          ? " and " + inside + " item" + (inside === 1 ? "" : "s") + " inside"
          : ""),
    );
  }

  onRowClick(node: FsNode) {
    this.selectedId.set(node.id);
    if (node.type === "folder")
      this.setOpen(node.id, !this.expanded().has(node.id));
  }

  onKeyDown(e: KeyboardEvent, id: string) {
    const rows = this.rows();
    const i = rows.findIndex((r) => r.id === id);
    const { node, parentId } = rows[i];
    const isFolder = node.type === "folder";
    const open = this.expanded().has(id);
    if (e.key === "ArrowDown") {
      if (rows[i + 1]) this.select(rows[i + 1].id);
    } else if (e.key === "ArrowUp") {
      if (rows[i - 1]) this.select(rows[i - 1].id);
    } else if (e.key === "ArrowRight") {
      if (isFolder && !open) this.setOpen(id, true);
      else if (isFolder && node.children?.length) this.select(rows[i + 1].id);
    } else if (e.key === "ArrowLeft") {
      if (isFolder && open) this.setOpen(id, false);
      else if (parentId) this.select(parentId);
    } else if (e.key === "Enter") {
      this.selectedId.set(id);
      if (isFolder) this.setOpen(id, !open);
    } else if (e.key === "F2") this.startRename(node);
    else if (e.key === "Delete") this.remove(node);
    else return;
    e.preventDefault();
  }
}
`,
          "/src/app/name-input.component.ts": `import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  signal,
} from "@angular/core";

@Component({
  selector: "app-name-input",
  standalone: true,
  template: \`
    <span class="edit" (click)="$event.stopPropagation()">
      <input
        #box
        data-testid="name-input"
        [attr.aria-label]="label"
        [attr.aria-invalid]="error ? 'true' : null"
        [value]="value()"
        (input)="value.set(box.value)"
        (keydown.enter)="$event.preventDefault(); commit.emit(value())"
        (keydown.escape)="$event.preventDefault(); cancel.emit()"
      />
      @if (error) {
        <span role="alert" class="error">{{ error }}</span>
      }
    </span>
  \`,
})
export class NameInputComponent implements OnInit, AfterViewInit {
  @Input() initial = "";
  @Input() label = "";
  @Input() error = "";
  @Output() commit = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();
  @ViewChild("box") box!: ElementRef<HTMLInputElement>;

  value = signal("");

  ngOnInit() {
    this.value.set(this.initial);
  }

  ngAfterViewInit() {
    this.box.nativeElement.focus();
    this.box.nativeElement.select();
  }
}
`,
          "/src/app/tree-node.component.ts": `import { Component, Input, forwardRef, inject } from "@angular/core";
import { ExplorerStore } from "./explorer.store";
import { NameInputComponent } from "./name-input.component";
import { FsNode, sortNodes } from "./tree-utils";

// An attribute selector makes the <li> itself
// the component host, so the DOM stays
// ul > li > ul > li, the shape the ARIA tree pattern expects. The template uses
// its own selector for the children; listing itself in imports (via forwardRef,
// because the class is not defined yet)
// keeps that working under runtime JIT too.
@Component({
  selector: "li[app-tree-node]",
  standalone: true,
  imports: [NameInputComponent, forwardRef(() => TreeNodeComponent)],
  host: {
    role: "treeitem",
    "[attr.aria-level]": "depth",
    "[attr.aria-expanded]": "isFolder ? open : null",
    "[attr.aria-selected]": "selected",
    "[attr.tabindex]": "store.tabStopId() === node.id ? 0 : -1",
    "[attr.data-id]": "node.id",
    "[attr.data-name]": "node.name",
    "(keydown)": "onKey($event)",
  },
  template: \`
    <div
      class="row"
      [class.selected]="selected"
      [style.padding-left.px]="8 + (depth - 1) * 16"
      (click)="store.onRowClick(node)"
    >
      <span class="chevron" aria-hidden="true">{{
        isFolder ? (open ? "▾" : "▸") : ""
      }}</span>
      <span aria-hidden="true">{{ isFolder ? "📁" : "📄" }}</span>
      @if (renaming) {
        <app-name-input
          [initial]="node.name"
          [label]="'Rename ' + node.name"
          [error]="store.error()"
          (commit)="store.commit($event)"
          (cancel)="store.cancel()"
        />
      } @else {
        <span class="name">{{ node.name }}</span>
      }
    </div>
    @if (open) {
      <ul role="group">
        @for (child of children; track child.id) {
          <li app-tree-node [node]="child" [depth]="depth + 1"></li>
        }
        @if (newType; as type) {
          <li role="none">
            <div class="row" [style.padding-left.px]="8 + depth * 16">
              <span class="chevron"></span>
              <span aria-hidden="true">{{
                type === "folder" ? "📁" : "📄"
              }}</span>
              <app-name-input
                [label]="'New ' + type + ' name'"
                [error]="store.error()"
                (commit)="store.commit($event)"
                (cancel)="store.cancel()"
              />
            </div>
          </li>
        }
      </ul>
    }
  \`,
})
export class TreeNodeComponent {
  @Input({ required: true }) node!: FsNode;
  @Input() depth = 1;
  store = inject(ExplorerStore);

  // Getters, not computed(): @Input fields
  // are plain properties, and the template
  // re-reads these on every check while the signals inside them stay tracked.
  get isFolder() {
    return this.node.type === "folder";
  }
  get open() {
    return this.isFolder && this.store.expanded().has(this.node.id);
  }
  get selected() {
    return this.store.selectedId() === this.node.id;
  }
  get renaming() {
    const e = this.store.editing();
    return e?.kind === "rename" && e.id === this.node.id;
  }
  get newType() {
    const e = this.store.editing();
    return e?.kind === "new" && e.parentId === this.node.id ? e.type : null;
  }
  get children() {
    return sortNodes(this.node.children ?? []);
  }

  onKey(e: KeyboardEvent) {
    if (e.target === e.currentTarget) this.store.onKeyDown(e, this.node.id);
  }
}
`,
          "/src/app/tree-utils.ts": `// Pure, typed helpers for a NESTED tree. Signals compare by reference, so every
// update returns a new array and copies only
// the folders on the path to the change.

export interface FsNode {
  id: string;
  name: string;
  type: "folder" | "file";
  children?: FsNode[];
}

export interface Row {
  id: string;
  parentId: string | null;
  depth: number;
  node: FsNode;
}

let nextId = 1;
export const makeId = () => "n" + nextId++;

export const initialTree: FsNode[] = [
  {
    id: "src",
    name: "src",
    type: "folder",
    children: [
      {
        id: "components",
        name: "components",
        type: "folder",
        children: [
          { id: "modal", name: "Modal.jsx", type: "file" },
          { id: "button", name: "Button.jsx", type: "file" },
        ],
      },
      { id: "app", name: "App.jsx", type: "file" },
      { id: "index", name: "index.js", type: "file" },
    ],
  },
  {
    id: "public",
    name: "public",
    type: "folder",
    children: [{ id: "favicon", name: "favicon.ico", type: "file" }],
  },
  { id: "readme", name: "README.md", type: "file" },
  { id: "pkg", name: "package.json", type: "file" },
];

// Folders first, then A-Z. Used for rendering
// AND for keyboard order, so they agree.
export function sortNodes(nodes: FsNode[]): FsNode[] {
  return [...nodes].sort((a, b) =>
    a.type !== b.type
      ? a.type === "folder"
        ? -1
        : 1
      : a.name.localeCompare(b.name),
  );
}

export function findNode(nodes: FsNode[], id: string): FsNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = n.children ? findNode(n.children, id) : null;
    if (hit) return hit;
  }
  return null;
}

// null = top level, undefined = not found
export function findParentId(
  nodes: FsNode[],
  id: string,
  parentId: string | null = null,
): string | null | undefined {
  for (const n of nodes) {
    if (n.id === id) return parentId;
    if (n.children) {
      const hit = findParentId(n.children, id, n.id);
      if (hit !== undefined) return hit;
    }
  }
  return undefined;
}

export function updateNode(
  nodes: FsNode[],
  id: string,
  fn: (n: FsNode) => FsNode,
): FsNode[] {
  let changed = false;
  const next = nodes.map((n) => {
    if (n.id === id) {
      changed = true;
      return fn(n);
    }
    if (n.children) {
      const kids = updateNode(n.children, id, fn);
      if (kids !== n.children) {
        changed = true;
        return { ...n, children: kids };
      }
    }
    return n;
  });
  return changed ? next : nodes;
}

export function removeNode(nodes: FsNode[], id: string): FsNode[] {
  let changed = false;
  const next: FsNode[] = [];
  for (const n of nodes) {
    if (n.id === id) {
      changed = true;
      continue;
    }
    if (n.children) {
      const kids = removeNode(n.children, id);
      if (kids !== n.children) {
        changed = true;
        next.push({ ...n, children: kids });
        continue;
      }
    }
    next.push(n);
  }
  return changed ? next : nodes;
}

export function insertNode(
  nodes: FsNode[],
  parentId: string | null,
  node: FsNode,
): FsNode[] {
  if (parentId === null) return [...nodes, node];
  return updateNode(nodes, parentId, (f) => ({
    ...f,
    children: [...(f.children ?? []), node],
  }));
}

export function countDescendants(node: FsNode): number {
  return (node.children || []).reduce(
    (sum: number, c: FsNode): number => sum + 1 + countDescendants(c),
    0,
  );
}

// The rows a keyboard user can reach right
// now: open folders only, in render order.
export function visibleRows(
  nodes: FsNode[],
  expanded: ReadonlySet<string>,
  depth = 1,
  parentId: string | null = null,
  out: Row[] = [],
): Row[] {
  for (const n of sortNodes(nodes)) {
    out.push({ id: n.id, parentId, depth, node: n });
    if (n.children && expanded.has(n.id))
      visibleRows(n.children, expanded, depth + 1, n.id, out);
  }
  return out;
}

export function validateName(
  nodes: FsNode[],
  parentId: string | null,
  name: string,
  exceptId: string | null,
): string {
  const siblings =
    parentId === null ? nodes : (findNode(nodes, parentId)?.children ?? []);
  const clash = siblings.some(
    (s) => s.id !== exceptId && s.name.toLowerCase() === name.toLowerCase(),
  );
  return clash
    ? 'A file or folder named "' + name + '" already exists here'
    : "";
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a File Explorer Toolbar — Breadcrumbs, Search & Context Menu",
    seoDescription:
      "Add breadcrumbs, filter-with-ancestors search and an accessible right-click context menu to a file tree in React, Vue and Angular. Verified code.",
    description: `**Question presented to candidate:**
"You already have a working file tree. Now add the toolbar around it: breadcrumbs that show where the selected item lives and let me jump to any parent folder, a search box that filters the tree but keeps the folders that lead to each match, and a right-click context menu with New file, New folder, Rename and Delete."

**Requirements:**
- Breadcrumbs for the current folder (the selected folder, or the parent of the selected file); every crumb except the last is a button that navigates there; the last one has \`aria-current="page"\`.
- Search filters the tree, keeps every ancestor of a match, opens those folders while searching, highlights the matched text and shows a match count or a "No files match" message. Clearing the search restores the folders the user had open.
- Right-click on a row opens a menu at the pointer, kept inside the viewport, rendered outside the tree container (portal / Teleport / moved to body). Shift+F10 or the ContextMenu key opens it from the keyboard.
- Menu keyboard: focus the first item, Up/Down wrap, Home/End, Escape closes and returns focus to the row; a press outside, a resize or a scroll closes it.
- Actions: New file / New folder (unique default names) in the target folder, Rename inline with a duplicate check, Delete.

**What a strong answer should cover:**
- Deriving the path with a \`parentOf\` map built in one walk, instead of storing the path.
- A filter that returns a pruned copy of the tree plus the set of folders to force open, without touching the user's own expanded set.
- Why the menu is portaled, how it is positioned and clamped, and how outside-click and Escape are wired and cleaned up.
- The menu's ARIA roles (\`menu\`, \`menuitem\`), roving focus and focus return.
- Acting on the real node by id, not on the filtered copy that was rendered.

**Clarifying questions expected:**
- "Should search match only names, or full paths too? Case-sensitive?"
- "Does selecting a search result clear the search, or keep the filtered view?"
- "Are there actions that depend on the target, such as no Rename for the project root?"

**Code / implementation expected:** Yes. Build on a simple recursive tree; the toolbar features are the focus.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend candidates who can already render a recursive tree in React and want the "power user" layer on top.
**Difficulty:** Medium

> **How to read this doc:** Plain words first, then a <code>📌 Interview term:</code> tag. This question assumes the tree itself; if recursion, \`expanded\` sets or immutable tree updates are new to you, start with [Build a File Explorer (tree view)](/interview-question/build-a-file-explorer-tree-view). Every snippet is from the runnable solution and the Verified section quotes its output on React 19.3.1.

## 1. Why This Even Matters — A Story First

A tree on its own is like a big library with no signs. You can walk the shelves, but three questions come up all the time: *where am I?*, *where is the book called "search-tips"?* and *what can I do with this one?* The breadcrumbs are the "you are here" sign, the search box is the librarian who walks you to every matching shelf (and the aisles that lead there), and the context menu is the librarian asking "renew, return or reserve?" right at the book.

None of the three needs new data. They are all **views of the same tree**: a path derived from a parent map, a filtered copy, and a small floating menu. That is what the interviewer is checking.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Match names only, or the full path? | Path matching changes the filter and the highlight logic. |
| Case-sensitive? Fuzzy? | This build does case-insensitive substring; fuzzy ranking is the [command palette](/interview-question/build-a-command-palette-kbar-cmdk-with-fuzzy-search) problem. |
| How big is the tree? Remote search? | Large or remote trees want a [debounced](/interview-question/build-a-debounced-search-bar) server query instead of filtering in memory. |
| What happens to the open folders after searching? | Decides whether the search writes into \`expanded\` or forces folders open only while active. |
| Which menu actions, and for which targets? | Shapes the menu model; disabled items still need to be announced. |
| Can the page scroll while the menu is open? | Fixed positioning plus close-on-scroll, or repositioning. |

## 3. Requirements and Plan

Breadcrumbs, search with ancestors kept and highlighted matches, and a portaled, viewport-clamped, keyboard-operable context menu with four actions.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 300" role="img" aria-label="State on the left feeds three derived views: the parent map gives breadcrumbs, the query gives a filtered tree and forced open folders, and the menu state gives a portaled menu">
  <defs>
    <marker id="fe2r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="20" width="200" height="60" rx="10"/>
  <text class="d-text d-accent" x="120" y="46" text-anchor="middle">tree + selectedId</text>
  <text class="d-sub" x="120" y="66" text-anchor="middle">state</text>
  <rect class="d-box-accent" x="20" y="120" width="200" height="60" rx="10"/>
  <text class="d-text d-accent" x="120" y="146" text-anchor="middle">query + expanded</text>
  <text class="d-sub" x="120" y="166" text-anchor="middle">state</text>
  <rect class="d-box-accent" x="20" y="220" width="200" height="60" rx="10"/>
  <text class="d-text d-accent" x="120" y="246" text-anchor="middle">menu</text>
  <text class="d-sub" x="120" y="266" text-anchor="middle">left, top, nodeId</text>
  <rect class="d-box" x="420" y="20" width="220" height="60" rx="10"/>
  <text class="d-text" x="530" y="46" text-anchor="middle">Breadcrumbs</text>
  <text class="d-sub" x="530" y="66" text-anchor="middle">pathTo via parentOf</text>
  <rect class="d-box" x="420" y="120" width="220" height="60" rx="10"/>
  <text class="d-text" x="530" y="146" text-anchor="middle">Filtered tree</text>
  <text class="d-sub" x="530" y="166" text-anchor="middle">nodes + forced open set</text>
  <rect class="d-box" x="420" y="220" width="220" height="60" rx="10"/>
  <text class="d-text" x="530" y="246" text-anchor="middle">ContextMenu</text>
  <text class="d-sub" x="530" y="266" text-anchor="middle">portal into body</text>
  <path class="d-edge" d="M 220 50 L 420 50" marker-end="url(#fe2r-arrow)"/>
  <path class="d-edge" d="M 220 150 L 420 150" marker-end="url(#fe2r-arrow)"/>
  <path class="d-edge" d="M 220 250 L 420 250" marker-end="url(#fe2r-arrow)"/>
</svg>

Everything on the right is computed during render. Nothing on the right is stored.

| Piece | Kind |
| :--- | :--- |
| \`tree\`, \`expanded\`, \`selectedId\`, \`query\`, \`menu\`, \`renamingId\`, \`renameError\`, \`status\` | state |
| \`byId\`, \`parentOf\` | derived with \`useMemo\` from \`tree\` |
| \`view\` (filtered nodes, open set, match count) | derived with \`useMemo\` from \`tree\`, \`expanded\`, query |
| \`crumbs\`, \`tabStopId\`, menu items | derived each render |
| \`focusPending\`, the menu \`onCloseRef\` | refs |

## 4. Build It Step by Step

### Step 1: One walk, two maps, a path

📌 **Interview term: Parent map** — a \`Map\` from each id to its parent id, built in one depth-first walk. With it, "where am I?" is a short loop upwards instead of a search through the whole tree.

~~~js
export function indexTree(
  nodes,
  parentId = null,
  byId = new Map(),
  parentOf = new Map(),
) {
  for (const n of nodes) {
    byId.set(n.id, n);
    parentOf.set(n.id, parentId);
    if (n.children) indexTree(n.children, n.id, byId, parentOf);
  }
  return { byId, parentOf };
}

export function pathTo(id, byId, parentOf) {
  const path = [];
  for (let cur = id; cur != null; cur = parentOf.get(cur))
    path.unshift(byId.get(cur));
  return path;
}
~~~

The breadcrumbs component is then just a list of buttons over \`pathTo(currentFolderId)\`. The last crumb is a \`span\` with \`aria-current="page"\`, and the whole list sits in \`<nav aria-label="Breadcrumb">\`, the same structure as the standalone [breadcrumbs question](/interview-question/build-a-breadcrumbs-component).

### Step 2: Filter but keep the ancestors

📌 **Interview term: Pruned tree** — a copy of the tree that keeps a node if it matches *or* if anything below it matches. The folders kept only because of a descendant must be shown open, or the match would be hidden inside a closed folder.

~~~js
export function filterTree(nodes, query, open = new Set()) {
  const out = [];
  for (const n of nodes) {
    const self = n.name.toLowerCase().includes(query);
    const kids = n.children ? filterTree(n.children, query, open) : [];
    if (kids.length) open.add(n.id);
    if (self || kids.length)
      out.push(n.children ? { ...n, children: kids } : n);
  }
  return out;
}
~~~

The open set is returned separately and used instead of \`expanded\` only while a query is active:

~~~jsx
const view = useMemo(() => {
  if (!q) return { nodes: tree, open: expanded, matches: null };
  const open = new Set();
  return {
    nodes: filterTree(tree, q, open),
    open,
    matches: countMatches(tree, q),
  };
}, [tree, expanded, q]);
~~~

Because the user's \`expanded\` set is never overwritten, clearing the search restores exactly the folders they had open. Picking a result calls \`reveal(id)\`, which adds that item's ancestors to \`expanded\`, so the item stays visible after the search is cleared. The highlight is a small \`Highlight\` component that wraps the first case-insensitive match in \`<mark>\`.

### Step 3: The menu, in a portal

📌 **Interview term: Portal** — rendering a component's output into a different DOM node (here \`document.body\`) while it stays in the same React tree for state, context and events. A menu inside the tree container would be clipped by \`overflow: hidden\` or trapped under a sibling's stacking context. See [portals in React](/interview-question/what-are-portals-in-react-and-when-would-you-use-them).

~~~jsx
export function placeMenu(x, y, itemCount) {
  const h = itemCount * ITEM_H + 8;
  return {
    left: Math.max(8, Math.min(x, window.innerWidth - MENU_W - 8)),
    top: Math.max(8, Math.min(y, window.innerHeight - h - 8)),
  };
}
~~~

\`placeMenu\` clamps the top-left corner so the whole menu fits: a right-click at (1000, 700) in a 1024 x 768 window lands at (836, 624). The size comes from constants because jsdom has no layout; in a real app you would measure the menu with \`getBoundingClientRect\` in a \`useLayoutEffect\` and flip it.

### Step 4: Closing it correctly

The menu listens for a press anywhere outside it, plus resize and scroll, and removes those listeners on unmount ([effect cleanup](/interview-question/what-is-the-purpose-of-the-cleanup-function-in-useeffect)):

~~~jsx
const onCloseRef = useRef(onClose);
useEffect(() => {
  onCloseRef.current = onClose;
});

// Mount: focus the first item, close on
// a press outside, a resize or a scroll.
useEffect(() => {
  ref.current.querySelector('[role="menuitem"]').focus();
  const onDown = (e) => {
    if (!ref.current.contains(e.target)) onCloseRef.current(false);
  };
  const dismiss = () => onCloseRef.current(false);
  document.addEventListener("pointerdown", onDown, true);
  window.addEventListener("resize", dismiss);
  window.addEventListener("scroll", dismiss, true);
  return () => {
    document.removeEventListener("pointerdown", onDown, true);
    window.removeEventListener("resize", dismiss);
    window.removeEventListener("scroll", dismiss, true);
  };
}, []);
~~~

The effect runs once, so the latest \`onClose\` is read through a ref; otherwise a new \`onClose\` on every parent render would re-run the effect and steal focus back to the first item. React 19.3.1 also exports \`useEffectEvent\` for exactly this pattern ([effect events](/interview-question/what-are-effect-events-useeffectevent-and-what-problem-do-they-solve)); the ref version is used here because it runs on any React version a playground might load. \`pointerdown\` in the capture phase fires before focus moves and before any inner handler can stop propagation.

📌 **Interview term: Roving focus in a menu** — the menu container is \`role="menu"\`, each item is a \`menuitem\` with \`tabIndex={-1}\`; the menu moves real focus between items with Up/Down (wrapping), Home and End, and Escape closes it and sends focus back to the row that opened it.

### Step 5: Act on the real node

The rendered tree during a search is a filtered *copy*. Every action therefore looks the node up again by id:

~~~jsx
function create(node, type) {
  const parentId =
    node.type === "folder" ? node.id : parentOf.get(node.id);
  const siblings =
    parentId === null ? tree : byId.get(parentId).children;
  const item = { id: makeId(), name: uniqueName(siblings, type), type };
  if (type === "folder") item.children = [];
  setTree((t) => insertNode(t, parentId, item));
  if (parentId) reveal(parentId, true);
  setSelectedId(item.id);
  focusPending.current = item.id;
  setStatus(
    "Created " +
      item.name +
      " in " +
      (parentId ? byId.get(parentId).name : "Project"),
  );
}
~~~

\`uniqueName\` picks \`untitled.txt\`, then \`untitled 2.txt\`, and so on among the target folder's children.

## 5. Verified

Mounted in jsdom like the playground (\`StrictMode\`, \`createRoot\`). The driver uses the click, input and key helpers; \`contextmenu\` and \`pointerdown\` have no helper, so it dispatches those \`MouseEvent\`s from a timer that fires inside a \`settle()\` window, which keeps React inside \`act()\`. Tree dump: \`v\` open, \`>\` closed, dots for depth; crumbs in brackets are the current page. Unedited output:

~~~text
[react] RENDERED: Project▸📁docs▾📁src▸📁components▸📁hooks📄App.jsx📄README.md
[react] tree: > docs  v src  .> components  .> hooks  .App.jsx  README.md
[react] crumbs: [Project]
[react] select Modal.jsx -> crumbs: Project / src / [components]
[react] click crumb src -> crumbs: Project / [src] | selected: src
[react] search "search": 3 matches
[react] filtered: v docs  .search-tips.md  v src  .v components  ..SearchBar.jsx  .v hooks  ..useSearch.js
[react] marks: search-tips.md=search, SearchBar.jsx=Search, useSearch.js=Search
[react] pick useSearch.js -> crumbs: Project / src / [hooks]
[react] cleared search: > docs  v src  .v components  ..Button.jsx  ..Modal.jsx  ..SearchBar.jsx  .v hooks  ..useSearch.js  .App.jsx  README.md
[react] search "zzz": No files match "zzz" | rows: 0
[react] contextmenu on docs -> defaultPrevented: true
[react] menu: Actions for docs | in body: true | left/top: 836px 624px | focus: New file
[react] ArrowDown -> focus: New folder
[react] ArrowUp x2 (wraps) -> focus: Delete
[react] Escape -> menu open: false | focus back on: docs
[react] Shift+F10 -> menu open: true | focus: New file
[react] New file: Created untitled.txt in docs | menu open: false | focus: untitled.txt
[react] contextmenu on docs -> defaultPrevented: true
[react] left/top near the pointer: 40px 120px
[react] New file again: Created untitled 2.txt in docs
[react] tree: v docs  .guide.md  .search-tips.md  .untitled 2.txt  .untitled.txt  v src  .v components  ..Button.jsx  ..Modal.jsx  ..SearchBar.jsx  .v hooks  ..useSearch.js  .App.jsx  README.md
[react] contextmenu on README.md -> defaultPrevented: true
[react] pointerdown outside -> menu open: false
[react] contextmenu on guide.md -> defaultPrevented: true
[react] rename to a taken name: "search-tips.md" already exists here
[react] rename: Renamed guide.md to guide-v2.md | focus: guide-v2.md
[react] contextmenu on src -> defaultPrevented: true
[react] delete src: Deleted src | crumbs: [Project]
[react] tree: v docs  .guide-v2.md  .search-tips.md  .untitled 2.txt  .untitled.txt  README.md
~~~

Read it as: crumbs follow the selection (\`Project / src / [components]\`); "search" finds 3 matches across two branches, opens \`docs\`, \`components\` and \`hooks\`, and marks each match; clearing the search restores the user's open folders *plus* \`hooks\`, because the picked result was revealed; the browser menu is suppressed (\`defaultPrevented: true\`), the custom menu is a child of \`body\`, clamped to \`836px 624px\`, focuses "New file", wraps from "New folder" up to "Delete", and Escape returns focus to \`docs\`. Shift+F10 opens it from the keyboard, a pointer press outside closes it, a duplicate rename is refused, and deleting \`src\` resets the crumbs. No \`console.error\`. Not checked in jsdom: real pixel measurement and screen-reader announcements.

## 6. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Right-click near the window edge | Clamped by \`placeMenu\` |
| Menu open, page scrolls or resizes | Closed (capture-phase scroll catches inner scrollers too) |
| Search with no results | Live message "No files match ..." in an \`aria-live="polite"\` paragraph |
| Rename during a search | Looks up the real node by id; filtered copies are display only |
| Keyboard-only context menu | Shift+F10 or the ContextMenu key on the focused row, positioned under the row |
| Screen readers | \`nav\` + \`aria-current\` for crumbs; \`role="menu"\` with an \`aria-label\` naming the target; \`menuitem\`s |

## 7. Common Pitfalls

- **Storing the breadcrumb path.** It goes stale on rename or move. Derive it from \`parentOf\` each render.
- **Writing search-opened folders into \`expanded\`.** After clearing the search, everything the search touched stays open. Keep a separate forced-open set.
- **Rendering the menu inside the scrolling tree.** It gets clipped by \`overflow\` and positioned relative to the wrong box. Portal it and use \`position: fixed\`.
- **A \`click\` listener for outside-close.** It fires after focus has moved and after a drag ends. Use \`pointerdown\` in the capture phase.
- **Re-running the menu effect on every render.** A new \`onClose\` each render refocuses the first item and re-adds listeners. Use a ref or \`useEffectEvent\`.
- **Forgetting \`preventDefault()\` on \`contextmenu\`.** The browser menu opens on top of yours.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Framing:</strong> <span style="color:#f0e2c8;">"All three features are views of the tree I already have: a path from a parent map, a pruned copy for search, and a small floating menu. I add no duplicated data."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Breadcrumbs:</strong> <span style="color:#f0e2c8;">"One walk builds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">byId</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parentOf</code>; the crumbs are a loop up from the current folder, rendered in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nav</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-current</code> on the last item."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Search:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">filterTree</code> keeps matches and their ancestors and returns which folders to force open; I use that set only while the query is active, so clearing it restores the user's own expanded set."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Menu:</strong> <span style="color:#f0e2c8;">"On <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">contextmenu</code> I call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preventDefault</code>, store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ left, top, nodeId }</code>, and render a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=menu</code> through a portal into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">body</code>, clamped to the viewport, closed by outside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pointerdown</code>, Escape, resize and scroll."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Keyboard:</strong> <span style="color:#f0e2c8;">"Shift+F10 opens it from a focused row, Up/Down wrap, Home/End jump, Escape returns focus to the row, and every action looks up the real node by id."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you position the menu properly instead of with constants?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Render it hidden, measure it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getBoundingClientRect</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useLayoutEffect</code>, then flip left or up when it would overflow, before the browser paints. Libraries like Floating UI do the same with collision detection.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The tree has 100,000 files. Does the filter still work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In-memory filtering stays linear but runs on every keystroke, so I would debounce the input, or move search to the server and only request matching paths, then fetch the ancestors needed to show them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">pointerdown</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">mousedown</code> or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">click</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pointerdown</code> covers mouse, pen and touch in one event and fires before focus changes. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">click</code> fires late and also after a drag that started inside the menu.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test the context menu?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fire a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">contextmenu</code> event with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">clientX</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">clientY</code>, assert the menu is in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.body</code> with the expected position, press Escape and assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.activeElement</code> is the row again.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about touch devices with no right-click?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add a long-press handler or a visible "more" button per row that opens the same menu at the button position; the menu component does not change.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Parent map | \`id -> parentId\` map for walking up to the root |
| Pruned tree | Copy that keeps matches and their ancestors |
| Portal | Render output into another DOM node, same React tree |
| Viewport clamping | Moving a popup so it stays fully on screen |
| Roving focus | Moving real focus between items with arrow keys |
| \`aria-current\` | Marks the current item in a set, such as the last crumb |

---

**Conclusion:** The toolbar is three derived views over one tree: a path from a parent map, a pruned copy with its own forced-open set, and a portaled menu that is clamped, dismissible and fully keyboard-operable. Keep the user's state untouched by the views, act on nodes by id, and you can extend it to [drag-and-drop](/interview-question/build-a-file-explorer-with-nested-drag-and-drop) without changing any of it.`,
        files: {
          "/App.js": `import { useEffect, useMemo, useRef, useState } from "react";
import TreeItem from "./src/TreeItem";
import ContextMenu, { placeMenu } from "./src/ContextMenu";
import {
  initialTree,
  makeId,
  sortNodes,
  indexTree,
  pathTo,
  filterTree,
  countMatches,
  updateNode,
  removeNode,
  insertNode,
  uniqueName,
} from "./src/tree";

export default function App() {
  const [tree, setTree] = useState(initialTree);
  const [expanded, setExpanded] = useState(() => new Set(["src"]));
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState(null); // { left, top, nodeId }
  const [renamingId, setRenamingId] = useState(null);
  const [renameError, setRenameError] = useState("");
  const [status, setStatus] = useState("");
  const treeRef = useRef(null);
  const focusPending = useRef(null);

  // Everything below is derived from state
  // on each render; nothing is duplicated.
  const { byId, parentOf } = useMemo(() => indexTree(tree), [tree]);
  const q = query.trim().toLowerCase();
  const view = useMemo(() => {
    if (!q) return { nodes: tree, open: expanded, matches: null };
    const open = new Set();
    return {
      nodes: filterTree(tree, q, open),
      open,
      matches: countMatches(tree, q),
    };
  }, [tree, expanded, q]);
  const selected = byId.get(selectedId) ?? null;
  const folderId = !selected
    ? null
    : selected.type === "folder"
      ? selected.id
      : parentOf.get(selected.id);
  const crumbs = folderId ? pathTo(folderId, byId, parentOf) : [];
  const visible = sortNodes(view.nodes);
  const visibleIds = useMemo(() => {
    const ids = new Set();
    const walk = (ns) =>
      ns.forEach((n) => {
        ids.add(n.id);
        if (n.children && view.open.has(n.id)) walk(n.children);
      });
    walk(view.nodes);
    return ids;
  }, [view]);
  const tabStopId = visibleIds.has(selectedId) ? selectedId : visible[0]?.id;

  useEffect(() => {
    if (!focusPending.current) return;
    treeRef.current
      .querySelector(\`[data-id="\${focusPending.current}"]\`)
      ?.focus();
    focusPending.current = null;
  });

  // Open every ancestor of id (and id itself when asked), so it stays visible
  // after the search is cleared.
  function reveal(id, includeSelf) {
    setExpanded((prev) => {
      const next = new Set(prev);
      for (
        let cur = includeSelf ? id : parentOf.get(id);
        cur != null;
        cur = parentOf.get(cur)
      )
        next.add(cur);
      return next;
    });
  }

  function navigate(id) {
    // breadcrumb click
    setSelectedId(id);
    if (id) reveal(id, true);
    setQuery("");
  }

  function onRowClick(node) {
    setSelectedId(node.id);
    reveal(node.id, false);
    if (node.type === "folder" && !q) {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        return next;
      });
    }
  }

  const MENU_ITEMS = 4;
  function openMenu(e, node) {
    e.preventDefault(); // suppress the browser menu
    setSelectedId(node.id);
    setMenu({
      ...placeMenu(e.clientX, e.clientY, MENU_ITEMS),
      nodeId: node.id,
    });
  }

  function onRowKey(e, node) {
    if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
      e.preventDefault();
      const r = e.currentTarget.getBoundingClientRect();
      setSelectedId(node.id);
      setMenu({
        ...placeMenu(r.left + 24, r.bottom, MENU_ITEMS),
        nodeId: node.id,
      });
    }
  }

  function closeMenu(returnFocus) {
    if (returnFocus && menu) focusPending.current = menu.nodeId;
    setMenu(null);
  }

  function create(node, type) {
    const parentId = node.type === "folder" ? node.id : parentOf.get(node.id);
    const siblings = parentId === null ? tree : byId.get(parentId).children;
    const item = { id: makeId(), name: uniqueName(siblings, type), type };
    if (type === "folder") item.children = [];
    setTree((t) => insertNode(t, parentId, item));
    if (parentId) reveal(parentId, true);
    setSelectedId(item.id);
    focusPending.current = item.id;
    setStatus(
      "Created " +
        item.name +
        " in " +
        (parentId ? byId.get(parentId).name : "Project"),
    );
  }

  function remove(node) {
    const parentId = parentOf.get(node.id);
    setTree((t) => removeNode(t, node.id));
    setSelectedId(parentId);
    focusPending.current = parentId;
    setStatus("Deleted " + node.name);
  }

  function commitRename(raw) {
    const name = raw.trim();
    const node = byId.get(renamingId);
    if (!name || name === node.name) {
      cancelRename();
      return;
    }
    const parentId = parentOf.get(node.id);
    const siblings = parentId === null ? tree : byId.get(parentId).children;
    if (
      siblings.some(
        (s) => s.id !== node.id && s.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      setRenameError('"' + name + '" already exists here');
      return;
    }
    setTree((t) => updateNode(t, node.id, (n) => ({ ...n, name })));
    setStatus("Renamed " + node.name + " to " + name);
    cancelRename();
  }

  function cancelRename() {
    focusPending.current = renamingId;
    setRenamingId(null);
    setRenameError("");
  }

  const target = menu ? byId.get(menu.nodeId) : null;
  const menuItems = target
    ? [
        { label: "New file", run: () => create(target, "file") },
        { label: "New folder", run: () => create(target, "folder") },
        {
          label: "Rename",
          run: () => {
            setRenamingId(target.id);
            setRenameError("");
          },
        },
        { label: "Delete", danger: true, run: () => remove(target) },
      ]
    : [];

  const api = {
    query: q,
    selectedId,
    tabStopId,
    renamingId,
    renameError,
    isOpen: (id) => view.open.has(id),
    onRowClick,
    onRowKey,
    openMenu,
    commitRename,
    cancelRename,
  };

  return (
    <div className="app">
      <nav aria-label="Breadcrumb" className="crumbs" data-testid="breadcrumbs">
        <ol>
          <li>
            {crumbs.length ? (
              <button onClick={() => navigate(null)}>Project</button>
            ) : (
              <span aria-current="page">Project</span>
            )}
          </li>
          {crumbs.map((c, i) => (
            <li key={c.id}>
              <span className="sep" aria-hidden="true">
                /
              </span>
              {i === crumbs.length - 1 ? (
                <span aria-current="page">{c.name}</span>
              ) : (
                <button onClick={() => navigate(c.id)}>{c.name}</button>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <input
        type="search"
        className="search"
        data-testid="search"
        placeholder="Filter files..."
        aria-label="Filter files"
        aria-controls="file-tree"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <p className="summary" aria-live="polite" data-testid="summary">
        {view.matches === null
          ? ""
          : view.matches
            ? view.matches + " match" + (view.matches === 1 ? "" : "es")
            : 'No files match "' + query.trim() + '"'}
      </p>

      <ul
        id="file-tree"
        role="tree"
        aria-label="Project files"
        className="tree"
        ref={treeRef}
      >
        {visible.map((n) => (
          <TreeItem key={n.id} node={n} depth={1} api={api} />
        ))}
      </ul>
      <p className="status" role="status" data-testid="status">
        {status}
      </p>

      {menu && target && (
        <ContextMenu
          left={menu.left}
          top={menu.top}
          label={"Actions for " + target.name}
          items={menuItems}
          onClose={closeMenu}
        />
      )}
    </div>
  );
}
`,
          "/src/ContextMenu.js": `import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export const MENU_W = 180;
const ITEM_H = 32;

// Keep the whole menu on screen: a right-click near the right or bottom edge
// opens the menu up and to the left of the pointer instead of off-screen.
export function placeMenu(x, y, itemCount) {
  const h = itemCount * ITEM_H + 8;
  return {
    left: Math.max(8, Math.min(x, window.innerWidth - MENU_W - 8)),
    top: Math.max(8, Math.min(y, window.innerHeight - h - 8)),
  };
}

export default function ContextMenu({ left, top, label, items, onClose }) {
  const ref = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Mount: focus the first item, close on
  // a press outside, a resize or a scroll.
  useEffect(() => {
    ref.current.querySelector('[role="menuitem"]').focus();
    const onDown = (e) => {
      if (!ref.current.contains(e.target)) onCloseRef.current(false);
    };
    const dismiss = () => onCloseRef.current(false);
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, []);

  function onKeyDown(e) {
    const all = [...ref.current.querySelectorAll('[role="menuitem"]')];
    const i = all.indexOf(document.activeElement);
    if (e.key === "ArrowDown") all[(i + 1) % all.length].focus();
    else if (e.key === "ArrowUp")
      all[(i - 1 + all.length) % all.length].focus();
    else if (e.key === "Home") all[0].focus();
    else if (e.key === "End") all[all.length - 1].focus();
    else if (e.key === "Escape" || e.key === "Tab") onClose(e.key === "Escape");
    else return;
    e.preventDefault();
  }

  // A portal renders the menu at the end of <body>, outside any parent that
  // clips with overflow: hidden or traps it in a lower stacking context.
  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      className="menu"
      data-testid="context-menu"
      style={{ left, top, width: MENU_W }}
      onKeyDown={onKeyDown}
    >
      {items.map((it) => (
        <button
          key={it.label}
          role="menuitem"
          tabIndex={-1}
          className={it.danger ? "danger" : ""}
          onClick={() => {
            onClose(true);
            it.run();
          }}
        >
          {it.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}
`,
          "/src/tree.js": `// Nested tree data plus the derived lookups the toolbar needs.
let nextId = 1;
export const makeId = () => "n" + nextId++;

export const initialTree = [
  {
    id: "src",
    name: "src",
    type: "folder",
    children: [
      {
        id: "components",
        name: "components",
        type: "folder",
        children: [
          { id: "button", name: "Button.jsx", type: "file" },
          { id: "modal", name: "Modal.jsx", type: "file" },
          { id: "searchbar", name: "SearchBar.jsx", type: "file" },
        ],
      },
      {
        id: "hooks",
        name: "hooks",
        type: "folder",
        children: [{ id: "usesearch", name: "useSearch.js", type: "file" }],
      },
      { id: "app", name: "App.jsx", type: "file" },
    ],
  },
  {
    id: "docs",
    name: "docs",
    type: "folder",
    children: [
      { id: "guide", name: "guide.md", type: "file" },
      { id: "tips", name: "search-tips.md", type: "file" },
    ],
  },
  { id: "readme", name: "README.md", type: "file" },
];

export const sortNodes = (nodes) =>
  [...nodes].sort((a, b) =>
    a.type !== b.type
      ? a.type === "folder"
        ? -1
        : 1
      : a.name.localeCompare(b.name),
  );

// One walk builds both maps: id -> node and id -> parent id (null at the top).
export function indexTree(
  nodes,
  parentId = null,
  byId = new Map(),
  parentOf = new Map(),
) {
  for (const n of nodes) {
    byId.set(n.id, n);
    parentOf.set(n.id, parentId);
    if (n.children) indexTree(n.children, n.id, byId, parentOf);
  }
  return { byId, parentOf };
}

// Root-first list of ancestors, e.g.
// pathTo('modal') -> [src, components, Modal.jsx]
export function pathTo(id, byId, parentOf) {
  const path = [];
  for (let cur = id; cur != null; cur = parentOf.get(cur))
    path.unshift(byId.get(cur));
  return path;
}

// Keep a node if it matches or if anything below it matches. Folders that are
// kept because of a descendant are returned
// in \`open\`, so the matches are visible.
export function filterTree(nodes, query, open = new Set()) {
  const out = [];
  for (const n of nodes) {
    const self = n.name.toLowerCase().includes(query);
    const kids = n.children ? filterTree(n.children, query, open) : [];
    if (kids.length) open.add(n.id);
    if (self || kids.length)
      out.push(n.children ? { ...n, children: kids } : n);
  }
  return out;
}

export function countMatches(nodes, query) {
  return nodes.reduce(
    (sum, n) =>
      sum +
      (n.name.toLowerCase().includes(query) ? 1 : 0) +
      (n.children ? countMatches(n.children, query) : 0),
    0,
  );
}

export function updateNode(nodes, id, fn) {
  let changed = false;
  const next = nodes.map((n) => {
    if (n.id === id) {
      changed = true;
      return fn(n);
    }
    if (n.children) {
      const kids = updateNode(n.children, id, fn);
      if (kids !== n.children) {
        changed = true;
        return { ...n, children: kids };
      }
    }
    return n;
  });
  return changed ? next : nodes;
}

export function removeNode(nodes, id) {
  let changed = false;
  const next = [];
  for (const n of nodes) {
    if (n.id === id) {
      changed = true;
      continue;
    }
    if (n.children) {
      const kids = removeNode(n.children, id);
      if (kids !== n.children) {
        changed = true;
        next.push({ ...n, children: kids });
        continue;
      }
    }
    next.push(n);
  }
  return changed ? next : nodes;
}

export function insertNode(nodes, parentId, node) {
  if (parentId === null) return [...nodes, node];
  return updateNode(nodes, parentId, (f) => ({
    ...f,
    children: [...f.children, node],
  }));
}

// "untitled.txt", then "untitled 2.txt", ...
// ; "New folder", then "New folder 2", ...
export function uniqueName(siblings, type) {
  const [base, ext] =
    type === "folder" ? ["New folder", ""] : ["untitled", ".txt"];
  const taken = new Set(siblings.map((s) => s.name.toLowerCase()));
  for (let i = 1; ; i++) {
    const name = base + (i === 1 ? "" : " " + i) + ext;
    if (!taken.has(name.toLowerCase())) return name;
  }
}
`,
          "/src/TreeItem.js": `import { useEffect, useRef, useState } from "react";
import { sortNodes } from "./tree";

// Wrap the first case-insensitive match in <mark>, leave the rest as text.
export function Highlight({ text, query }) {
  const i = query ? text.toLowerCase().indexOf(query) : -1;
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
}

function RenameInput({ node, error, onCommit, onCancel }) {
  const [value, setValue] = useState(node.name);
  const ref = useRef(null);
  useEffect(() => {
    ref.current.focus();
    ref.current.select();
  }, []);
  return (
    <span className="edit" onClick={(e) => e.stopPropagation()}>
      <input
        ref={ref}
        data-testid="rename-input"
        aria-label={"Rename " + node.name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCommit(value);
          if (e.key === "Escape") onCancel();
        }}
      />
      {error && (
        <span role="alert" className="error">
          {error}
        </span>
      )}
    </span>
  );
}

export default function TreeItem({ node, depth, api }) {
  const isFolder = node.type === "folder";
  const open = isFolder && api.isOpen(node.id);
  const selected = api.selectedId === node.id;
  return (
    <li
      role="treeitem"
      aria-level={depth}
      aria-expanded={isFolder ? open : undefined}
      aria-selected={selected}
      tabIndex={api.tabStopId === node.id ? 0 : -1}
      data-id={node.id}
      data-name={node.name}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget) api.onRowKey(e, node);
      }}
    >
      <div
        className={"row" + (selected ? " selected" : "")}
        style={{ paddingLeft: 8 + (depth - 1) * 16 }}
        onClick={() => api.onRowClick(node)}
        onContextMenu={(e) => api.openMenu(e, node)}
      >
        <span className="chevron" aria-hidden="true">
          {isFolder ? (open ? "▾" : "▸") : ""}
        </span>
        <span aria-hidden="true">{isFolder ? "📁" : "📄"}</span>
        {api.renamingId === node.id ? (
          <RenameInput
            node={node}
            error={api.renameError}
            onCommit={api.commitRename}
            onCancel={api.cancelRename}
          />
        ) : (
          <span className="name">
            <Highlight text={node.name} query={api.query} />
          </span>
        )}
      </div>
      {open && node.children.length > 0 && (
        <ul role="group">
          {sortNodes(node.children).map((c) => (
            <TreeItem key={c.id} node={c} depth={depth + 1} api={api} />
          ))}
        </ul>
      )}
    </li>
  );
}
`,
          "/styles.css": `body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.app {
  max-width: 520px;
  margin: 0 auto;
  padding: 16px;
}
button {
  background: #1d2230;
  color: #e6e6e6;
  border: 1px solid #343b4f;
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
  font: inherit;
}
.crumbs ol {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  list-style: none;
  margin: 0 0 10px;
  padding: 0;
  font-size: 14px;
}
.crumbs li {
  display: flex;
  align-items: center;
  gap: 4px;
}
.crumbs button {
  background: none;
  border: none;
  color: #8ab4ff;
  padding: 2px 4px;
}
.crumbs [aria-current] {
  font-weight: 600;
  padding: 2px 4px;
}
.sep {
  color: #5d667a;
}
.search {
  width: 100%;
  box-sizing: border-box;
  background: #161a23;
  color: #e6e6e6;
  border: 1px solid #343b4f;
  border-radius: 6px;
  padding: 8px 10px;
}
.summary {
  min-height: 1.2em;
  margin: 6px 0;
  color: #9aa3b5;
  font-size: 13px;
}
.tree,
.tree ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
.tree {
  background: #161a23;
  border: 1px solid #262c3b;
  border-radius: 8px;
  padding: 6px 0;
}
.row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
}
.row:hover {
  background: #1f2533;
}
.row.selected {
  background: #263354;
}
[role="treeitem"]:focus {
  outline: none;
}
[role="treeitem"]:focus-visible > .row {
  outline: 2px solid #6ea8ff;
  outline-offset: -2px;
}
.chevron {
  width: 12px;
  color: #8a93a8;
}
mark {
  background: #6b5200;
  color: #ffe08a;
  border-radius: 2px;
}
.edit {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}
.edit input {
  background: #0f1115;
  color: #e6e6e6;
  border: 1px solid #6ea8ff;
  border-radius: 4px;
  padding: 3px 6px;
}
.error {
  color: #ff8a80;
  font-size: 12px;
}
.status {
  min-height: 1.2em;
  color: #9aa3b5;
  font-size: 13px;
}
.menu {
  position: fixed;
  z-index: 10;
  display: flex;
  flex-direction: column;
  padding: 4px;
  background: #1d2230;
  border: 1px solid #343b4f;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}
.menu button {
  border: none;
  background: none;
  text-align: left;
  height: 32px;
  padding: 0 10px;
}
.menu button:focus {
  background: #263354;
  outline: none;
}
.menu .danger {
  color: #ff8a80;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Vue 3 developers who can render a recursive tree and now need breadcrumbs, search and a context menu around it.
**Difficulty:** Medium

> **How to read this doc:** Plain words first, then a <code>📌 Interview term:</code> tag. The tree basics are in [Build a File Explorer (tree view)](/interview-question/build-a-file-explorer-tree-view). Snippets come from the runnable Vue solution; the Verified section quotes its output on Vue 3.5.44.

## 1. Why This Even Matters — A Story First

A large library needs three helpers: a "you are here" sign, a librarian who leads you to every shelf with the book you named (and through the aisles in between), and someone who asks "what would you like to do with this one?" when you hold a book up. That is breadcrumbs, search and a context menu. In Vue all three are \`computed\` views of one reactive tree, plus one teleported menu.

## 2. Requirements and Plan

Breadcrumbs for the current folder, a search that keeps ancestors and forces their folders open only while active, highlighted matches, and a right-click / Shift+F10 menu with New file, New folder, Rename and Delete.

| Piece | Vue tool |
| :--- | :--- |
| \`tree\`, \`expanded\` | \`reactive\` array and \`reactive(new Set())\` |
| \`selectedId\`, \`query\`, \`menu\`, \`renamingId\`, \`status\` | \`ref\` |
| \`index\` (\`byId\`, \`parentOf\`), \`view\`, \`crumbs\`, \`summary\`, \`menuItems\` | \`computed\` |
| breadcrumbs | \`Breadcrumbs.vue\` with \`defineEmits(['navigate'])\` |
| menu | \`ContextMenu.vue\` inside \`<Teleport to="body">\` |

📌 **Interview term: computed** — a cached derived value that re-runs only when a reactive source it read changes. The filtered view depends on the tree, the query and \`expanded\`, so typing re-filters and nothing else does. See [computed vs watch](/interview-question/what-is-the-difference-between-computed-and-watch).

## 3. Build It Step by Step

### Step 1: Path from a parent map

~~~js
const crumbs = computed(() => {
  const s = selected.value;
  if (!s) return [];
  const folderId =
    s.type === "folder" ? s.id : index.value.parentOf.get(s.id);
  return folderId
    ? pathTo(folderId, index.value.byId, index.value.parentOf)
    : [];
});
~~~

\`indexTree\` walks the tree once and returns \`byId\` and \`parentOf\`; \`pathTo\` climbs from the current folder to the root. \`Breadcrumbs.vue\` renders buttons for every ancestor and emits \`navigate(id)\`; the last crumb is a \`span\` with \`aria-current="page"\` (see [defineProps and defineEmits](/interview-question/how-do-defineprops-and-defineemits-work-in-script-setup)).

### Step 2: Search that keeps the path open

~~~js
const view = computed(() => {
  if (!q.value) return { nodes: tree, open: expanded, matches: null };
  const open = new Set();
  return {
    nodes: filterTree(tree, q.value, open),
    open,
    matches: countMatches(tree, q.value),
  };
});
~~~

📌 **Interview term: Pruned tree** — a filtered copy that keeps every match and every folder on the way to it. \`filterTree\` returns it and collects the folders that must be open. That set replaces \`expanded\` only while a query exists, so clearing the search restores what the user had opened.

In \`TreeItem.vue\` a \`computed\` splits the name into three parts around the first match and the template renders \`{{ parts[0] }}<mark>{{ parts[1] }}</mark>{{ parts[2] }}\`; interpolation escapes text, so no \`v-html\` is needed.

### Step 3: Teleport the menu to the body

📌 **Interview term: Teleport** — a built-in component that renders its slot into another DOM node (here \`body\`) while it stays a normal child component for props, emits and reactivity. See [Teleport in Vue 3](/interview-question/what-is-teleport-in-vue-3).

~~~vue
<Teleport to="body">
  <div
    ref="el"
    role="menu"
    class="menu"
    data-testid="context-menu"
    :aria-label="label"
    :style="{ left: left + 'px', top: top + 'px' }"
    @keydown="onKeyDown"
  >
    <button
      v-for="it in items"
      :key="it.label"
      role="menuitem"
      tabindex="-1"
      :class="{ danger: it.danger }"
      @click="choose(it)"
    >
      {{ it.label }}
    </button>
  </div>
</Teleport>
~~~

Listeners for outside \`pointerdown\` (capture phase), resize and scroll are added in \`onMounted\` and removed in \`onUnmounted\`; the menu emits \`close(returnFocus)\` and App decides where focus goes.

### Step 4: \`.prevent\` on contextmenu, and actions by id

~~~vue
@click="api.onRowClick(node)" @contextmenu.prevent="api.openMenu($event,
node)">
~~~

\`.prevent\` suppresses the browser menu. While searching, \`TreeItem\` renders filtered copies, so \`commitRename\` and \`remove\` look the real node up in \`index.value.byId\` and mutate that one in place: \`node.name = name\`, \`siblings.splice(i, 1)\`.

## 4. Verified

Compiled with \`@vue/compiler-sfc\`, mounted with \`createApp(App).mount("#app")\` in jsdom, driven by the shared driver (it dispatches \`contextmenu\` and \`pointerdown\` itself, with \`clientX\` / \`clientY\`). Unedited output:

~~~text
[vue] RENDERED: Project▸📁docs▾📁src▸📁components▸📁hooks📄App.jsx📄README.md
[vue] tree: > docs  v src  .> components  .> hooks  .App.jsx  README.md
[vue] crumbs: [Project]
[vue] select Modal.jsx -> crumbs: Project / src / [components]
[vue] click crumb src -> crumbs: Project / [src] | selected: src
[vue] search "search": 3 matches
[vue] filtered: v docs  .search-tips.md  v src  .v components  ..SearchBar.jsx  .v hooks  ..useSearch.js
[vue] marks: search-tips.md=search, SearchBar.jsx=Search, useSearch.js=Search
[vue] pick useSearch.js -> crumbs: Project / src / [hooks]
[vue] cleared search: > docs  v src  .v components  ..Button.jsx  ..Modal.jsx  ..SearchBar.jsx  .v hooks  ..useSearch.js  .App.jsx  README.md
[vue] search "zzz": No files match "zzz" | rows: 0
[vue] contextmenu on docs -> defaultPrevented: true
[vue] menu: Actions for docs | in body: true | left/top: 836px 624px | focus: New file
[vue] ArrowDown -> focus: New folder
[vue] ArrowUp x2 (wraps) -> focus: Delete
[vue] Escape -> menu open: false | focus back on: docs
[vue] Shift+F10 -> menu open: true | focus: New file
[vue] New file: Created untitled.txt in docs | menu open: false | focus: untitled.txt
[vue] contextmenu on docs -> defaultPrevented: true
[vue] left/top near the pointer: 40px 120px
[vue] New file again: Created untitled 2.txt in docs
[vue] tree: v docs  .guide.md  .search-tips.md  .untitled 2.txt  .untitled.txt  v src  .v components  ..Button.jsx  ..Modal.jsx  ..SearchBar.jsx  .v hooks  ..useSearch.js  .App.jsx  README.md
[vue] contextmenu on README.md -> defaultPrevented: true
[vue] pointerdown outside -> menu open: false
[vue] contextmenu on guide.md -> defaultPrevented: true
[vue] rename to a taken name: "search-tips.md" already exists here
[vue] rename: Renamed guide.md to guide-v2.md | focus: guide-v2.md
[vue] contextmenu on src -> defaultPrevented: true
[vue] delete src: Deleted src | crumbs: [Project]
[vue] tree: v docs  .guide-v2.md  .search-tips.md  .untitled 2.txt  .untitled.txt  README.md
~~~

Identical to React and Angular: the crumbs follow the selection, the search keeps and opens three branches, clearing it restores the user's folders plus the revealed \`hooks\`, the teleported menu is a child of \`body\` at \`836px 624px\`, keyboard focus wraps and returns to the row on Escape, outside press closes it, and the actions work. No \`console.error\`. Pixel layout and screen-reader output were not checked.

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Menu near an edge | Clamped with fixed menu dimensions (jsdom has no layout; measure in a real app) |
| Keyboard open | Shift+F10 or ContextMenu key on a focused row |
| No matches | "No files match" in an \`aria-live\` region |
| Menu semantics | \`role="menu"\` with \`aria-label\`, \`menuitem\` buttons, focus on the first item |

## 6. Common Pitfalls

- **Teleporting to a selector that does not exist yet.** \`to="#menus"\` must be in the DOM before mount; \`body\` is always safe.
- **Forgetting cleanup in \`onUnmounted\`.** Document listeners outlive the menu and close the next one immediately.
- **Mutating the filtered copy.** It is thrown away on the next keystroke; mutate the node from \`byId\`.
- **Using \`v-html\` for highlighting.** It opens an XSS hole for file names; split into text parts instead.
- **Writing search results into \`expanded\`.** The tree stays exploded after the search is cleared.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Framing:</strong> <span style="color:#f0e2c8;">"Breadcrumbs, search and the menu are all derived from the same reactive tree; the only new state is the query and the menu position."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Breadcrumbs:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> index gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">byId</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parentOf</code>; crumbs climb from the current folder, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Breadcrumbs.vue</code> emits <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">navigate</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Search:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">filterTree</code> returns a pruned copy plus the folders to force open; that set is used only while searching, so the user's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">expanded</code> Set is untouched."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Menu:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@contextmenu.prevent</code> stores a clamped position; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ContextMenu.vue</code> renders a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=menu</code> inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Teleport to=body</code>, with document listeners added and removed in the lifecycle hooks."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Keyboard and actions:</strong> <span style="color:#f0e2c8;">"Shift+F10 opens it, arrows wrap, Escape returns focus to the row after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextTick</code>, and actions mutate the real node found by id."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not put the menu inside the tree with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">position: absolute</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Any ancestor with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">overflow: hidden</code>, a transform or a lower <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">z-index</code> would clip or bury it. Teleport puts it at the end of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">body</code> while it keeps its props and emits.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you debounce the search?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">query</code> bound with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code>, and feed the filter from a second ref updated by a debounced <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code>, or use the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.lazy</code> modifier for change-only updates on small trees.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make positioning exact?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After the menu mounts, measure it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getBoundingClientRect</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMounted</code> or a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextTick</code>, then flip left or up if it overflows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mount with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">attachTo: document.body</code>, trigger <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">contextmenu</code> with coordinates, assert the menu is in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.body</code>, trigger Escape and assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.activeElement</code>.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Meaning |
| :--- | :--- |
| computed | Cached derived value |
| Pruned tree | Filtered copy that keeps ancestors of matches |
| Teleport | Render a component's DOM elsewhere |
| Parent map | \`id -> parentId\` for walking up |
| \`aria-current\` | Marks the current crumb |

---

**Conclusion:** In Vue the toolbar is a handful of \`computed\` views (index, crumbs, pruned tree, summary) over one reactive tree, a small emitting breadcrumbs component, and a teleported menu with lifecycle-managed listeners and keyboard focus. Keep the user's expanded set separate from the search, and act on real nodes by id.`,
        files: {
          "/src/App.vue": `<script setup>
import { computed, nextTick, provide, reactive, ref } from "vue";
import TreeItem from "./components/TreeItem.vue";
import Breadcrumbs from "./components/Breadcrumbs.vue";
import ContextMenu from "./components/ContextMenu.vue";
import {
  createTree,
  makeId,
  sortNodes,
  indexTree,
  pathTo,
  filterTree,
  countMatches,
  uniqueName,
} from "./tree.js";

const MENU_W = 180,
  ITEM_H = 32,
  MENU_ITEMS = 4;
function placeMenu(x, y) {
  const h = MENU_ITEMS * ITEM_H + 8;
  return {
    left: Math.max(8, Math.min(x, window.innerWidth - MENU_W - 8)),
    top: Math.max(8, Math.min(y, window.innerHeight - h - 8)),
  };
}

const tree = reactive(createTree());
const expanded = reactive(new Set(["src"]));
const selectedId = ref(null);
const query = ref("");
const menu = ref(null); // { left, top, nodeId }
const renamingId = ref(null);
const renameError = ref("");
const status = ref("");
const treeEl = ref(null);

// Derived state: recomputed only when what it reads changes.
const index = computed(() => indexTree(tree));
const q = computed(() => query.value.trim().toLowerCase());
const view = computed(() => {
  if (!q.value) return { nodes: tree, open: expanded, matches: null };
  const open = new Set();
  return {
    nodes: filterTree(tree, q.value, open),
    open,
    matches: countMatches(tree, q.value),
  };
});
const visible = computed(() => sortNodes(view.value.nodes));
const selected = computed(() => index.value.byId.get(selectedId.value) ?? null);
const crumbs = computed(() => {
  const s = selected.value;
  if (!s) return [];
  const folderId = s.type === "folder" ? s.id : index.value.parentOf.get(s.id);
  return folderId
    ? pathTo(folderId, index.value.byId, index.value.parentOf)
    : [];
});
const visibleIds = computed(() => {
  const ids = new Set();
  const walk = (ns) =>
    ns.forEach((n) => {
      ids.add(n.id);
      if (n.children && view.value.open.has(n.id)) walk(n.children);
    });
  walk(view.value.nodes);
  return ids;
});
const tabStopId = computed(() =>
  visibleIds.value.has(selectedId.value)
    ? selectedId.value
    : visible.value[0]?.id,
);
const summary = computed(() => {
  const m = view.value.matches;
  if (m === null) return "";
  return m
    ? m + " match" + (m === 1 ? "" : "es")
    : 'No files match "' + query.value.trim() + '"';
});
const target = computed(() =>
  menu.value ? index.value.byId.get(menu.value.nodeId) : null,
);
const menuItems = computed(() => {
  const t = target.value;
  if (!t) return [];
  return [
    { label: "New file", run: () => create(t, "file") },
    { label: "New folder", run: () => create(t, "folder") },
    {
      label: "Rename",
      run: () => {
        renamingId.value = t.id;
        renameError.value = "";
      },
    },
    { label: "Delete", danger: true, run: () => remove(t) },
  ];
});

async function focusRow(id) {
  await nextTick();
  if (id) treeEl.value?.querySelector(\`[data-id="\${id}"]\`)?.focus();
}

function reveal(id, includeSelf) {
  const { parentOf } = index.value;
  for (
    let cur = includeSelf ? id : parentOf.get(id);
    cur != null;
    cur = parentOf.get(cur)
  )
    expanded.add(cur);
}

function navigate(id) {
  selectedId.value = id;
  if (id) reveal(id, true);
  query.value = "";
}

function onRowClick(node) {
  selectedId.value = node.id;
  reveal(node.id, false);
  if (node.type === "folder" && !q.value) {
    if (expanded.has(node.id)) expanded.delete(node.id);
    else expanded.add(node.id);
  }
}

function openMenu(e, node) {
  // the template already called preventDefault (.prevent)
  selectedId.value = node.id;
  menu.value = { ...placeMenu(e.clientX, e.clientY), nodeId: node.id };
}

function onRowKey(e, node) {
  if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    selectedId.value = node.id;
    menu.value = { ...placeMenu(r.left + 24, r.bottom), nodeId: node.id };
  }
}

function closeMenu(returnFocus) {
  const id = menu.value?.nodeId;
  menu.value = null;
  if (returnFocus) focusRow(id);
}

function create(node, type) {
  const { byId, parentOf } = index.value;
  const parentId = node.type === "folder" ? node.id : parentOf.get(node.id);
  const siblings = parentId === null ? tree : byId.get(parentId).children;
  const item = { id: makeId(), name: uniqueName(siblings, type), type };
  if (type === "folder") item.children = [];
  siblings.push(item);
  if (parentId) reveal(parentId, true);
  selectedId.value = item.id;
  focusRow(item.id);
  status.value =
    "Created " +
    item.name +
    " in " +
    (parentId ? byId.get(parentId).name : "Project");
}

function remove(node) {
  const { byId, parentOf } = index.value;
  const parentId = parentOf.get(node.id);
  const siblings = parentId === null ? tree : byId.get(parentId).children;
  siblings.splice(
    siblings.findIndex((s) => s.id === node.id),
    1,
  );
  selectedId.value = parentId;
  focusRow(parentId);
  status.value = "Deleted " + node.name;
}

function commitRename(raw) {
  const name = raw.trim();
  const { byId, parentOf } = index.value;
  const node = byId.get(renamingId.value); // the real node, not a filtered copy
  if (!name || name === node.name) return cancelRename();
  const parentId = parentOf.get(node.id);
  const siblings = parentId === null ? tree : byId.get(parentId).children;
  if (
    siblings.some(
      (s) => s.id !== node.id && s.name.toLowerCase() === name.toLowerCase(),
    )
  ) {
    renameError.value = '"' + name + '" already exists here';
    return;
  }
  status.value = "Renamed " + node.name + " to " + name;
  node.name = name;
  cancelRename();
}

function cancelRename() {
  focusRow(renamingId.value);
  renamingId.value = null;
  renameError.value = "";
}

provide(
  "explorer",
  reactive({
    query: q,
    selectedId,
    tabStopId,
    renamingId,
    renameError,
    isOpen: (id) => view.value.open.has(id),
    onRowClick,
    onRowKey,
    openMenu,
    commitRename,
    cancelRename,
  }),
);
</script>

<template>
  <div class="app">
    <Breadcrumbs :crumbs="crumbs" @navigate="navigate" />
    <input
      v-model="query"
      type="search"
      class="search"
      data-testid="search"
      placeholder="Filter files..."
      aria-label="Filter files"
      aria-controls="file-tree"
    />
    <p class="summary" aria-live="polite" data-testid="summary">
      {{ summary }}
    </p>
    <ul
      id="file-tree"
      ref="treeEl"
      role="tree"
      aria-label="Project files"
      class="tree"
    >
      <TreeItem v-for="n in visible" :key="n.id" :node="n" :depth="1" />
    </ul>
    <p class="status" role="status" data-testid="status">{{ status }}</p>
    <ContextMenu
      v-if="menu && target"
      :left="menu.left"
      :top="menu.top"
      :label="'Actions for ' + target.name"
      :items="menuItems"
      @close="closeMenu"
    />
  </div>
</template>

<style>
body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.app {
  max-width: 520px;
  margin: 0 auto;
  padding: 16px;
}
button {
  background: #1d2230;
  color: #e6e6e6;
  border: 1px solid #343b4f;
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
  font: inherit;
}
.crumbs ol {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  list-style: none;
  margin: 0 0 10px;
  padding: 0;
  font-size: 14px;
}
.crumbs li {
  display: flex;
  align-items: center;
  gap: 4px;
}
.crumbs button {
  background: none;
  border: none;
  color: #8ab4ff;
  padding: 2px 4px;
}
.crumbs [aria-current] {
  font-weight: 600;
  padding: 2px 4px;
}
.sep {
  color: #5d667a;
}
.search {
  width: 100%;
  box-sizing: border-box;
  background: #161a23;
  color: #e6e6e6;
  border: 1px solid #343b4f;
  border-radius: 6px;
  padding: 8px 10px;
}
.summary {
  min-height: 1.2em;
  margin: 6px 0;
  color: #9aa3b5;
  font-size: 13px;
}
.tree,
.tree ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
.tree {
  background: #161a23;
  border: 1px solid #262c3b;
  border-radius: 8px;
  padding: 6px 0;
}
.row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
}
.row:hover {
  background: #1f2533;
}
.row.selected {
  background: #263354;
}
[role="treeitem"]:focus {
  outline: none;
}
[role="treeitem"]:focus-visible > .row {
  outline: 2px solid #6ea8ff;
  outline-offset: -2px;
}
.chevron {
  width: 12px;
  color: #8a93a8;
}
mark {
  background: #6b5200;
  color: #ffe08a;
  border-radius: 2px;
}
.edit {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}
.edit input {
  background: #0f1115;
  color: #e6e6e6;
  border: 1px solid #6ea8ff;
  border-radius: 4px;
  padding: 3px 6px;
}
.error {
  color: #ff8a80;
  font-size: 12px;
}
.status {
  min-height: 1.2em;
  color: #9aa3b5;
  font-size: 13px;
}
.menu {
  position: fixed;
  z-index: 10;
  width: 180px;
  display: flex;
  flex-direction: column;
  padding: 4px;
  background: #1d2230;
  border: 1px solid #343b4f;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}
.menu button {
  border: none;
  background: none;
  text-align: left;
  height: 32px;
  padding: 0 10px;
}
.menu button:focus {
  background: #263354;
  outline: none;
}
.menu .danger {
  color: #ff8a80;
}
</style>
`,
          "/src/components/Breadcrumbs.vue": `<script setup>
// root-first folder nodes
defineProps({ crumbs: { type: Array, required: true } });
// payload: folder id, or null for the root
const emit = defineEmits(["navigate"]);
</script>

<template>
  <nav aria-label="Breadcrumb" class="crumbs" data-testid="breadcrumbs">
    <ol>
      <li>
        <button
          v-if="crumbs.length"
          @click="emit('navigate', null)"
        >Project</button>
        <span v-else aria-current="page">Project</span>
      </li>
      <li v-for="(c, i) in crumbs" :key="c.id">
        <span class="sep" aria-hidden="true">/</span>
        <span
          v-if="i === crumbs.length - 1"
          aria-current="page"
        >{{ c.name }}</span>
        <button v-else @click="emit('navigate', c.id)">{{ c.name }}</button>
      </li>
    </ol>
  </nav>
</template>
`,
          "/src/components/ContextMenu.vue": `<script setup>
import { onMounted, onUnmounted, ref } from "vue";

defineProps({
  left: { type: Number, required: true },
  top: { type: Number, required: true },
  label: { type: String, required: true },
  items: { type: Array, required: true }, // [{ label, run, danger? }]
});
const emit = defineEmits(["close"]); // payload: return focus to the row?
const el = ref(null);

const onDown = (e) => {
  if (!el.value.contains(e.target)) emit("close", false);
};
const dismiss = () => emit("close", false);

onMounted(() => {
  el.value.querySelector('[role="menuitem"]').focus();
  document.addEventListener("pointerdown", onDown, true);
  window.addEventListener("resize", dismiss);
  window.addEventListener("scroll", dismiss, true);
});
onUnmounted(() => {
  document.removeEventListener("pointerdown", onDown, true);
  window.removeEventListener("resize", dismiss);
  window.removeEventListener("scroll", dismiss, true);
});

function onKeyDown(e) {
  const all = [...el.value.querySelectorAll('[role="menuitem"]')];
  const i = all.indexOf(document.activeElement);
  if (e.key === "ArrowDown") all[(i + 1) % all.length].focus();
  else if (e.key === "ArrowUp") all[(i - 1 + all.length) % all.length].focus();
  else if (e.key === "Home") all[0].focus();
  else if (e.key === "End") all[all.length - 1].focus();
  else if (e.key === "Escape" || e.key === "Tab")
    emit("close", e.key === "Escape");
  else return;
  e.preventDefault();
}

function choose(item) {
  emit("close", true);
  item.run();
}
</script>

<template>
  <!-- Teleport moves the menu to the end of <body>, away from clipping parents. -->
  <Teleport to="body">
    <div
      ref="el"
      role="menu"
      class="menu"
      data-testid="context-menu"
      :aria-label="label"
      :style="{ left: left + 'px', top: top + 'px' }"
      @keydown="onKeyDown"
    >
      <button
        v-for="it in items"
        :key="it.label"
        role="menuitem"
        tabindex="-1"
        :class="{ danger: it.danger }"
        @click="choose(it)"
      >
        {{ it.label }}
      </button>
    </div>
  </Teleport>
</template>
`,
          "/src/components/TreeItem.vue": `<script setup>
import { computed, inject, nextTick, ref, watch } from "vue";
import { sortNodes } from "../tree.js";

const props = defineProps({
  node: { type: Object, required: true },
  depth: { type: Number, default: 1 },
});
const api = inject("explorer");

const isFolder = computed(() => props.node.type === "folder");
const open = computed(() => isFolder.value && api.isOpen(props.node.id));
const selected = computed(() => api.selectedId === props.node.id);
const children = computed(() =>
  open.value ? sortNodes(props.node.children) : [],
);
const renaming = computed(() => api.renamingId === props.node.id);

// The first case-insensitive match, split into three pieces for <mark>.
const parts = computed(() => {
  const name = props.node.name;
  const i = api.query ? name.toLowerCase().indexOf(api.query) : -1;
  return i < 0
    ? null
    : [
        name.slice(0, i),
        name.slice(i, i + api.query.length),
        name.slice(i + api.query.length),
      ];
});

const draft = ref("");
const box = ref(null);
watch(
  renaming,
  async (on) => {
    if (!on) return;
    draft.value = props.node.name;
    await nextTick();
    box.value.focus();
    box.value.select();
  },
  { immediate: true },
);
</script>

<template>
  <li role="treeitem" :aria-level="depth" :aria-expanded="isFolder ? String(open) : undefined"
    :aria-selected="String(selected)" :tabindex="api.tabStopId === node.id ? 0 : -1"
    :data-id="node.id" :data-name="node.name" @keydown.self="api.onRowKey($event, node)">
    <div class="row" :class="{ selected }" :style="{ paddingLeft: 8 + (depth - 1) * 16 + 'px' }"
      @click="api.onRowClick(node)" @contextmenu.prevent="api.openMenu($event, node)">
      <span
        class="chevron"
        aria-hidden="true"
      >{{ isFolder ? (open ? '▾' : '▸') : '' }}</span>
      <span aria-hidden="true">{{ isFolder ? '📁' : '📄' }}</span>
      <span v-if="renaming" class="edit" @click.stop>
        <input ref="box" v-model="draft" data-testid="rename-input" :aria-label="'Rename ' + node.name"
          @keydown.enter="api.commitRename(draft)" @keydown.escape="api.cancelRename()" />
        <span
          v-if="api.renameError"
          role="alert"
          class="error"
        >{{ api.renameError }}</span>
      </span>
      <span
        v-else-if="parts"
        class="name"
      >{{ parts[0] }}<mark>{{ parts[1] }}</mark>{{ parts[2] }}</span>
      <span v-else class="name">{{ node.name }}</span>
    </div>
    <ul v-if="children.length" role="group">
      <TreeItem
        v-for="c in children"
        :key="c.id"
        :node="c"
        :depth="depth + 1"
      />
    </ul>
  </li>
</template>
`,
          "/src/tree.js": `// Nested tree data plus the derived lookups the toolbar needs. App.vue mutates
// the reactive tree in place, so there are no copy-on-write helpers here.
let nextId = 1;
export const makeId = () => "n" + nextId++;

export const createTree = () => [
  {
    id: "src",
    name: "src",
    type: "folder",
    children: [
      {
        id: "components",
        name: "components",
        type: "folder",
        children: [
          { id: "button", name: "Button.jsx", type: "file" },
          { id: "modal", name: "Modal.jsx", type: "file" },
          { id: "searchbar", name: "SearchBar.jsx", type: "file" },
        ],
      },
      {
        id: "hooks",
        name: "hooks",
        type: "folder",
        children: [{ id: "usesearch", name: "useSearch.js", type: "file" }],
      },
      { id: "app", name: "App.jsx", type: "file" },
    ],
  },
  {
    id: "docs",
    name: "docs",
    type: "folder",
    children: [
      { id: "guide", name: "guide.md", type: "file" },
      { id: "tips", name: "search-tips.md", type: "file" },
    ],
  },
  { id: "readme", name: "README.md", type: "file" },
];

export const sortNodes = (nodes) =>
  [...nodes].sort((a, b) =>
    a.type !== b.type
      ? a.type === "folder"
        ? -1
        : 1
      : a.name.localeCompare(b.name),
  );

// One walk builds both maps: id -> node and id -> parent id (null at the top).
export function indexTree(
  nodes,
  parentId = null,
  byId = new Map(),
  parentOf = new Map(),
) {
  for (const n of nodes) {
    byId.set(n.id, n);
    parentOf.set(n.id, parentId);
    if (n.children) indexTree(n.children, n.id, byId, parentOf);
  }
  return { byId, parentOf };
}

// Root-first list of ancestors, e.g.
// pathTo('modal') -> [src, components, Modal.jsx]
export function pathTo(id, byId, parentOf) {
  const path = [];
  for (let cur = id; cur != null; cur = parentOf.get(cur))
    path.unshift(byId.get(cur));
  return path;
}

// Keep a node if it matches or if anything below it matches. Folders that are
// kept because of a descendant are returned
// in \`open\`, so the matches are visible.
export function filterTree(nodes, query, open = new Set()) {
  const out = [];
  for (const n of nodes) {
    const self = n.name.toLowerCase().includes(query);
    const kids = n.children ? filterTree(n.children, query, open) : [];
    if (kids.length) open.add(n.id);
    if (self || kids.length)
      out.push(n.children ? { ...n, children: kids } : n);
  }
  return out;
}

export function countMatches(nodes, query) {
  return nodes.reduce(
    (sum, n) =>
      sum +
      (n.name.toLowerCase().includes(query) ? 1 : 0) +
      (n.children ? countMatches(n.children, query) : 0),
    0,
  );
}

// "untitled.txt", then "untitled 2.txt", ...
// ; "New folder", then "New folder 2", ...
export function uniqueName(siblings, type) {
  const [base, ext] =
    type === "folder" ? ["New folder", ""] : ["untitled", ".txt"];
  const taken = new Set(siblings.map((s) => s.name.toLowerCase()));
  for (let i = 1; ; i++) {
    const name = base + (i === 1 ? "" : " " + i) + ext;
    if (!taken.has(name.toLowerCase())) return name;
  }
}
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Angular developers who can render a recursive tree with signals and now need breadcrumbs, search and a context menu.
**Difficulty:** Medium

> **How to read this doc:** Plain words first, then a <code>📌 Interview term:</code> tag. Tree basics are in [Build a File Explorer (tree view)](/interview-question/build-a-file-explorer-tree-view). Snippets come from the runnable Angular solution, verified on Angular 22.2.3 in AOT and in the playground JIT.

## 1. Why This Even Matters — A Story First

In a big library you need a "you are here" sign, a librarian who walks you to every shelf holding the book you asked for, and someone who offers the right actions when you hold a book up. Breadcrumbs, search and a context menu. In Angular they are \`computed\` signals over one tree, and one small menu component that moves itself to \`body\`.

## 2. Requirements and Plan

Breadcrumbs, search that keeps ancestors open only while active, highlights, and a right-click / Shift+F10 menu with four actions.

| Piece | Angular tool |
| :--- | :--- |
| state | \`signal\`s in \`ExplorerState\`, provided on \`AppComponent\` |
| \`index\`, \`view\`, \`crumbs\`, \`summary\`, \`menuItems\`, \`tabStopId\` | \`computed\` |
| breadcrumbs | \`BreadcrumbsComponent\`: \`@Input() crumbs\`, \`@Output() navigate\` |
| menu | \`ContextMenuComponent\`: host bindings, \`@HostListener\`, host moved to \`body\` |

📌 **Interview term: computed signal** — a read-only signal derived from others, recomputed lazily when a dependency changes. The pruned tree is a \`computed\` of the tree, query and expanded set. See [Angular signals](/interview-question/what-are-angular-signals).

## 3. Build It Step by Step

### Step 1: Crumbs from a parent map

~~~ts
readonly crumbs = computed(() => {
  const ix = this.index();
  const s = ix.byId.get(this.selectedId() ?? "");
  if (!s) return [];
  const folderId = s.type === "folder" ? s.id : ix.parentOf.get(s.id);
  return folderId ? pathTo(folderId, ix) : [];
});
~~~

\`BreadcrumbsComponent\` loops with \`@for (c of crumbs; track c.id; let last = $last)\` and renders a button, or a \`span\` with \`aria-current="page"\` for the last crumb, emitting \`navigate\` through an \`@Output\` (see [how children emit events](/interview-question/how-do-child-components-emit-events-to-parents)).

### Step 2: Search without touching \`expanded\`

~~~ts
readonly view = computed(() => {
  const q = this.q();
  if (!q)
    return {
      nodes: this.tree(),
      open: this.expanded(),
      matches: null as number | null,
    };
  const open = new Set<string>();
  return {
    nodes: filterTree(this.tree(), q, open),
    open: open as ReadonlySet<string>,
    matches: countMatches(this.tree(), q),
  };
});
~~~

📌 **Interview term: Pruned tree** — a filtered copy keeping matches and their ancestors. \`filterTree\` also collects which folders must be open; that set stands in for \`expanded\` only while a query exists. The row component splits its name around the match in a getter and the template renders \`{{ p[0] }}<mark>{{ p[1] }}</mark>{{ p[2] }}\`.

### Step 3: A menu without the CDK

Angular has no built-in portal outside the CDK (\`@angular/cdk/overlay\`), which the playground cannot import. The menu component therefore moves its own host element:

~~~ts
ngAfterViewInit() {
  document.body.appendChild(this.el);
  this.el.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
}
ngOnDestroy() {
  this.el.remove();
}

@HostListener("document:pointerdown", ["$event"])
onDocDown(e: Event) {
  if (!this.el.contains(e.target as Node)) this.close.emit(false);
}

@HostListener("window:resize")
onResize() {
  this.close.emit(false);
}
~~~

📌 **Interview term: @HostListener** — a decorator that subscribes a method to an event on the host, or globally with a \`document:\` or \`window:\` prefix, and unsubscribes when the component is destroyed. See [@HostListener and @HostBinding](/interview-question/what-do-hostlistener-and-hostbinding-do). It listens in the bubbling phase only, so a capture-phase listener would need \`addEventListener\` by hand.

\`ngOnDestroy\` calls \`this.el.remove()\`. Angular removes a destroyed component's host from wherever it is, and both the AOT and JIT runs closed and reopened the moved menu several times with no errors.

### Step 4: Recursion note and actions by id

The row is \`li[app-tree-item]\`, and it lists itself in \`imports\` via \`forwardRef\`. Without that, this exact component passed the AOT build but the playground JIT logged \`NG0303: Can't bind to 'node' since it isn't a known property of 'li'\` and rendered no children. Actions such as \`commitRename\` look the node up in \`index().byId\`, because a search renders filtered copies, and update with copy-on-write helpers.

## 4. Verified

Run by \`scripts/verify-mc-solution.mjs\` in AOT (\`ngc\`, strict templates) and in the runtime JIT, each with \`bootstrapApplication(AppComponent)\` and no providers. Both printed the same lines; JIT run shown:

~~~text
[angular:playground] RENDERED: Project▸📁docs▾📁src▸📁components▸📁hooks📄App.jsx📄README.md
[angular:playground] tree: > docs  v src  .> components  .> hooks  .App.jsx  README.md
[angular:playground] crumbs: [Project]
[angular:playground] select Modal.jsx -> crumbs: Project / src / [components]
[angular:playground] click crumb src -> crumbs: Project / [src] | selected: src
[angular:playground] search "search": 3 matches
[angular:playground] filtered: v docs  .search-tips.md  v src  .v components  ..SearchBar.jsx  .v hooks  ..useSearch.js
[angular:playground] marks: search-tips.md=search, SearchBar.jsx=Search, useSearch.js=Search
[angular:playground] pick useSearch.js -> crumbs: Project / src / [hooks]
[angular:playground] cleared search: > docs  v src  .v components  ..Button.jsx  ..Modal.jsx  ..SearchBar.jsx  .v hooks  ..useSearch.js  .App.jsx  README.md
[angular:playground] search "zzz": No files match "zzz" | rows: 0
[angular:playground] contextmenu on docs -> defaultPrevented: true
[angular:playground] menu: Actions for docs | in body: true | left/top: 836px 624px | focus: New file
[angular:playground] ArrowDown -> focus: New folder
[angular:playground] ArrowUp x2 (wraps) -> focus: Delete
[angular:playground] Escape -> menu open: false | focus back on: docs
[angular:playground] Shift+F10 -> menu open: true | focus: New file
[angular:playground] New file: Created untitled.txt in docs | menu open: false | focus: untitled.txt
[angular:playground] contextmenu on docs -> defaultPrevented: true
[angular:playground] left/top near the pointer: 40px 120px
[angular:playground] New file again: Created untitled 2.txt in docs
[angular:playground] tree: v docs  .guide.md  .search-tips.md  .untitled 2.txt  .untitled.txt  v src  .v components  ..Button.jsx  ..Modal.jsx  ..SearchBar.jsx  .v hooks  ..useSearch.js  .App.jsx  README.md
[angular:playground] contextmenu on README.md -> defaultPrevented: true
[angular:playground] pointerdown outside -> menu open: false
[angular:playground] contextmenu on guide.md -> defaultPrevented: true
[angular:playground] rename to a taken name: "search-tips.md" already exists here
[angular:playground] rename: Renamed guide.md to guide-v2.md | focus: guide-v2.md
[angular:playground] contextmenu on src -> defaultPrevented: true
[angular:playground] delete src: Deleted src | crumbs: [Project]
[angular:playground] tree: v docs  .guide-v2.md  .search-tips.md  .untitled 2.txt  .untitled.txt  README.md
~~~

It matches React and Vue line for line, including the menu being a child of \`body\` at \`836px 624px\`, wrap-around focus, focus returning to \`docs\` on Escape, outside \`pointerdown\` closing it, the duplicate-name check and the reset crumbs after deleting \`src\`. No \`console.error\` in either mode. Not checked: pixel layout and real assistive technology.

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Menu near an edge | \`placeMenu\` clamps with fixed dimensions |
| Keyboard open | Shift+F10 / ContextMenu key; Escape returns focus via \`afterNextRender\` |
| No matches | Message in an \`aria-live\` paragraph |
| Semantics | Host \`role="menu"\` + \`aria-label\`; \`menuitem\` buttons |
| Styles | Root uses \`ViewEncapsulation.None\`, so the moved menu is still styled |

## 6. Common Pitfalls

- **Expecting emulated styles on a moved host.** The menu leaves the component tree's DOM; global styles (or \`None\` encapsulation) keep it styled.
- **Moving the host in \`ngOnInit\`.** The children are not rendered yet, so there is nothing to focus; do it in \`ngAfterViewInit\`.
- **No self-import on a recursive component.** AOT passes, the playground JIT fails with \`NG0303\`.
- **Calling \`preventDefault\` conditionally on \`contextmenu\` too late.** Call it first in the handler, or the browser menu appears.
- **Mutating the filtered copy.** It is rebuilt on the next keystroke; update the real tree signal.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Framing:</strong> <span style="color:#f0e2c8;">"Breadcrumbs, search and the menu are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> views over one tree signal; only the query and the menu position are new state."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Breadcrumbs:</strong> <span style="color:#f0e2c8;">"A computed index gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">byId</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parentOf</code>; crumbs climb from the current folder, and a small component emits <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">navigate</code> through an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Output</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Search:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">filterTree</code> returns a pruned copy and a forced-open set, used only while the query is non-empty, so the user's expanded signal is untouched."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Menu:</strong> <span style="color:#f0e2c8;">"Without the CDK, the menu component appends its host to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">body</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngAfterViewInit</code>, removes it on destroy, and uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@HostListener</code> for outside presses, resize and keys."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Keyboard:</strong> <span style="color:#f0e2c8;">"Shift+F10 opens it, arrows wrap, Escape emits close with return-focus, and the store focuses the row in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterNextRender</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">In a real app would you hand-roll this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, I would use the CDK Overlay or the CDK Menu: they handle positioning strategies, scroll strategies, focus and ARIA. Hand-rolling here shows I know what they do for me.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@HostListener</code> not cover everything?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It always registers in the bubbling phase. An outside-press listener that must run before other handlers, or a scroll listener that catches inner scrollers, needs the capture phase, so I would add those with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">addEventListener</code> and remove them in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnDestroy</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you debounce the search with signals?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Convert the query signal with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toObservable</code>, pipe <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">debounceTime</code>, and bring it back with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toSignal</code>, or debounce in the input handler with a timer that sets a second signal.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test the menu?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In TestBed, dispatch a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">contextmenu</code> with coordinates on a row, run change detection, assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.body.lastElementChild</code> is the menu and that its first item is focused, then dispatch Escape.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Meaning |
| :--- | :--- |
| computed signal | Derived, cached signal |
| Pruned tree | Copy that keeps ancestors of matches |
| @HostListener | Host or global event subscription tied to the component |
| CDK Overlay | Angular CDK service for floating panels |
| \`aria-current\` | Marks the current crumb |

---

**Conclusion:** The Angular toolbar is a set of \`computed\` signals (index, crumbs, pruned view, summary) over one tree, a breadcrumbs component with an \`@Output\`, and a self-moving menu component driven by \`@HostListener\`. Know that the CDK does the menu for you in production, and remember the self-import for recursive components in the playground.`,
        files: {
          "/src/app/app.component.ts": `import { Component, ViewEncapsulation, inject } from "@angular/core";
import { ExplorerState } from "./explorer-state";
import { TreeItemComponent } from "./tree-item.component";
import { BreadcrumbsComponent } from "./breadcrumbs.component";
import { ContextMenuComponent } from "./context-menu.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [TreeItemComponent, BreadcrumbsComponent, ContextMenuComponent],
  providers: [ExplorerState],
  encapsulation: ViewEncapsulation.None,
  template: \`
    <div class="app">
      <app-breadcrumbs [crumbs]="s.crumbs()" (navigate)="s.navigate($event)" />
      <input type="search" class="search" data-testid="search" placeholder="Filter files..."
        aria-label="Filter files" aria-controls="file-tree" #q [value]="s.query()" (input)="s.query.set(q.value)" />
      <p
        class="summary"
        aria-live="polite"
        data-testid="summary"
      >{{ s.summary() }}</p>
      <ul id="file-tree" role="tree" aria-label="Project files" class="tree">
        @for (n of s.visible(); track n.id) {
          <li app-tree-item [node]="n" [depth]="1"></li>
        }
      </ul>
      <p class="status" role="status" data-testid="status">{{ s.status() }}</p>
      @if (s.menu(); as m) {
        @if (s.target(); as t) {
          <app-context-menu [left]="m.left" [top]="m.top" [label]="'Actions for ' + t.name"
            [items]="s.menuItems()" (close)="s.closeMenu($event)" />
        }
      }
    </div>
  \`,
  styles: [
    \`
    body { margin: 0; background: #0f1115; color: #e6e6e6; font-family: system-ui, sans-serif; }
    .app { max-width: 520px; margin: 0 auto; padding: 16px; }
    button { background: #1d2230; color: #e6e6e6; border: 1px solid #343b4f; border-radius: 6px; padding: 4px 8px; cursor: pointer; font: inherit; }
    .crumbs ol { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; list-style: none; margin: 0 0 10px; padding: 0; font-size: 14px; }
    .crumbs li { display: flex; align-items: center; gap: 4px; }
    .crumbs button { background: none; border: none; color: #8ab4ff; padding: 2px 4px; }
    .crumbs [aria-current] { font-weight: 600; padding: 2px 4px; }
    .sep { color: #5d667a; }
    .search { width: 100%; box-sizing: border-box; background: #161a23; color: #e6e6e6; border: 1px solid #343b4f; border-radius: 6px; padding: 8px 10px; }
    .summary { min-height: 1.2em; margin: 6px 0; color: #9aa3b5; font-size: 13px; }
    .tree, .tree ul { list-style: none; margin: 0; padding: 0; }
    .tree { background: #161a23; border: 1px solid #262c3b; border-radius: 8px; padding: 6px 0; }
    .row { display: flex; align-items: center; gap: 6px; padding: 4px 8px; cursor: pointer; border-radius: 4px; }
    .row:hover { background: #1f2533; }
    .row.selected { background: #263354; }
    [role="treeitem"]:focus { outline: none; }
    [role="treeitem"]:focus-visible > .row { outline: 2px solid #6ea8ff; outline-offset: -2px; }
    .chevron { width: 12px; color: #8a93a8; }
    mark { background: #6b5200; color: #ffe08a; border-radius: 2px; }
    .edit { display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .edit input { background: #0f1115; color: #e6e6e6; border: 1px solid #6ea8ff; border-radius: 4px; padding: 3px 6px; }
    .error { color: #ff8a80; font-size: 12px; }
    .status { min-height: 1.2em; color: #9aa3b5; font-size: 13px; }
    .menu { position: fixed; width: 180px; z-index: 10; display: flex; flex-direction: column; padding: 4px; background: #1d2230; border: 1px solid #343b4f; border-radius: 8px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5); }
    .menu button { border: none; background: none; text-align: left; height: 32px; padding: 0 10px; }
    .menu button:focus { background: #263354; outline: none; }
    .menu .danger { color: #ff8a80; }
  \`,
  ],
})
export class AppComponent {
  s = inject(ExplorerState);
}
`,
          "/src/app/breadcrumbs.component.ts": `import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FsNode } from "./tree";

@Component({
  selector: "app-breadcrumbs",
  standalone: true,
  template: \`
    <nav aria-label="Breadcrumb" class="crumbs" data-testid="breadcrumbs">
      <ol>
        <li>
          @if (crumbs.length) {
            <button (click)="navigate.emit(null)">Project</button>
          } @else {
            <span aria-current="page">Project</span>
          }
        </li>
        @for (c of crumbs; track c.id; let last = $last) {
          <li>
            <span class="sep" aria-hidden="true">/</span>
            @if (last) {
              <span aria-current="page">{{ c.name }}</span>
            } @else {
              <button (click)="navigate.emit(c.id)">{{ c.name }}</button>
            }
          </li>
        }
      </ol>
    </nav>
  \`,
})
export class BreadcrumbsComponent {
  @Input() crumbs: FsNode[] = [];
  @Output() navigate = new EventEmitter<string | null>();
}
`,
          "/src/app/context-menu.component.ts": `import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  inject,
} from "@angular/core";
import { MenuItem } from "./explorer-state";

// Angular has no built-in portal outside the CDK (@angular/cdk/overlay), so the
// component moves its own host element to
// the end of <body> and removes it again.
@Component({
  selector: "app-context-menu",
  standalone: true,
  host: {
    role: "menu",
    class: "menu",
    "data-testid": "context-menu",
    "[attr.aria-label]": "label",
    "[style.left.px]": "left",
    "[style.top.px]": "top",
  },
  template: \`
    @for (it of items; track it.label) {
      <button
        role="menuitem"
        tabindex="-1"
        [class.danger]="it.danger"
        (click)="choose(it)"
      >{{ it.label }}</button>
    }
  \`,
})
export class ContextMenuComponent implements AfterViewInit, OnDestroy {
  @Input() left = 0;
  @Input() top = 0;
  @Input() label = "";
  @Input() items: MenuItem[] = [];
  // true = return focus to the row
  @Output() close = new EventEmitter<boolean>();
  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  ngAfterViewInit() {
    document.body.appendChild(this.el);
    this.el.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }
  ngOnDestroy() {
    this.el.remove();
  }

  @HostListener("document:pointerdown", ["$event"])
  onDocDown(e: Event) {
    if (!this.el.contains(e.target as Node)) this.close.emit(false);
  }

  @HostListener("window:resize")
  onResize() {
    this.close.emit(false);
  }

  @HostListener("keydown", ["$event"])
  onKeyDown(e: KeyboardEvent) {
    const all = Array.from(
      this.el.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    );
    const i = all.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") all[(i + 1) % all.length].focus();
    else if (e.key === "ArrowUp")
      all[(i - 1 + all.length) % all.length].focus();
    else if (e.key === "Home") all[0].focus();
    else if (e.key === "End") all[all.length - 1].focus();
    else if (e.key === "Escape" || e.key === "Tab")
      this.close.emit(e.key === "Escape");
    else return;
    e.preventDefault();
  }

  choose(it: MenuItem) {
    this.close.emit(true);
    it.run();
  }
}
`,
          "/src/app/explorer-state.ts": `import {
  ElementRef,
  Injectable,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
} from "@angular/core";
import {
  FsNode,
  initialTree,
  makeId,
  sortNodes,
  indexTree,
  pathTo,
  filterTree,
  countMatches,
  updateNode,
  removeNode,
  insertNode,
  uniqueName,
} from "./tree";

export interface MenuItem {
  label: string;
  danger?: boolean;
  run: () => void;
}

const MENU_W = 180,
  ITEM_H = 32,
  MENU_ITEMS = 4;
function placeMenu(x: number, y: number) {
  const h = MENU_ITEMS * ITEM_H + 8;
  return {
    left: Math.max(8, Math.min(x, window.innerWidth - MENU_W - 8)),
    top: Math.max(8, Math.min(y, window.innerHeight - h - 8)),
  };
}

// Provided by AppComponent, injected by every recursive tree item.
@Injectable()
export class ExplorerState {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private injector = inject(Injector);

  readonly tree = signal<FsNode[]>(initialTree);
  readonly expanded = signal<ReadonlySet<string>>(new Set(["src"]));
  readonly selectedId = signal<string | null>(null);
  readonly query = signal("");
  readonly menu = signal<{ left: number; top: number; nodeId: string } | null>(
    null,
  );
  readonly renamingId = signal<string | null>(null);
  readonly renameError = signal("");
  readonly status = signal("");

  // Derived state, each recomputed only when a signal it read has changed.
  readonly index = computed(() => indexTree(this.tree()));
  readonly q = computed(() => this.query().trim().toLowerCase());
  readonly view = computed(() => {
    const q = this.q();
    if (!q)
      return {
        nodes: this.tree(),
        open: this.expanded(),
        matches: null as number | null,
      };
    const open = new Set<string>();
    return {
      nodes: filterTree(this.tree(), q, open),
      open: open as ReadonlySet<string>,
      matches: countMatches(this.tree(), q),
    };
  });
  readonly visible = computed(() => sortNodes(this.view().nodes));
  readonly crumbs = computed(() => {
    const ix = this.index();
    const s = ix.byId.get(this.selectedId() ?? "");
    if (!s) return [];
    const folderId = s.type === "folder" ? s.id : ix.parentOf.get(s.id);
    return folderId ? pathTo(folderId, ix) : [];
  });
  readonly tabStopId = computed(() => {
    const ids = new Set<string>();
    const open = this.view().open;
    const walk = (ns: FsNode[]) =>
      ns.forEach((n) => {
        ids.add(n.id);
        if (n.children && open.has(n.id)) walk(n.children);
      });
    walk(this.view().nodes);
    const id = this.selectedId();
    return id && ids.has(id) ? id : (this.visible()[0]?.id ?? null);
  });
  readonly summary = computed(() => {
    const m = this.view().matches;
    if (m === null) return "";
    return m
      ? m + " match" + (m === 1 ? "" : "es")
      : 'No files match "' + this.query().trim() + '"';
  });
  readonly target = computed(() => {
    const m = this.menu();
    return m ? (this.index().byId.get(m.nodeId) ?? null) : null;
  });
  readonly menuItems = computed<MenuItem[]>(() => {
    const t = this.target();
    if (!t) return [];
    return [
      { label: "New file", run: () => this.create(t, "file") },
      { label: "New folder", run: () => this.create(t, "folder") },
      {
        label: "Rename",
        run: () => {
          this.renamingId.set(t.id);
          this.renameError.set("");
        },
      },
      { label: "Delete", danger: true, run: () => this.remove(t) },
    ];
  });

  isOpen(id: string) {
    return this.view().open.has(id);
  }

  private focusRow(id: string | null | undefined) {
    if (!id) return;
    afterNextRender(
      () => {
        this.host.nativeElement
          .querySelector<HTMLElement>(\`[data-id="\${id}"]\`)
          ?.focus();
      },
      { injector: this.injector },
    );
  }

  private reveal(id: string, includeSelf: boolean) {
    const { parentOf } = this.index();
    this.expanded.update((prev) => {
      const next = new Set(prev);
      for (
        let cur = includeSelf ? id : parentOf.get(id);
        cur != null;
        cur = parentOf.get(cur)
      )
        next.add(cur);
      return next;
    });
  }

  navigate(id: string | null) {
    this.selectedId.set(id);
    if (id) this.reveal(id, true);
    this.query.set("");
  }

  onRowClick(node: FsNode) {
    this.selectedId.set(node.id);
    this.reveal(node.id, false);
    if (node.type === "folder" && !this.q()) {
      this.expanded.update((prev) => {
        const next = new Set(prev);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        return next;
      });
    }
  }

  openMenu(e: MouseEvent, node: FsNode) {
    e.preventDefault();
    this.selectedId.set(node.id);
    this.menu.set({ ...placeMenu(e.clientX, e.clientY), nodeId: node.id });
  }

  onRowKey(e: KeyboardEvent, node: FsNode) {
    if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
      e.preventDefault();
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      this.selectedId.set(node.id);
      this.menu.set({ ...placeMenu(r.left + 24, r.bottom), nodeId: node.id });
    }
  }

  closeMenu(returnFocus: boolean) {
    const id = this.menu()?.nodeId;
    this.menu.set(null);
    if (returnFocus) this.focusRow(id);
  }

  create(node: FsNode, type: "file" | "folder") {
    const { byId, parentOf } = this.index();
    const parentId =
      node.type === "folder" ? node.id : (parentOf.get(node.id) ?? null);
    const siblings =
      parentId === null ? this.tree() : (byId.get(parentId)?.children ?? []);
    const item: FsNode = {
      id: makeId(),
      name: uniqueName(siblings, type),
      type,
    };
    if (type === "folder") item.children = [];
    this.tree.update((t) => insertNode(t, parentId, item));
    if (parentId) this.reveal(parentId, true);
    this.selectedId.set(item.id);
    this.focusRow(item.id);
    this.status.set(
      "Created " +
        item.name +
        " in " +
        (parentId ? byId.get(parentId)?.name : "Project"),
    );
  }

  remove(node: FsNode) {
    const parentId = this.index().parentOf.get(node.id) ?? null;
    this.tree.update((t) => removeNode(t, node.id));
    this.selectedId.set(parentId);
    this.focusRow(parentId);
    this.status.set("Deleted " + node.name);
  }

  commitRename(raw: string) {
    const name = raw.trim();
    const { byId, parentOf } = this.index();
    const node = byId.get(this.renamingId() ?? "");
    if (!node) return;
    if (!name || name === node.name) {
      this.cancelRename();
      return;
    }
    const parentId = parentOf.get(node.id) ?? null;
    const siblings =
      parentId === null ? this.tree() : (byId.get(parentId)?.children ?? []);
    if (
      siblings.some(
        (s) => s.id !== node.id && s.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      this.renameError.set('"' + name + '" already exists here');
      return;
    }
    this.tree.update((t) => updateNode(t, node.id, (n) => ({ ...n, name })));
    this.status.set("Renamed " + node.name + " to " + name);
    this.cancelRename();
  }

  cancelRename() {
    this.focusRow(this.renamingId());
    this.renamingId.set(null);
    this.renameError.set("");
  }
}
`,
          "/src/app/tree-item.component.ts": `import {
  Component,
  ElementRef,
  Input,
  ViewChild,
  effect,
  forwardRef,
  inject,
  signal,
} from "@angular/core";
import { ExplorerState } from "./explorer-state";
import { FsNode, sortNodes } from "./tree";

// Recursive: it lists itself in imports.
// Without that, the playground JIT reported
// NG0303 (unknown property node on li) while the AOT build was fine.
@Component({
  selector: "li[app-tree-item]",
  standalone: true,
  imports: [forwardRef(() => TreeItemComponent)],
  host: {
    role: "treeitem",
    "[attr.aria-level]": "depth",
    "[attr.aria-expanded]": "isFolder ? open : null",
    "[attr.aria-selected]": "selected",
    "[attr.tabindex]": "state.tabStopId() === node.id ? 0 : -1",
    "[attr.data-id]": "node.id",
    "[attr.data-name]": "node.name",
    "(keydown)": "onKey($event)",
  },
  template: \`
    <div
      class="row"
      [class.selected]="selected"
      [style.padding-left.px]="8 + (depth - 1) * 16"
      (click)="state.onRowClick(node)"
      (contextmenu)="state.openMenu($event, node)"
    >
      <span class="chevron" aria-hidden="true">{{
        isFolder ? (open ? "▾" : "▸") : ""
      }}</span>
      <span aria-hidden="true">{{ isFolder ? "📁" : "📄" }}</span>
      @if (renaming) {
        <span class="edit" (click)="$event.stopPropagation()">
          <input
            #box
            data-testid="rename-input"
            [attr.aria-label]="'Rename ' + node.name"
            [value]="draft()"
            (input)="draft.set(box.value)"
            (keydown.enter)="state.commitRename(draft())"
            (keydown.escape)="state.cancelRename()"
          />
          @if (state.renameError()) {
            <span role="alert" class="error">{{ state.renameError() }}</span>
          }
        </span>
      } @else if (parts; as p) {
        <span class="name"
          >{{ p[0] }}<mark>{{ p[1] }}</mark
          >{{ p[2] }}</span
        >
      } @else {
        <span class="name">{{ node.name }}</span>
      }
    </div>
    @if (children.length) {
      <ul role="group">
        @for (c of children; track c.id) {
          <li app-tree-item [node]="c" [depth]="depth + 1"></li>
        }
      </ul>
    }
  \`,
})
export class TreeItemComponent {
  @Input({ required: true }) node!: FsNode;
  @Input() depth = 1;
  @ViewChild("box") set box(el: ElementRef<HTMLInputElement> | undefined) {
    // Runs when the rename input appears: focus it and select the old name.
    if (el) {
      el.nativeElement.focus();
      el.nativeElement.select();
    }
  }
  state = inject(ExplorerState);
  draft = signal("");

  constructor() {
    // Seed the draft each time this row enters rename mode.
    effect(() => {
      if (this.state.renamingId() === this.node?.id)
        this.draft.set(this.node.name);
    });
  }

  get isFolder() {
    return this.node.type === "folder";
  }
  get open() {
    return this.isFolder && this.state.isOpen(this.node.id);
  }
  get selected() {
    return this.state.selectedId() === this.node.id;
  }
  get renaming() {
    return this.state.renamingId() === this.node.id;
  }
  get children() {
    return this.open ? sortNodes(this.node.children ?? []) : [];
  }
  get parts(): [string, string, string] | null {
    const q = this.state.q();
    const name = this.node.name;
    const i = q ? name.toLowerCase().indexOf(q) : -1;
    return i < 0
      ? null
      : [
          name.slice(0, i),
          name.slice(i, i + q.length),
          name.slice(i + q.length),
        ];
  }

  onKey(e: KeyboardEvent) {
    if (e.target === e.currentTarget) this.state.onRowKey(e, this.node);
  }
}
`,
          "/src/app/tree.ts": `// Nested tree data plus the derived lookups
// the toolbar needs. Signals compare by
// reference, so updates are copy-on-write:
// only folders on the changed path are copied.
export interface FsNode {
  id: string;
  name: string;
  type: "folder" | "file";
  children?: FsNode[];
}
export interface TreeIndex {
  byId: Map<string, FsNode>;
  parentOf: Map<string, string | null>;
}

let nextId = 1;
export const makeId = () => "n" + nextId++;

export const initialTree: FsNode[] = [
  {
    id: "src",
    name: "src",
    type: "folder",
    children: [
      {
        id: "components",
        name: "components",
        type: "folder",
        children: [
          { id: "button", name: "Button.jsx", type: "file" },
          { id: "modal", name: "Modal.jsx", type: "file" },
          { id: "searchbar", name: "SearchBar.jsx", type: "file" },
        ],
      },
      {
        id: "hooks",
        name: "hooks",
        type: "folder",
        children: [{ id: "usesearch", name: "useSearch.js", type: "file" }],
      },
      { id: "app", name: "App.jsx", type: "file" },
    ],
  },
  {
    id: "docs",
    name: "docs",
    type: "folder",
    children: [
      { id: "guide", name: "guide.md", type: "file" },
      { id: "tips", name: "search-tips.md", type: "file" },
    ],
  },
  { id: "readme", name: "README.md", type: "file" },
];

export const sortNodes = (nodes: FsNode[]): FsNode[] =>
  [...nodes].sort((a, b) =>
    a.type !== b.type
      ? a.type === "folder"
        ? -1
        : 1
      : a.name.localeCompare(b.name),
  );

// One walk builds both maps: id -> node and id -> parent id (null at the top).
export function indexTree(
  nodes: FsNode[],
  parentId: string | null = null,
  byId = new Map<string, FsNode>(),
  parentOf = new Map<string, string | null>(),
): TreeIndex {
  for (const n of nodes) {
    byId.set(n.id, n);
    parentOf.set(n.id, parentId);
    if (n.children) indexTree(n.children, n.id, byId, parentOf);
  }
  return { byId, parentOf };
}

// Root-first list of ancestors, e.g.
// pathTo('modal') -> [src, components, Modal.jsx]
export function pathTo(id: string, { byId, parentOf }: TreeIndex): FsNode[] {
  const path: FsNode[] = [];
  for (
    let cur: string | null | undefined = id;
    cur != null;
    cur = parentOf.get(cur)
  )
    path.unshift(byId.get(cur)!);
  return path;
}

// Keep a node if it matches or if anything below it matches. Folders that are
// kept because of a descendant are returned
// in \`open\`, so the matches are visible.
export function filterTree(
  nodes: FsNode[],
  query: string,
  open = new Set<string>(),
): FsNode[] {
  const out: FsNode[] = [];
  for (const n of nodes) {
    const self = n.name.toLowerCase().includes(query);
    const kids = n.children ? filterTree(n.children, query, open) : [];
    if (kids.length) open.add(n.id);
    if (self || kids.length)
      out.push(n.children ? { ...n, children: kids } : n);
  }
  return out;
}

export function countMatches(nodes: FsNode[], query: string): number {
  return nodes.reduce(
    (sum: number, n: FsNode): number =>
      sum +
      (n.name.toLowerCase().includes(query) ? 1 : 0) +
      (n.children ? countMatches(n.children, query) : 0),
    0,
  );
}

export function updateNode(
  nodes: FsNode[],
  id: string,
  fn: (n: FsNode) => FsNode,
): FsNode[] {
  let changed = false;
  const next = nodes.map((n) => {
    if (n.id === id) {
      changed = true;
      return fn(n);
    }
    if (n.children) {
      const kids = updateNode(n.children, id, fn);
      if (kids !== n.children) {
        changed = true;
        return { ...n, children: kids };
      }
    }
    return n;
  });
  return changed ? next : nodes;
}

export function removeNode(nodes: FsNode[], id: string): FsNode[] {
  let changed = false;
  const next: FsNode[] = [];
  for (const n of nodes) {
    if (n.id === id) {
      changed = true;
      continue;
    }
    if (n.children) {
      const kids = removeNode(n.children, id);
      if (kids !== n.children) {
        changed = true;
        next.push({ ...n, children: kids });
        continue;
      }
    }
    next.push(n);
  }
  return changed ? next : nodes;
}

export function insertNode(
  nodes: FsNode[],
  parentId: string | null,
  node: FsNode,
): FsNode[] {
  if (parentId === null) return [...nodes, node];
  return updateNode(nodes, parentId, (f) => ({
    ...f,
    children: [...(f.children ?? []), node],
  }));
}

// "untitled.txt", then "untitled 2.txt", ...
// ; "New folder", then "New folder 2", ...
export function uniqueName(
  siblings: FsNode[],
  type: "file" | "folder",
): string {
  const [base, ext] =
    type === "folder" ? ["New folder", ""] : ["untitled", ".txt"];
  const taken = new Set(siblings.map((s) => s.name.toLowerCase()));
  for (let i = 1; ; i++) {
    const name = base + (i === 1 ? "" : " " + i) + ext;
    if (!taken.has(name.toLowerCase())) return name;
  }
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a File Explorer with Nested Drag-and-Drop",
    seoDescription:
      "Move files and folders by drag-and-drop in a nested tree: normalized state, before/inside/after drop zones, no drop into a descendant, keyboard moves.",
    description: `**Question presented to candidate:**
"Our file tree can already expand, collapse and edit. Now let users reorganise it by dragging: drop a file or folder onto a folder to move it inside, or near the top or bottom edge of any row to place it before or after. Make sure nobody can drop a folder into itself or into one of its own subfolders, and give keyboard users a way to move things too."

**Requirements:**
- Store the tree normalized: \`id -> { name, type, parentId, childIds }\`, built from nested JSON on load; manual order is kept in \`childIds\`.
- HTML5 drag-and-drop on each row: \`dragstart\`, \`dragover\` (decide and show the drop position), \`drop\`, \`dragend\` (clean up).
- Drop position from the pointer inside the row: folders use top quarter = before, bottom quarter = after, middle = inside; files use top half / bottom half.
- Reject a drop whose new parent is the dragged node or any of its descendants, both while hovering (no \`preventDefault\`, invalid indicator) and again on drop.
- Reject a name clash in the destination folder. Open the folder after an inside drop. Announce every result in a live region.
- Keyboard alternative: Ctrl+X on a row, Ctrl+V on a folder (inside) or file (after), Escape cancels; Up/Down move focus.

**What a strong answer should cover:**
- Why normalized state makes a move O(depth) and two small edits, compared with remove-and-reinsert on nested data.
- The descendant check as a walk up the \`parentId\` chain.
- The \`dragover\` contract: calling \`preventDefault()\` is what marks a valid drop target; \`dataTransfer\` data cannot be read during \`dragover\`, so the dragged id is kept in app state.
- Drop indicators and cleanup on \`dragend\` (also when the drop happens outside).
- An accessible alternative to dragging, and how to test drag-and-drop when the test DOM has no \`DataTransfer\`.

**Clarifying questions expected:**
- "Is reordering inside a folder needed, or only moving between folders?"
- "Should a move be persisted to a server, and what if it fails?"
- "Touch support: native drag-and-drop does not work on most mobile browsers; do we need pointer events?"

**Code / implementation expected:** Yes. The move logic with the descendant guard is the core; working drag handlers and a keyboard alternative are expected at this level.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Experienced frontend candidates who can build a recursive tree and want the hardest common extension: nested drag-and-drop.
**Difficulty:** Hard

> **How to read this doc:** Plain words first, then a <code>📌 Interview term:</code> tag. This question assumes [the tree view](/interview-question/build-a-file-explorer-tree-view) (recursion, expand state, immutable updates) and, for UI conventions, [the toolbar question](/interview-question/build-a-file-explorer-toolbar-breadcrumbs-search-context-menu). Snippets come from the runnable solution; the Verified section quotes its output on React 19.3.1, and explains exactly how drag events were simulated.

## 1. Why This Even Matters — A Story First

Imagine reorganising a box of nested envelopes. You can slide an envelope in front of another, behind it, or into it. There is one physical impossibility: you cannot put an envelope inside an envelope that is itself inside the first one. Your hands would notice. Code does not, and if you allow it, the folder detaches from the tree and silently vanishes (its parent chain now loops).

So the whole question is three decisions: **where** would this drop land (before, inside, after), **is it allowed** (not into yourself or a descendant, no name clash), and **how do we apply it** cheaply. Plus making it usable for someone who cannot drag.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Reorder inside a folder, or only move between folders? | Reordering needs before / after zones and a stored order, not alphabetical sorting. |
| Persist to a server? Rollback on failure? | Changes the move into an optimistic update with an undo path. |
| Touch devices? | Native HTML5 drag-and-drop does not fire on most mobile browsers; pointer events would be needed. |
| Multi-select drag? | Moving several nodes needs the guard for each and a stable insertion order. |
| How deep and how big is the tree? | Hover-to-expand and auto-scroll become important for deep trees. |
| What about name clashes in the destination? | Reject, rename to "copy", or ask; this build rejects. |

## 3. Requirements and Plan

### Why normalized state

📌 **Interview term: Normalized state** — every node lives once in a flat object keyed by id, with \`parentId\` and an ordered \`childIds\` array, instead of children nested inside parents. It is how Redux and most tree libraries store hierarchies.

| Operation | Nested tree | Normalized map |
| :--- | :--- | :--- |
| Find a node | Walk the tree, O(n) | \`nodes[id]\`, O(1) |
| Find its parent | Walk again | \`nodes[id].parentId\` |
| Move a subtree | Remove (copy path), then insert (copy another path) | Edit old parent \`childIds\`, new parent \`childIds\`, one \`parentId\` |
| Descendant check | Search the dragged subtree | Walk up from the target, O(depth) |

~~~js
export function normalize(items) {
  const nodes = {
    [ROOT]: {
      id: ROOT,
      name: "Project",
      type: "folder",
      parentId: null,
      childIds: [],
    },
  };
  const walk = (list, parentId) =>
    list.forEach((item) => {
      const id =
        parentId === ROOT ? item.name : parentId + "/" + item.name;
      nodes[id] = {
        id,
        name: item.name,
        type: item.type,
        parentId,
        childIds: [],
      };
      nodes[parentId].childIds.push(id);
      if (item.children) walk(item.children, id);
    });
  walk(items, ROOT);
  return nodes;
}
~~~

Ids here are built from the original path once, at load, and never recomputed, so they stay stable after a move.

### Drop zones and the one hard rule

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="A folder row split into three zones: top quarter before, middle inside, bottom quarter after. Next to it, a drop of src into its child components is rejected because the target lies under the dragged folder.">
  <defs>
    <marker id="fe3r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="260" height="40" rx="6"/>
  <text class="d-text" x="150" y="45" text-anchor="middle">top 25 percent: before</text>
  <rect class="d-box-accent" x="20" y="70" width="260" height="80" rx="6"/>
  <text class="d-text d-accent" x="150" y="115" text-anchor="middle">middle: inside</text>
  <rect class="d-box-muted" x="20" y="160" width="260" height="40" rx="6"/>
  <text class="d-text" x="150" y="185" text-anchor="middle">bottom 25 percent: after</text>
  <rect class="d-box" x="400" y="20" width="160" height="44" rx="8"/>
  <text class="d-text" x="480" y="47" text-anchor="middle">src (dragged)</text>
  <rect class="d-box" x="400" y="120" width="160" height="44" rx="8"/>
  <text class="d-text" x="480" y="147" text-anchor="middle">components</text>
  <path class="d-edge" d="M 480 64 L 480 120" marker-end="url(#fe3r-arrow)"/>
  <path class="d-edge-dashed" d="M 560 142 C 640 142 640 42 566 42" marker-end="url(#fe3r-arrow)"/>
</svg>

Files have no "inside", so their row splits in halves. For the guard, the dashed arrow is the check: start at the would-be parent and follow \`parentId\` up; meeting the dragged id means the drop would create a cycle.

| Piece | Kind |
| :--- | :--- |
| \`nodes\`, \`expanded\`, \`cutId\`, \`focusId\`, \`status\` | state |
| \`dragId\` | state for styling, mirrored in \`dragRef\` for the handlers |
| \`dropTarget\` \`{ id, position, valid }\` | state, drives the indicator |
| visible ids for the arrow keys | derived from \`nodes\` + \`expanded\` |

## 4. Build It Step by Step

### Step 1: The guard and the move

~~~js
export function isSelfOrAncestor(nodes, ancestorId, id) {
  for (let cur = id; cur != null; cur = nodes[cur].parentId)
    if (cur === ancestorId) return true;
  return false;
}
~~~

📌 **Interview term: Cycle prevention** — refusing any move whose new parent is the moved node or lies inside it, because a node can not be its own ancestor. Checking by walking *up* from the target is O(depth) and needs no search of the dragged subtree.

~~~js
export function moveNode(nodes, dragId, targetId, position) {
  // dropped on itself: nothing to do
  if (dragId === targetId) return { nodes };
  const drag = nodes[dragId];
  const parentId =
    position === "inside" ? targetId : nodes[targetId].parentId;
  const parent = nodes[parentId];
  if (isSelfOrAncestor(nodes, dragId, parentId)) {
    return {
      error:
        "Cannot move " +
        drag.name +
        " into itself or one of its subfolders",
    };
  }
  if (
    parent.childIds.some(
      (c) =>
        c !== dragId &&
        nodes[c].name.toLowerCase() === drag.name.toLowerCase(),
    )
  ) {
    return {
      error:
        "A " +
        drag.type +
        " named " +
        drag.name +
        " already exists in " +
        parent.name,
    };
  }
  const next = { ...nodes };
  const oldParent = nodes[drag.parentId];
  next[oldParent.id] = {
    ...oldParent,
    childIds: oldParent.childIds.filter((c) => c !== dragId),
  };
  const kids = [...next[parentId].childIds];
  if (position === "inside") kids.push(dragId);
  else
    kids.splice(
      kids.indexOf(targetId) + (position === "after" ? 1 : 0),
      0,
      dragId,
    );
  next[parentId] = { ...next[parentId], childIds: kids };
  next[dragId] = { ...drag, parentId };
  return { nodes: next };
}
~~~

The move copies the map once and replaces at most three nodes: the old parent, the new parent and the dragged node. Its children travel with it for free, because they point at it by id. Dropping a node on itself returns the same map, a no-op.

### Step 2: The \`dragover\` contract

📌 **Interview term: dragover and preventDefault** — the browser only allows a drop on an element whose \`dragover\` handler calls \`event.preventDefault()\`. Not calling it is how you say "not here": the cursor shows no-drop and \`drop\` never fires on that element.

~~~jsx
function measure(e, id) {
  const r = e.currentTarget.getBoundingClientRect();
  const position = dropPosition(
    nodes[id],
    (e.clientY - r.top) / r.height,
  );
  const parentId = position === "inside" ? id : nodes[id].parentId;
  const valid =
    dragRef.current !== id &&
    !isSelfOrAncestor(nodes, dragRef.current, parentId);
  return { id, position, valid };
}

function onDragOver(e, id) {
  if (!dragRef.current) return;
  const t = measure(e, id);
  if (t.valid) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  } // preventDefault = "drop allowed here"
  setDropTarget((prev) =>
    prev &&
    prev.id === t.id &&
    prev.position === t.position &&
    prev.valid === t.valid
      ? prev
      : t,
  );
}
~~~

📌 **Interview term: Drag data store protected mode** — during \`dragover\` (and \`dragenter\` / \`dragleave\`) the browser hides the drag payload: \`getData()\` returns an empty string; data is readable only in \`dragstart\` and \`drop\` ([MDN: getData](https://developer.mozilla.org/docs/Web/API/DataTransfer/getData)). So the dragged id lives in \`dragRef\`, a [ref](/interview-question/describe-the-useref-hook-and-its-typical-use-cases), not in the event. \`setData\` is still called in \`dragstart\`, because caniuse and [Mozilla bug 1203810](https://bugzilla.mozilla.org/show_bug.cgi?id=1203810) report that Firefox would not start a drag without it.

The indicator only updates when the target, position or validity changes, because \`dragover\` fires continuously (every few hundred milliseconds even when the pointer is still).

### Step 3: Drop and cleanup

~~~jsx
function onDrop(e, id) {
  e.preventDefault();
  if (dragRef.current) {
    const t = measure(e, id);
    doMove(dragRef.current, id, t.position);
  }
  onDragEnd();
}

function onDragEnd() {
~~~

\`moveNode\` checks the rule again on drop. The \`dragover\` check is a UX hint; the drop check is the real guard, since a different code path (keyboard, a test, another drag source) can reach it. \`dragend\` fires on the source even when the drop happens outside the tree, so it is where the drag state is cleared.

### Step 4: A keyboard alternative

📌 **Interview term: Accessible drag alternative** — a way to do the same move without dragging. Keyboard users need one (WCAG 2.1.1, Keyboard), and WCAG 2.2 adds success criterion 2.5.7, Dragging Movements (level AA), which asks for a *single-pointer* alternative too, such as a "Move to..." menu. This build implements the keyboard path, cut and paste; a "Move to..." item in a row menu would cover 2.5.7:

~~~jsx
else if (mod && e.key.toLowerCase() === 'x') {
  setCutId(id);
  setStatus('Cut ' + nodes[id].name + '. Focus a folder and press Ctrl+V to move it there.');
} else if (mod && e.key.toLowerCase() === 'v' && cutId) {
  const position = nodes[id].type === 'folder' ? 'inside' : 'after';
  if (doMove(cutId, id, position)) setCutId(null);
} else if (e.key === 'Escape' && cutId) {
~~~

Paste uses the same \`doMove\`, so the same guard and messages apply.

## 5. Verified

**How drag-and-drop was simulated:** jsdom 29.1.1 (used by the verifier) has no \`DataTransfer\` and no \`DragEvent\` in its interface list, and no layout. The driver therefore (1) creates plain \`MouseEvent\`s named \`dragstart\`, \`dragover\`, \`drop\` and \`dragend\` with a \`clientY\`, and attaches a small fake \`dataTransfer\` object with \`setData\`, \`getData\`, \`effectAllowed\` and \`dropEffect\`; (2) stubs \`getBoundingClientRect\` so every row is 30 px tall starting at y = 0, so \`clientY\` 5, 15 and 25 mean top edge, middle and bottom edge; (3) fires them from a timer inside a \`settle()\` window so React sees them inside \`act()\`. The solution code is unchanged real HTML5 drag-and-drop; what this does not prove is real browser drag behaviour (drag images, cursor feedback, the timing of real \`dragover\`). \`allowed\` is whether \`dragover\` called \`preventDefault()\`. Unedited output:

~~~text
[react] RENDERED: FilesDrag a row onto a folder to move it inside, or near a top or bottom edge to reorder. Keyboard: Ctrl+X, then Ctrl+V on a folder.▾📁src▾📁components📄Button.jsx📄Modal.jsx▸📁hooks📄App.jsx▾📁docs📄guide.md📄README.md📄README.md
[react] tree: v src  .v components  ..Button.jsx  ..Modal.jsx  .> hooks  .App.jsx  v docs  .guide.md  .README.md  README.md
[react] Button.jsx -> middle of hooks: {"allowed":true,"indicator":"inside","dropEffect":"move","data":"Button.jsx"}
[react]    Moved Button.jsx into hooks | v src  .v components  ..Modal.jsx  .v hooks  ..useTree.js  ..Button.jsx  .App.jsx  v docs  .guide.md  .README.md  README.md
[react] README.md -> top edge of src: {"allowed":true,"indicator":"before","dropEffect":"move","data":"README.md"}
[react]    Moved README.md before src | README.md  v src  .v components  ..Modal.jsx  .v hooks  ..useTree.js  ..Button.jsx  .App.jsx  v docs  .guide.md  .README.md
[react] src -> inside its own child components: {"allowed":false,"indicator":"invalid","dropEffect":"none","data":"src"}
[react]    Cannot move src into itself or one of its subfolders | dragging class cleared: true | indicator cleared: true
[react] Modal.jsx -> bottom edge of App.jsx: {"allowed":true,"indicator":"after","dropEffect":"move","data":"Modal.jsx"}
[react]    Moved Modal.jsx after App.jsx | README.md  v src  .v components  .v hooks  ..useTree.js  ..Button.jsx  .App.jsx  .Modal.jsx  v docs  .guide.md  .README.md
[react] docs (with children) -> inside src: true | Moved docs into src
[react]    README.md  v src  .v components  .v hooks  ..useTree.js  ..Button.jsx  .App.jsx  .Modal.jsx  .v docs  ..guide.md  ..README.md
[react] docs/README.md -> before src (root already has README.md): true | A file named README.md already exists in Project
[react] Ctrl+X on guide.md: Cut guide.md. Focus a folder and press Ctrl+V to move it there. | cut class: true
[react] ArrowUp x2 -> focus: Modal.jsx
[react] Ctrl+V on hooks: Moved guide.md into hooks
[react]    README.md  v src  .v components  .v hooks  ..useTree.js  ..Button.jsx  ..guide.md  .App.jsx  .Modal.jsx  .v docs  ..README.md
[react] Ctrl+X src, Ctrl+V on hooks: Cannot move src into itself or one of its subfolders
[react] Escape: Move cancelled | tab stops: 1
~~~

Read it as: \`Button.jsx\` dropped mid-row on \`hooks\` goes inside and opens \`hooks\`; \`README.md\` on the top edge of \`src\` goes before it at the root; dragging \`src\` over its own child is refused while hovering (\`allowed: false\`, indicator \`invalid\`, \`dropEffect: none\`) and, when the driver fires \`drop\` anyway, refused again by \`moveNode\`; the bottom edge of a file means "after"; a folder moves with its children; a drop that would put a second \`README.md\` at the root is refused by the name check. Keyboard: Ctrl+X marks \`guide.md\`, Ctrl+V on \`hooks\` moves it, Ctrl+V of \`src\` onto its own descendant is refused. No \`console.error\`.

## 6. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Drop on itself | No-op (\`moveNode\` returns the same map) |
| Drop into own descendant | No \`preventDefault\` while hovering; refused again on drop |
| Name clash in destination | Refused with a message |
| Drop outside the tree | \`dragend\` clears drag state and indicator |
| Inside drop on a closed folder | Folder opens so the moved item is visible |
| Keyboard users | Ctrl+X / Ctrl+V, Escape, Up/Down; roving \`tabindex\`; results in \`role="status"\` |
| Screen readers | Status messages describe each move or refusal; \`aria-grabbed\` / \`aria-dropeffect\` were deprecated in ARIA 1.1 ([W3C ISSUE-717](https://www.w3.org/WAI/ARIA/track/issues/717)), so they are not used |

## 7. Common Pitfalls

- **Reading \`dataTransfer.getData()\` in \`dragover\`.** It returns an empty string there; keep the dragged id in state or a ref.
- **Calling \`preventDefault()\` unconditionally in \`dragover\`.** Then every row, including invalid ones, accepts the drop.
- **Checking only \`dragId === targetId\`.** Dropping a folder into a grandchild still creates a cycle; walk the whole ancestor chain.
- **Guarding only in \`dragover\`.** Keyboard moves and other sources bypass it; guard in the move function.
- **Putting \`draggable\` and handlers on the nested \`li\`.** Child drags bubble to every ancestor; attach them to the row element that does not contain the children.
- **Making the row a \`<button>\`.** In Firefox \`dragstart\` does not fire on button elements; use a \`div\` row.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Data:</strong> <span style="color:#f0e2c8;">"I normalize the nested JSON into an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">id -&gt; node</code> map with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parentId</code> and ordered <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">childIds</code>, so a move is two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">childIds</code> edits and one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parentId</code> change, and children travel by reference."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The rule:</strong> <span style="color:#f0e2c8;">"Before any move I walk up from the new parent through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parentId</code>; if I meet the dragged id, it would be a cycle, so I refuse. I also refuse a name clash in the destination."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Drop zones:</strong> <span style="color:#f0e2c8;">"In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dragover</code> I measure the pointer against the row: top quarter before, bottom quarter after, middle inside for folders, halves for files. I call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preventDefault</code> only when the drop is valid."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Drag state:</strong> <span style="color:#f0e2c8;">"The dragged id lives in a ref, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getData</code> is empty during <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dragover</code>; I still <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setData</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dragstart</code> for Firefox, and I clear everything in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dragend</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Accessibility:</strong> <span style="color:#f0e2c8;">"Ctrl+X then Ctrl+V uses the same move function and guard, focus is a roving tabindex, every result is announced in a live region, and a Move-to menu would give pointer users a non-drag path."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support touch devices?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Native HTML5 drag-and-drop does not fire on most mobile browsers, so I would switch to pointer events: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pointerdown</code> with a small movement threshold, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setPointerCapture</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.elementFromPoint</code> to find the row under the finger, and the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">measure</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">moveNode</code> functions.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you expand a folder while hovering during a drag?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Start a 500 to 700 ms timer when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dragover</code> first targets a closed folder's middle zone, cancel it when the target changes or on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dragend</code>, and open the folder when it fires.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you persist moves?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Apply the move optimistically, send <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ id, newParentId, index }</code>, and on failure restore the previous map, which is cheap to keep because the move only replaced three nodes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test this with no DataTransfer in jsdom?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit-test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">moveNode</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dropPosition</code> and the guard directly. For the component, dispatch drag events with a fake <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dataTransfer</code> and a stubbed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getBoundingClientRect</code>, as the Verified section does, and run one real-browser test with Playwright for the actual drag.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you use a library?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For production, a library such as dnd-kit gives sensors for pointer, touch and keyboard, auto-scroll and announcements. I would still own the tree model and the cycle check, because they are domain rules.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Normalized state | Flat \`id -> node\` map with parent and child ids |
| Cycle prevention | Refusing to move a node under itself |
| dragover contract | \`preventDefault()\` in \`dragover\` marks a valid drop target |
| Protected mode | Drag data is unreadable during \`dragover\` |
| Drop zone | Before, inside or after, from the pointer position |
| Accessible drag alternative | A non-pointer way to perform the same move |

---

**Conclusion:** Nested drag-and-drop is a data problem first: normalize the tree so a move is three small edits, and guard it by walking up the parent chain so a folder can never land inside itself. The UI is then the \`dragover\` contract (measure, decide, \`preventDefault\` only when valid), a ref for the dragged id, cleanup on \`dragend\`, and a keyboard path through the same move function. For the related list-only version see the [Kanban board with drag and drop](/interview-question/build-a-kanban-board-with-drag-and-drop) and the [drag-and-drop reordering utility](/interview-question/implement-a-drag-and-drop-list-reordering-utility-without-a-library).`,
        files: {
          "/App.js": `import { useRef, useState } from "react";
import TreeRow from "./src/TreeRow";
import {
  ROOT,
  initialNodes,
  dropPosition,
  isSelfOrAncestor,
  moveNode,
  describeMove,
  visibleIds,
} from "./src/normalized";

export default function App() {
  const [nodes, setNodes] = useState(initialNodes);
  const [expanded, setExpanded] = useState(
    () => new Set(["src", "src/components", "docs"]),
  );
  const [dragId, setDragId] = useState(null); // for styling the dragged row
  const [dropTarget, setDropTarget] = useState(null); // { id, position, valid }
  const [cutId, setCutId] = useState(null); // keyboard move: Ctrl+X then Ctrl+V
  const [focusId, setFocusId] = useState(nodes[ROOT].childIds[0]);
  const [status, setStatus] = useState("");
  const treeRef = useRef(null);
  // During dragover the browser hides
  // dataTransfer data (protected mode), so the
  // id being dragged is kept here instead of read back from the event.
  const dragRef = useRef(null);

  function toggle(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function doMove(from, targetId, position) {
    const result = moveNode(nodes, from, targetId, position);
    if (result.error) {
      setStatus(result.error);
      return false;
    }
    if (result.nodes === nodes) return false;
    setNodes(result.nodes);
    if (position === "inside")
      setExpanded((prev) => new Set(prev).add(targetId));
    setStatus(describeMove(nodes, from, targetId, position));
    return true;
  }

  function measure(e, id) {
    const r = e.currentTarget.getBoundingClientRect();
    const position = dropPosition(nodes[id], (e.clientY - r.top) / r.height);
    const parentId = position === "inside" ? id : nodes[id].parentId;
    const valid =
      dragRef.current !== id &&
      !isSelfOrAncestor(nodes, dragRef.current, parentId);
    return { id, position, valid };
  }

  function onDragStart(e, id) {
    // Firefox will not start a drag without data
    e.dataTransfer.setData("text/plain", nodes[id].name);
    e.dataTransfer.effectAllowed = "move";
    dragRef.current = id;
    setDragId(id);
  }

  function onDragOver(e, id) {
    if (!dragRef.current) return;
    const t = measure(e, id);
    if (t.valid) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    } // preventDefault = "drop allowed here"
    setDropTarget((prev) =>
      prev &&
      prev.id === t.id &&
      prev.position === t.position &&
      prev.valid === t.valid
        ? prev
        : t,
    );
  }

  function onDrop(e, id) {
    e.preventDefault();
    if (dragRef.current) {
      const t = measure(e, id);
      doMove(dragRef.current, id, t.position);
    }
    onDragEnd();
  }

  function onDragEnd() {
    dragRef.current = null;
    setDragId(null);
    setDropTarget(null);
  }

  function focusRow(id) {
    setFocusId(id);
    treeRef.current.querySelector(\`[data-id="\${id}"]\`)?.focus();
  }

  function onKeyDown(e, id) {
    const ids = visibleIds(nodes, expanded);
    const i = ids.indexOf(id);
    const mod = e.ctrlKey || e.metaKey;
    if (e.key === "ArrowDown" && ids[i + 1]) focusRow(ids[i + 1]);
    else if (e.key === "ArrowUp" && ids[i - 1]) focusRow(ids[i - 1]);
    else if (e.key === "Enter" && nodes[id].type === "folder") toggle(id);
    else if (mod && e.key.toLowerCase() === "x") {
      setCutId(id);
      setStatus(
        "Cut " +
          nodes[id].name +
          ". Focus a folder and press Ctrl+V to move it there.",
      );
    } else if (mod && e.key.toLowerCase() === "v" && cutId) {
      const position = nodes[id].type === "folder" ? "inside" : "after";
      if (doMove(cutId, id, position)) setCutId(null);
    } else if (e.key === "Escape" && cutId) {
      setCutId(null);
      setStatus("Move cancelled");
    } else return;
    e.preventDefault();
  }

  const api = {
    nodes,
    expanded,
    dragId,
    dropTarget,
    cutId,
    focusId,
    setFocusId,
    toggle,
    onKeyDown,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
  };

  return (
    <div className="app">
      <h1>Files</h1>
      <p className="hint">
        Drag a row onto a folder to move it inside, or near a top or bottom edge
        to reorder. Keyboard: Ctrl+X, then Ctrl+V on a folder.
      </p>
      <ul role="tree" aria-label="Project files" className="tree" ref={treeRef}>
        {nodes[ROOT].childIds.map((id) => (
          <TreeRow key={id} id={id} depth={1} api={api} />
        ))}
      </ul>
      <p className="status" role="status" data-testid="status">
        {status}
      </p>
    </div>
  );
}
`,
          "/src/normalized.js": `// The tree is stored NORMALIZED: a flat
// map of id -> node, where each node knows
// its parentId and the ordered ids of its
// children. Moving a subtree is then two
// small edits (old parent, new parent) no matter how deep it sits.

const seed = [
  {
    name: "src",
    type: "folder",
    children: [
      {
        name: "components",
        type: "folder",
        children: [
          { name: "Button.jsx", type: "file" },
          { name: "Modal.jsx", type: "file" },
        ],
      },
      {
        name: "hooks",
        type: "folder",
        children: [{ name: "useTree.js", type: "file" }],
      },
      { name: "App.jsx", type: "file" },
    ],
  },
  {
    name: "docs",
    type: "folder",
    children: [
      { name: "guide.md", type: "file" },
      { name: "README.md", type: "file" },
    ],
  },
  { name: "README.md", type: "file" },
];

export const ROOT = "root";

// Nested JSON (what an API usually returns) ->
// normalized map. Ids are paths, so they are stable.
export function normalize(items) {
  const nodes = {
    [ROOT]: {
      id: ROOT,
      name: "Project",
      type: "folder",
      parentId: null,
      childIds: [],
    },
  };
  const walk = (list, parentId) =>
    list.forEach((item) => {
      const id = parentId === ROOT ? item.name : parentId + "/" + item.name;
      nodes[id] = {
        id,
        name: item.name,
        type: item.type,
        parentId,
        childIds: [],
      };
      nodes[parentId].childIds.push(id);
      if (item.children) walk(item.children, id);
    });
  walk(items, ROOT);
  return nodes;
}

export const initialNodes = normalize(seed);

// Is \`ancestorId\` the node itself or anywhere above \`id\`? Walks up, O(depth).
export function isSelfOrAncestor(nodes, ancestorId, id) {
  for (let cur = id; cur != null; cur = nodes[cur].parentId)
    if (cur === ancestorId) return true;
  return false;
}

// Where a drop would land: 'before' | 'after' | 'inside', from the pointer's
// position inside the row (0 = top edge, 1 = bottom edge).
export function dropPosition(node, ratio) {
  if (node.type === "folder")
    return ratio < 0.25 ? "before" : ratio > 0.75 ? "after" : "inside";
  return ratio < 0.5 ? "before" : "after";
}

// Returns { nodes } on success or { error } when the move is not allowed.
export function moveNode(nodes, dragId, targetId, position) {
  if (dragId === targetId) return { nodes }; // dropped on itself: nothing to do
  const drag = nodes[dragId];
  const parentId = position === "inside" ? targetId : nodes[targetId].parentId;
  const parent = nodes[parentId];
  if (isSelfOrAncestor(nodes, dragId, parentId)) {
    return {
      error:
        "Cannot move " + drag.name + " into itself or one of its subfolders",
    };
  }
  if (
    parent.childIds.some(
      (c) =>
        c !== dragId && nodes[c].name.toLowerCase() === drag.name.toLowerCase(),
    )
  ) {
    return {
      error:
        "A " +
        drag.type +
        " named " +
        drag.name +
        " already exists in " +
        parent.name,
    };
  }
  const next = { ...nodes };
  const oldParent = nodes[drag.parentId];
  next[oldParent.id] = {
    ...oldParent,
    childIds: oldParent.childIds.filter((c) => c !== dragId),
  };
  const kids = [...next[parentId].childIds];
  if (position === "inside") kids.push(dragId);
  else
    kids.splice(
      kids.indexOf(targetId) + (position === "after" ? 1 : 0),
      0,
      dragId,
    );
  next[parentId] = { ...next[parentId], childIds: kids };
  next[dragId] = { ...drag, parentId };
  return { nodes: next };
}

export function describeMove(nodes, dragId, targetId, position) {
  const what = nodes[dragId].name;
  if (position === "inside")
    return "Moved " + what + " into " + nodes[targetId].name;
  return "Moved " + what + " " + position + " " + nodes[targetId].name;
}

// Visible rows in order, for ArrowUp / ArrowDown.
export function visibleIds(nodes, expanded, id = ROOT, out = []) {
  for (const c of nodes[id].childIds) {
    out.push(c);
    if (nodes[c].type === "folder" && expanded.has(c))
      visibleIds(nodes, expanded, c, out);
  }
  return out;
}
`,
          "/src/TreeRow.js": `// Recursive row. The normalized map is looked up by id at every level, so a
// row only needs its id and depth; children come from node.childIds.
export default function TreeRow({ id, depth, api }) {
  const node = api.nodes[id];
  const isFolder = node.type === "folder";
  const open = isFolder && api.expanded.has(id);
  const drop = api.dropTarget?.id === id ? api.dropTarget : null;
  const cls = ["row"];
  if (api.dragId === id) cls.push("dragging");
  if (api.cutId === id) cls.push("cut");
  if (drop) cls.push(drop.valid ? "drop-" + drop.position : "drop-invalid");

  return (
    <li
      role="treeitem"
      aria-level={depth}
      aria-expanded={isFolder ? open : undefined}
      tabIndex={api.focusId === id ? 0 : -1}
      data-id={id}
      data-name={node.name}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget) api.onKeyDown(e, id);
      }}
      onFocus={(e) => {
        if (e.target === e.currentTarget) api.setFocusId(id);
      }}
    >
      <div
        className={cls.join(" ")}
        style={{ paddingLeft: 8 + (depth - 1) * 16 }}
        data-drop={drop ? (drop.valid ? drop.position : "invalid") : undefined}
        draggable="true"
        onClick={() => isFolder && api.toggle(id)}
        onDragStart={(e) => api.onDragStart(e, id)}
        onDragOver={(e) => api.onDragOver(e, id)}
        onDrop={(e) => api.onDrop(e, id)}
        onDragEnd={api.onDragEnd}
      >
        <span className="chevron" aria-hidden="true">
          {isFolder ? (open ? "▾" : "▸") : ""}
        </span>
        <span aria-hidden="true">{isFolder ? "📁" : "📄"}</span>
        <span className="name">{node.name}</span>
      </div>
      {open && node.childIds.length > 0 && (
        <ul role="group">
          {node.childIds.map((c) => (
            <TreeRow key={c} id={c} depth={depth + 1} api={api} />
          ))}
        </ul>
      )}
    </li>
  );
}
`,
          "/styles.css": `body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.app {
  max-width: 520px;
  margin: 0 auto;
  padding: 16px;
}
h1 {
  font-size: 18px;
  margin: 0 0 6px;
}
.hint {
  color: #9aa3b5;
  font-size: 13px;
  margin: 0 0 10px;
}
.tree,
.tree ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
.tree {
  background: #161a23;
  border: 1px solid #262c3b;
  border-radius: 8px;
  padding: 6px 0;
}
.row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 8px;
  cursor: grab;
  border-radius: 4px;
  user-select: none;
}
.row:hover {
  background: #1f2533;
}
.row.dragging,
.row.cut {
  opacity: 0.45;
}
.row.drop-inside {
  background: #263354;
  outline: 1px dashed #6ea8ff;
}
.row.drop-before::before,
.row.drop-after::after {
  content: "";
  position: absolute;
  left: 8px;
  right: 8px;
  height: 2px;
  background: #6ea8ff;
}
.row.drop-before::before {
  top: 0;
}
.row.drop-after::after {
  bottom: 0;
}
.row.drop-invalid {
  background: #3a1d22;
  cursor: no-drop;
}
[role="treeitem"]:focus {
  outline: none;
}
[role="treeitem"]:focus-visible > .row {
  outline: 2px solid #6ea8ff;
  outline-offset: -2px;
}
.chevron {
  width: 12px;
  color: #8a93a8;
}
.status {
  min-height: 1.2em;
  color: #9aa3b5;
  font-size: 13px;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Experienced Vue 3 developers who can build a recursive tree and need to add nested drag-and-drop.
**Difficulty:** Hard

> **How to read this doc:** Plain words first, then a <code>📌 Interview term:</code> tag. It assumes [the tree view question](/interview-question/build-a-file-explorer-tree-view). Snippets come from the runnable Vue solution; the Verified section quotes its output on Vue 3.5.44 and explains how drag events were simulated.

## 1. Why This Even Matters — A Story First

Rearranging nested envelopes: you can slide one in front of another, behind it, or into it, but you can never put an envelope into one that is already inside it. Code has no hands to notice, so the explorer must check that rule itself, or a folder ends up as its own grandchild and disappears from the tree.

## 2. Requirements and Plan

Normalized \`id -> node\` map with \`parentId\` and ordered \`childIds\`; before / inside / after drop zones; the descendant guard while hovering and on drop; a name-clash check; open the folder on an inside drop; Ctrl+X / Ctrl+V for keyboard users; status messages.

| Piece | Vue tool |
| :--- | :--- |
| \`nodes\` | \`reactive(createNodes())\`, moved by mutating two \`childIds\` arrays and one \`parentId\` |
| \`expanded\`, \`dragId\`, \`dropTarget\`, \`cutId\`, \`focusId\` | fields of one \`reactive\` state object, provided to every row |
| \`status\` | \`ref\` |
| \`TreeRow.vue\` | recursive, receives only \`id\` and \`depth\` |

📌 **Interview term: Normalized state** — each node stored once in a flat map keyed by id, children referenced by id. A move touches the old parent, the new parent and the node, whatever the subtree size.

## 3. Build It Step by Step

### Step 1: The guard and an in-place move

~~~js
export function isSelfOrAncestor(nodes, ancestorId, id) {
  for (let cur = id; cur != null; cur = nodes[cur].parentId)
    if (cur === ancestorId) return true;
  return false;
}

export function moveNode(nodes, dragId, targetId, position) {
  if (dragId === targetId) return "";
  const drag = nodes[dragId];
  const parentId =
    position === "inside" ? targetId : nodes[targetId].parentId;
  const parent = nodes[parentId];
  if (isSelfOrAncestor(nodes, dragId, parentId)) {
    return (
      "Cannot move " +
      drag.name +
      " into itself or one of its subfolders"
    );
  }
  if (
    parent.childIds.some(
      (c) =>
        c !== dragId &&
        nodes[c].name.toLowerCase() === drag.name.toLowerCase(),
    )
  ) {
    return (
      "A " +
      drag.type +
      " named " +
      drag.name +
      " already exists in " +
      parent.name
    );
  }
  const old = nodes[drag.parentId].childIds;
  old.splice(old.indexOf(dragId), 1);
  if (position === "inside") parent.childIds.push(dragId);
  else
    parent.childIds.splice(
      parent.childIds.indexOf(targetId) +
        (position === "after" ? 1 : 0),
      0,
      dragId,
    );
  drag.parentId = parentId;
  return "";
}
~~~

📌 **Interview term: Cycle prevention** — refusing a move whose new parent is the dragged node or one of its descendants. Walking up from the target through \`parentId\` costs O(depth). Because \`nodes\` is \`reactive\`, \`splice\`, \`push\` and the \`parentId\` assignment are tracked and the affected rows re-render.

### Step 2: \`@dragover\` without \`.prevent\`

📌 **Interview term: dragover and preventDefault** — only an element whose \`dragover\` handler calls \`preventDefault()\` accepts a drop. A \`@dragover.prevent\` modifier would accept every row, including invalid ones, so the call is made conditionally in code:

~~~js
function onDragOver(e, id) {
  if (!state.dragId) return;
  const t = measure(e, id);
  // Only a cancelled dragover marks a valid drop
  // zone, so this cannot be @dragover.prevent.
  if (t.valid) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }
  const d = state.dropTarget;
  if (
    !d ||
    d.id !== t.id ||
    d.position !== t.position ||
    d.valid !== t.valid
  )
    state.dropTarget = t;
}
~~~

\`@drop.prevent\` is fine, because a drop that reaches the handler is always handled. The dragged id is kept in \`state.dragId\`, since \`dataTransfer.getData()\` returns an empty string during \`dragover\` ([MDN](https://developer.mozilla.org/docs/Web/API/DataTransfer/getData)); \`setData\` is still called in \`dragstart\`, which Firefox has needed to start a drag ([Mozilla bug 1203810](https://bugzilla.mozilla.org/show_bug.cgi?id=1203810)).

### Step 3: Rows that only know an id

~~~vue
<div class="row" :class="rowClass" :style="{ paddingLeft: 8 + (depth - 1) * 16 + 'px' }"
  :data-drop="drop ? (drop.valid ? drop.position : 'invalid') : undefined"
  draggable="true"
  @click="isFolder && api.toggle(id)"
  @dragstart="api.onDragStart($event, id)"
  @dragover="api.onDragOver($event, id)"
  @drop.prevent="api.onDrop($event, id)"
  @dragend="api.onDragEnd()">
~~~

The handlers sit on the row \`div\`, not the \`li\`, so a drag that starts on a child does not bubble into its ancestors' handlers. \`TreeRow\` renders \`<TreeRow v-for="c in node.childIds" :key="c">\`; its file name makes the self-reference work.

### Step 4: Keyboard moves

Ctrl+X stores \`state.cutId\`, Ctrl+V on a folder moves inside and on a file moves after, both through the same \`doMove\`, so the guard and the name check apply. \`@keydown.self\` and \`@focus.self\` keep nested rows from reacting to their children's events.

## 4. Verified

jsdom 29.1.1 has no \`DataTransfer\` or \`DragEvent\` and no layout, so the shared driver dispatched \`MouseEvent\`s named \`dragstart\`, \`dragover\`, \`drop\` and \`dragend\` with a fake \`dataTransfer\` object, and stubbed \`getBoundingClientRect\` to 30 px rows at y = 0 (\`clientY\` 5 / 15 / 25 = top / middle / bottom). The component code is plain HTML5 drag-and-drop; real browser drag feedback was not exercised. Unedited output:

~~~text
[vue] RENDERED: FilesDrag a row onto a folder to move it inside, or near a top or bottom edge to reorder. Keyboard: Ctrl+X, then Ctrl+V on a folder.▾📁src▾📁components📄Button.jsx📄Modal.jsx▸📁hooks📄App.jsx▾📁docs📄guide.md📄README.md📄README.md
[vue] tree: v src  .v components  ..Button.jsx  ..Modal.jsx  .> hooks  .App.jsx  v docs  .guide.md  .README.md  README.md
[vue] Button.jsx -> middle of hooks: {"allowed":true,"indicator":"inside","dropEffect":"move","data":"Button.jsx"}
[vue]    Moved Button.jsx into hooks | v src  .v components  ..Modal.jsx  .v hooks  ..useTree.js  ..Button.jsx  .App.jsx  v docs  .guide.md  .README.md  README.md
[vue] README.md -> top edge of src: {"allowed":true,"indicator":"before","dropEffect":"move","data":"README.md"}
[vue]    Moved README.md before src | README.md  v src  .v components  ..Modal.jsx  .v hooks  ..useTree.js  ..Button.jsx  .App.jsx  v docs  .guide.md  .README.md
[vue] src -> inside its own child components: {"allowed":false,"indicator":"invalid","dropEffect":"none","data":"src"}
[vue]    Cannot move src into itself or one of its subfolders | dragging class cleared: true | indicator cleared: true
[vue] Modal.jsx -> bottom edge of App.jsx: {"allowed":true,"indicator":"after","dropEffect":"move","data":"Modal.jsx"}
[vue]    Moved Modal.jsx after App.jsx | README.md  v src  .v components  .v hooks  ..useTree.js  ..Button.jsx  .App.jsx  .Modal.jsx  v docs  .guide.md  .README.md
[vue] docs (with children) -> inside src: true | Moved docs into src
[vue]    README.md  v src  .v components  .v hooks  ..useTree.js  ..Button.jsx  .App.jsx  .Modal.jsx  .v docs  ..guide.md  ..README.md
[vue] docs/README.md -> before src (root already has README.md): true | A file named README.md already exists in Project
[vue] Ctrl+X on guide.md: Cut guide.md. Focus a folder and press Ctrl+V to move it there. | cut class: true
[vue] ArrowUp x2 -> focus: Modal.jsx
[vue] Ctrl+V on hooks: Moved guide.md into hooks
[vue]    README.md  v src  .v components  .v hooks  ..useTree.js  ..Button.jsx  ..guide.md  .App.jsx  .Modal.jsx  .v docs  ..README.md
[vue] Ctrl+X src, Ctrl+V on hooks: Cannot move src into itself or one of its subfolders
[vue] Escape: Move cancelled | tab stops: 1
~~~

Line for line the same as React and Angular: inside, before and after drops work, a folder moves with its subtree, \`src\` over its own child is refused while hovering and again on a forced drop, the root \`README.md\` clash is refused, and Ctrl+X / Ctrl+V move and refuse the same way. No \`console.error\`.

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Drop on itself | No-op |
| Into own descendant | Not accepted while hovering, refused on drop |
| Drop outside | \`@dragend\` clears state |
| Keyboard | Ctrl+X / Ctrl+V / Escape, Up/Down, roving tabindex |
| Pointer without dragging | Not built; WCAG 2.2 criterion 2.5.7 asks for one, for example a "Move to..." menu |

## 6. Common Pitfalls

- **\`@dragover.prevent\`.** Accepts drops everywhere; prevent only when valid.
- **Reading \`getData\` in \`dragover\`.** Always empty there; keep the id in state.
- **Handlers on the nested \`li\`.** One drag runs in every ancestor; use the row element.
- **Recomputing ids from paths after a move.** Ids must stay stable or every \`:key\` changes and rows remount.
- **Guarding only in the UI.** The keyboard path bypasses \`dragover\`; guard inside \`moveNode\`.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Data:</strong> <span style="color:#f0e2c8;">"I normalize the JSON into a reactive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">id -&gt; node</code> map with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parentId</code> and ordered <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">childIds</code>; a move is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">splice</code>, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code> and one assignment."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Guard:</strong> <span style="color:#f0e2c8;">"Before moving I walk up from the new parent; meeting the dragged id means a cycle, so I refuse. A name clash in the destination is refused too."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Zones:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dragover</code> measures the pointer in the row: quarters for folders, halves for files, and calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preventDefault</code> only if the drop is valid, so I cannot use the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.prevent</code> modifier there."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. State:</strong> <span style="color:#f0e2c8;">"The dragged id lives in reactive state because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getData</code> is empty during <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dragover</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dragend</code> clears the indicator even when the drop lands outside."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Keyboard:</strong> <span style="color:#f0e2c8;">"Ctrl+X and Ctrl+V reuse the same move function, results go to a live region, and a Move-to menu would add the single-pointer alternative WCAG 2.2 asks for."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not keep the nested tree and move with remove plus insert?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It works, but each move searches the tree twice and the descendant check needs a subtree search. With the flat map, lookups are O(1) and the guard is a walk up the parent chain.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would touch work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Native drag events do not fire on most mobile browsers, so I would use pointer events with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setPointerCapture</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.elementFromPoint</code>, then call the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dropPosition</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">moveNode</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you persist and undo?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Record <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ id, fromParent, fromIndex }</code> before the move, apply it, send it to the server, and replay the record in reverse on failure or on Ctrl+Z.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit-test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">moveNode</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isSelfOrAncestor</code>; for the component, dispatch drag events with a fake <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dataTransfer</code> and stubbed rects as above, plus one real-browser test.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Normalized state | Flat map of nodes with parent and child ids |
| Cycle prevention | Refusing to move a node under itself |
| dragover contract | \`preventDefault()\` marks a valid drop target |
| Drop zone | Before, inside or after, from the pointer position |

---

**Conclusion:** In Vue, nested drag-and-drop is a reactive normalized map you mutate in place, a walk up \`parentId\` to forbid cycles, and drag handlers that call \`preventDefault\` only when the drop is valid. Keep the dragged id in state, clean up on \`dragend\`, and route the keyboard path through the same \`moveNode\`.`,
        files: {
          "/src/App.vue": `<script setup>
import { provide, reactive, ref } from "vue";
import TreeRow from "./components/TreeRow.vue";
import {
  ROOT,
  createNodes,
  dropPosition,
  isSelfOrAncestor,
  moveNode,
  describeMove,
  visibleIds,
} from "./normalized.js";

const nodes = reactive(createNodes());
const state = reactive({
  nodes,
  expanded: new Set(["src", "src/components", "docs"]),
  // also read during dragover: the browser hides dataTransfer data then
  dragId: null,
  dropTarget: null, // { id, position, valid }
  cutId: null, // keyboard move: Ctrl+X then Ctrl+V
  focusId: nodes[ROOT].childIds[0],
  toggle,
  onKeyDown,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
});
const status = ref("");
const treeEl = ref(null);
provide("dnd", state);

function toggle(id) {
  if (state.expanded.has(id)) state.expanded.delete(id);
  else state.expanded.add(id);
}

function doMove(from, targetId, position) {
  if (from === targetId) return false;
  const message = describeMove(nodes, from, targetId, position);
  const error = moveNode(nodes, from, targetId, position);
  if (error) {
    status.value = error;
    return false;
  }
  if (position === "inside") state.expanded.add(targetId);
  status.value = message;
  return true;
}

function measure(e, id) {
  const r = e.currentTarget.getBoundingClientRect();
  const position = dropPosition(nodes[id], (e.clientY - r.top) / r.height);
  const parentId = position === "inside" ? id : nodes[id].parentId;
  const valid =
    state.dragId !== id && !isSelfOrAncestor(nodes, state.dragId, parentId);
  return { id, position, valid };
}

function onDragStart(e, id) {
  e.dataTransfer.setData("text/plain", nodes[id].name);
  e.dataTransfer.effectAllowed = "move";
  state.dragId = id;
}

function onDragOver(e, id) {
  if (!state.dragId) return;
  const t = measure(e, id);
  // Only a cancelled dragover marks a valid drop
  // zone, so this cannot be @dragover.prevent.
  if (t.valid) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }
  const d = state.dropTarget;
  if (!d || d.id !== t.id || d.position !== t.position || d.valid !== t.valid)
    state.dropTarget = t;
}

function onDrop(e, id) {
  if (state.dragId) doMove(state.dragId, id, measure(e, id).position);
  onDragEnd();
}

function onDragEnd() {
  state.dragId = null;
  state.dropTarget = null;
}

function focusRow(id) {
  state.focusId = id;
  treeEl.value.querySelector(\`[data-id="\${id}"]\`)?.focus();
}

function onKeyDown(e, id) {
  const ids = visibleIds(nodes, state.expanded);
  const i = ids.indexOf(id);
  const mod = e.ctrlKey || e.metaKey;
  if (e.key === "ArrowDown" && ids[i + 1]) focusRow(ids[i + 1]);
  else if (e.key === "ArrowUp" && ids[i - 1]) focusRow(ids[i - 1]);
  else if (e.key === "Enter" && nodes[id].type === "folder") toggle(id);
  else if (mod && e.key.toLowerCase() === "x") {
    state.cutId = id;
    status.value =
      "Cut " +
      nodes[id].name +
      ". Focus a folder and press Ctrl+V to move it there.";
  } else if (mod && e.key.toLowerCase() === "v" && state.cutId) {
    const position = nodes[id].type === "folder" ? "inside" : "after";
    if (doMove(state.cutId, id, position)) state.cutId = null;
  } else if (e.key === "Escape" && state.cutId) {
    state.cutId = null;
    status.value = "Move cancelled";
  } else return;
  e.preventDefault();
}
</script>

<template>
  <div class="app">
    <h1>Files</h1>
    <p class="hint">Drag a row onto a folder to move it inside, or near a top or bottom edge to reorder. Keyboard: Ctrl+X, then Ctrl+V on a folder.</p>
    <ul ref="treeEl" role="tree" aria-label="Project files" class="tree">
      <TreeRow
        v-for="id in nodes[ROOT].childIds"
        :key="id"
        :id="id"
        :depth="1"
      />
    </ul>
    <p class="status" role="status" data-testid="status">{{ status }}</p>
  </div>
</template>

<style>
body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.app {
  max-width: 520px;
  margin: 0 auto;
  padding: 16px;
}
h1 {
  font-size: 18px;
  margin: 0 0 6px;
}
.hint {
  color: #9aa3b5;
  font-size: 13px;
  margin: 0 0 10px;
}
.tree,
.tree ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
.tree {
  background: #161a23;
  border: 1px solid #262c3b;
  border-radius: 8px;
  padding: 6px 0;
}
.row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 8px;
  cursor: grab;
  border-radius: 4px;
  user-select: none;
}
.row:hover {
  background: #1f2533;
}
.row.dragging,
.row.cut {
  opacity: 0.45;
}
.row.drop-inside {
  background: #263354;
  outline: 1px dashed #6ea8ff;
}
.row.drop-before::before,
.row.drop-after::after {
  content: "";
  position: absolute;
  left: 8px;
  right: 8px;
  height: 2px;
  background: #6ea8ff;
}
.row.drop-before::before {
  top: 0;
}
.row.drop-after::after {
  bottom: 0;
}
.row.drop-invalid {
  background: #3a1d22;
  cursor: no-drop;
}
[role="treeitem"]:focus {
  outline: none;
}
[role="treeitem"]:focus-visible > .row {
  outline: 2px solid #6ea8ff;
  outline-offset: -2px;
}
.chevron {
  width: 12px;
  color: #8a93a8;
}
.status {
  min-height: 1.2em;
  color: #9aa3b5;
  font-size: 13px;
}
</style>
`,
          "/src/components/TreeRow.vue": `<script setup>
import { computed, inject } from "vue";

const props = defineProps({
  id: { type: String, required: true },
  depth: { type: Number, default: 1 },
});
const api = inject("dnd");

const node = computed(() => api.nodes[props.id]);
const isFolder = computed(() => node.value.type === "folder");
const open = computed(() => isFolder.value && api.expanded.has(props.id));
const drop = computed(() =>
  api.dropTarget?.id === props.id ? api.dropTarget : null,
);
const rowClass = computed(() => ({
  dragging: api.dragId === props.id,
  cut: api.cutId === props.id,
  ["drop-" +
  (drop.value ? (drop.value.valid ? drop.value.position : "invalid") : "none")]:
    !!drop.value,
}));
</script>

<template>
  <li role="treeitem" :aria-level="depth" :aria-expanded="isFolder ? String(open) : undefined"
    :tabindex="api.focusId === id ? 0 : -1" :data-id="id" :data-name="node.name"
    @keydown.self="api.onKeyDown($event, id)" @focus.self="api.focusId = id">
    <div class="row" :class="rowClass" :style="{ paddingLeft: 8 + (depth - 1) * 16 + 'px' }"
      :data-drop="drop ? (drop.valid ? drop.position : 'invalid') : undefined"
      draggable="true"
      @click="isFolder && api.toggle(id)"
      @dragstart="api.onDragStart($event, id)"
      @dragover="api.onDragOver($event, id)"
      @drop.prevent="api.onDrop($event, id)"
      @dragend="api.onDragEnd()">
      <span
        class="chevron"
        aria-hidden="true"
      >{{ isFolder ? (open ? '▾' : '▸') : '' }}</span>
      <span aria-hidden="true">{{ isFolder ? '📁' : '📄' }}</span>
      <span class="name">{{ node.name }}</span>
    </div>
    <ul v-if="open && node.childIds.length" role="group">
      <TreeRow v-for="c in node.childIds" :key="c" :id="c" :depth="depth + 1" />
    </ul>
  </li>
</template>
`,
          "/src/normalized.js": `// The tree is stored NORMALIZED: a flat
// map of id -> node, where each node knows
// its parentId and the ordered ids of its
// children. Moving a subtree is then two
// small edits (old parent, new parent) no matter how deep it sits. In Vue the
// map lives in reactive(), so those edits are plain mutations.

const seed = [
  {
    name: "src",
    type: "folder",
    children: [
      {
        name: "components",
        type: "folder",
        children: [
          { name: "Button.jsx", type: "file" },
          { name: "Modal.jsx", type: "file" },
        ],
      },
      {
        name: "hooks",
        type: "folder",
        children: [{ name: "useTree.js", type: "file" }],
      },
      { name: "App.jsx", type: "file" },
    ],
  },
  {
    name: "docs",
    type: "folder",
    children: [
      { name: "guide.md", type: "file" },
      { name: "README.md", type: "file" },
    ],
  },
  { name: "README.md", type: "file" },
];

export const ROOT = "root";

// Nested JSON (what an API usually returns) ->
// normalized map. Ids are paths, so they are stable.
export function normalize(items) {
  const nodes = {
    [ROOT]: {
      id: ROOT,
      name: "Project",
      type: "folder",
      parentId: null,
      childIds: [],
    },
  };
  const walk = (list, parentId) =>
    list.forEach((item) => {
      const id = parentId === ROOT ? item.name : parentId + "/" + item.name;
      nodes[id] = {
        id,
        name: item.name,
        type: item.type,
        parentId,
        childIds: [],
      };
      nodes[parentId].childIds.push(id);
      if (item.children) walk(item.children, id);
    });
  walk(items, ROOT);
  return nodes;
}

export const createNodes = () => normalize(seed);

// Is \`ancestorId\` the node itself or anywhere above \`id\`? Walks up, O(depth).
export function isSelfOrAncestor(nodes, ancestorId, id) {
  for (let cur = id; cur != null; cur = nodes[cur].parentId)
    if (cur === ancestorId) return true;
  return false;
}

// Where a drop would land: 'before' | 'after' | 'inside', from the pointer's
// position inside the row (0 = top edge, 1 = bottom edge).
export function dropPosition(node, ratio) {
  if (node.type === "folder")
    return ratio < 0.25 ? "before" : ratio > 0.75 ? "after" : "inside";
  return ratio < 0.5 ? "before" : "after";
}

// Checks the rules, then edits the reactive map IN PLACE: two childIds arrays
// and one parentId. Returns an error string, or '' when the move happened.
export function moveNode(nodes, dragId, targetId, position) {
  if (dragId === targetId) return "";
  const drag = nodes[dragId];
  const parentId = position === "inside" ? targetId : nodes[targetId].parentId;
  const parent = nodes[parentId];
  if (isSelfOrAncestor(nodes, dragId, parentId)) {
    return "Cannot move " + drag.name + " into itself or one of its subfolders";
  }
  if (
    parent.childIds.some(
      (c) =>
        c !== dragId && nodes[c].name.toLowerCase() === drag.name.toLowerCase(),
    )
  ) {
    return (
      "A " +
      drag.type +
      " named " +
      drag.name +
      " already exists in " +
      parent.name
    );
  }
  const old = nodes[drag.parentId].childIds;
  old.splice(old.indexOf(dragId), 1);
  if (position === "inside") parent.childIds.push(dragId);
  else
    parent.childIds.splice(
      parent.childIds.indexOf(targetId) + (position === "after" ? 1 : 0),
      0,
      dragId,
    );
  drag.parentId = parentId;
  return "";
}

export function describeMove(nodes, dragId, targetId, position) {
  const what = nodes[dragId].name;
  if (position === "inside")
    return "Moved " + what + " into " + nodes[targetId].name;
  return "Moved " + what + " " + position + " " + nodes[targetId].name;
}

// Visible rows in order, for ArrowUp / ArrowDown.
export function visibleIds(nodes, expanded, id = ROOT, out = []) {
  for (const c of nodes[id].childIds) {
    out.push(c);
    if (nodes[c].type === "folder" && expanded.has(c))
      visibleIds(nodes, expanded, c, out);
  }
  return out;
}
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Experienced Angular developers who can build a recursive signal-based tree and need nested drag-and-drop.
**Difficulty:** Hard

> **How to read this doc:** Plain words first, then a <code>📌 Interview term:</code> tag. It assumes [the tree view question](/interview-question/build-a-file-explorer-tree-view). Snippets come from the runnable Angular solution, verified on Angular 22.2.3 in AOT and in the playground JIT; the Verified section explains how drag events were simulated.

## 1. Why This Even Matters — A Story First

Rearranging nested envelopes, you can put one before, after or into another, but never into one that is already inside it. The explorer has to enforce that rule itself, or a folder becomes its own ancestor and vanishes. Everything else is choosing where a drop lands and applying it cheaply.

## 2. Requirements and Plan

Normalized map, before / inside / after zones, the descendant guard while hovering and on drop, a name-clash check, open folder on inside drop, Ctrl+X / Ctrl+V, live status.

| Piece | Angular tool |
| :--- | :--- |
| \`nodes\` | \`signal<NodeMap>\`, replaced by a copy that changes at most three nodes |
| \`expanded\`, \`dragId\`, \`dropTarget\`, \`cutId\`, \`focusId\`, \`status\` | signals in \`DndTree\`, provided on \`AppComponent\` |
| \`TreeRowComponent\` | \`li[app-tree-row]\`, recursive, \`@Input() id\` and \`depth\` |

📌 **Interview term: Normalized state** — one flat record of nodes keyed by id, with \`parentId\` and ordered \`childIds\`. With signals it also keeps updates cheap: a move creates a new map object but reuses every untouched node.

## 3. Build It Step by Step

### Step 1: Guard and copy-on-write move

~~~ts
export function isSelfOrAncestor(
  nodes: NodeMap,
  ancestorId: string,
  id: string,
): boolean {
  for (
    let cur: string | null = id;
    cur != null;
    cur = nodes[cur].parentId
  )
    if (cur === ancestorId) return true;
  return false;
}
~~~

📌 **Interview term: Cycle prevention** — refusing a move whose new parent is the dragged node or under it. \`moveNode\` returns \`{ error }\` or \`{ nodes }\`, where the new map replaces only the old parent, the new parent and the dragged node; the service then calls \`nodes.set(result.nodes)\`.

### Step 2: The dragover contract in a service

~~~ts
onDragOver(e: DragEvent, id: string) {
  if (!this.dragId()) return;
  const t = this.measure(e, id);
  if (t.valid) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  }
  const d = this.dropTarget();
  if (
    !d ||
    d.id !== t.id ||
    d.position !== t.position ||
    d.valid !== t.valid
  )
    this.dropTarget.set(t);
}
~~~

📌 **Interview term: dragover and preventDefault** — only a cancelled \`dragover\` marks a valid drop target, so the call depends on the guard. \`dataTransfer\` is typed as possibly \`null\` in the DOM typings, which strict mode makes you handle (\`e.dataTransfer?.setData\`). The dragged id is a signal because \`getData()\` is empty during \`dragover\` ([MDN](https://developer.mozilla.org/docs/Web/API/DataTransfer/getData)); \`setData\` in \`dragstart\` is still needed for Firefox ([Mozilla bug 1203810](https://bugzilla.mozilla.org/show_bug.cgi?id=1203810)).

### Step 3: The row template

~~~ts
<div
  class="row"
  [class]="rowClass"
  [style.padding-left.px]="8 + (depth - 1) * 16"
  [attr.data-drop]="dropLabel"
  draggable="true"
  (click)="isFolder && tree.toggle(id)"
  (dragstart)="tree.onDragStart($event, id)"
  (dragover)="tree.onDragOver($event, id)"
  (drop)="tree.onDrop($event, id)"
  (dragend)="tree.onDragEnd()"
></div>
~~~

Event bindings such as \`(dragover)\` pass the native \`DragEvent\`. Handlers live on the row \`div\`, which does not contain the children, so nested drags do not bubble into ancestor handlers. The component lists itself in \`imports\` with \`forwardRef\`, which the playground JIT needs for recursion.

### Step 4: Keyboard moves

\`onKeyDown\` in the service handles Up/Down focus, Ctrl+X (\`cutId.set(id)\`), Ctrl+V (inside a folder or after a file, through the same \`doMove\`) and Escape. The host listens with \`'(keydown)': 'onKey($event)'\` and a target check.

## 4. Verified

jsdom 29.1.1 has no \`DataTransfer\` or \`DragEvent\` and no layout. The shared driver dispatched \`MouseEvent\`s named \`dragstart\`, \`dragover\`, \`drop\`, \`dragend\` with a fake \`dataTransfer\`, and stubbed \`getBoundingClientRect\` to 30 px rows at y = 0. Both the AOT run and the JIT run printed the same lines; JIT shown, unedited:

~~~text
[angular:playground] RENDERED: FilesDrag a row onto a folder to move it inside, or near a top or bottom edge to reorder. Keyboard: Ctrl+X, then Ctrl+V on a folder.▾📁src▾📁components📄Button.jsx📄Modal.jsx▸📁hooks📄App.jsx▾📁docs📄guide.md📄README.md📄README.md
[angular:playground] tree: v src  .v components  ..Button.jsx  ..Modal.jsx  .> hooks  .App.jsx  v docs  .guide.md  .README.md  README.md
[angular:playground] Button.jsx -> middle of hooks: {"allowed":true,"indicator":"inside","dropEffect":"move","data":"Button.jsx"}
[angular:playground]    Moved Button.jsx into hooks | v src  .v components  ..Modal.jsx  .v hooks  ..useTree.js  ..Button.jsx  .App.jsx  v docs  .guide.md  .README.md  README.md
[angular:playground] README.md -> top edge of src: {"allowed":true,"indicator":"before","dropEffect":"move","data":"README.md"}
[angular:playground]    Moved README.md before src | README.md  v src  .v components  ..Modal.jsx  .v hooks  ..useTree.js  ..Button.jsx  .App.jsx  v docs  .guide.md  .README.md
[angular:playground] src -> inside its own child components: {"allowed":false,"indicator":"invalid","dropEffect":"none","data":"src"}
[angular:playground]    Cannot move src into itself or one of its subfolders | dragging class cleared: true | indicator cleared: true
[angular:playground] Modal.jsx -> bottom edge of App.jsx: {"allowed":true,"indicator":"after","dropEffect":"move","data":"Modal.jsx"}
[angular:playground]    Moved Modal.jsx after App.jsx | README.md  v src  .v components  .v hooks  ..useTree.js  ..Button.jsx  .App.jsx  .Modal.jsx  v docs  .guide.md  .README.md
[angular:playground] docs (with children) -> inside src: true | Moved docs into src
[angular:playground]    README.md  v src  .v components  .v hooks  ..useTree.js  ..Button.jsx  .App.jsx  .Modal.jsx  .v docs  ..guide.md  ..README.md
[angular:playground] docs/README.md -> before src (root already has README.md): true | A file named README.md already exists in Project
[angular:playground] Ctrl+X on guide.md: Cut guide.md. Focus a folder and press Ctrl+V to move it there. | cut class: true
[angular:playground] ArrowUp x2 -> focus: Modal.jsx
[angular:playground] Ctrl+V on hooks: Moved guide.md into hooks
[angular:playground]    README.md  v src  .v components  .v hooks  ..useTree.js  ..Button.jsx  ..guide.md  .App.jsx  .Modal.jsx  .v docs  ..README.md
[angular:playground] Ctrl+X src, Ctrl+V on hooks: Cannot move src into itself or one of its subfolders
[angular:playground] Escape: Move cancelled | tab stops: 1
~~~

Identical to React and Vue: inside, before and after drops, a folder moving with its subtree, the self-descendant drop refused while hovering and on a forced drop, the name clash refused, and the keyboard cut and paste. No \`console.error\` in either mode. Real browser drag feedback was not exercised.

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Drop on itself | No-op, same map returned |
| Into own descendant | Not accepted, refused on drop |
| Drop outside | \`(dragend)\` clears signals |
| Keyboard | Ctrl+X / Ctrl+V / Escape, Up/Down, roving tabindex via host binding |
| Pointer without dragging | Not built; WCAG 2.2 criterion 2.5.7 asks for one (a "Move to..." menu) |

## 6. Common Pitfalls

- **Mutating \`nodes()[id].childIds\`.** The signal reference does not change, so nothing re-renders; copy the touched nodes.
- **Unconditional \`preventDefault()\` in \`(dragover)\`.** Every row accepts drops.
- **Assuming \`e.dataTransfer\` exists.** It is nullable in the typings; strict templates and strict mode surface it.
- **Recursion without a self-import.** The playground JIT fails with \`NG0303\`.
- **Guarding only in \`dragover\`.** The keyboard path bypasses it; guard in \`moveNode\`.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Data:</strong> <span style="color:#f0e2c8;">"The tree is a normalized signal of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">id -&gt; node</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parentId</code> and ordered <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">childIds</code>; a move returns a new map that replaces only three nodes."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Guard:</strong> <span style="color:#f0e2c8;">"I walk up from the new parent; if I meet the dragged id I refuse, and I also refuse a name clash in the destination."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Zones:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(dragover)</code> measures the pointer: quarters for folders, halves for files, and calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preventDefault</code> only for a valid drop."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. State:</strong> <span style="color:#f0e2c8;">"The dragged id is a signal because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getData</code> is empty during <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dragover</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(dragend)</code> resets the drag and indicator signals."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Keyboard:</strong> <span style="color:#f0e2c8;">"Ctrl+X and Ctrl+V go through the same move, with a live status, and I would add a Move-to menu for the single-pointer alternative."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you use the CDK drag-drop module?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For flat and connected lists, yes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cdkDropList</code> handles sorting, previews and touch. A nested tree needs extra wiring (a connected drop list per open folder), and the cycle rule is still mine to write, so I would keep this model either way.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add hover-to-expand?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onDragOver</code>, when the target is a closed folder's middle zone, start a timer stored in the service; clear it when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dropTarget</code> changes or on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dragend</code>, and open the folder when it fires.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you persist moves?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the previous map (it is cheap, the move reused almost everything), send the move to the server, and set the old map back if the request fails.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit-test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">moveNode</code>; in TestBed dispatch drag events with a fake <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dataTransfer</code> and stubbed rects, then assert the rendered order; keep one Playwright test for a real drag.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Normalized state | Flat map of nodes with parent and child ids |
| Cycle prevention | Refusing to move a node under itself |
| dragover contract | \`preventDefault()\` marks a valid drop target |
| Copy-on-write | New map, untouched nodes reused |

---

**Conclusion:** Angular nested drag-and-drop is a normalized map in a signal, a parent-chain walk that forbids cycles, \`(dragover)\` that cancels only valid drops, and a service that owns drag state, keyboard moves and status. Copy only the nodes you touch so the signal changes, and keep the self-import for recursion.`,
        files: {
          "/src/app/app.component.ts": `import { Component, ViewEncapsulation, inject } from "@angular/core";
import { DndTree } from "./dnd-tree";
import { TreeRowComponent } from "./tree-row.component";
import { ROOT } from "./normalized";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [TreeRowComponent],
  providers: [DndTree],
  encapsulation: ViewEncapsulation.None,
  template: \`
    <div class="app">
      <h1>Files</h1>
      <p class="hint">Drag a row onto a folder to move it inside, or near a top or bottom edge to reorder. Keyboard: Ctrl+X, then Ctrl+V on a folder.</p>
      <ul role="tree" aria-label="Project files" class="tree">
        @for (id of tree.nodes()[root].childIds; track id) {
          <li app-tree-row [id]="id" [depth]="1"></li>
        }
      </ul>
      <p
        class="status"
        role="status"
        data-testid="status"
      >{{ tree.status() }}</p>
    </div>
  \`,
  styles: [
    \`
    body { margin: 0; background: #0f1115; color: #e6e6e6; font-family: system-ui, sans-serif; }
    .app { max-width: 520px; margin: 0 auto; padding: 16px; }
    h1 { font-size: 18px; margin: 0 0 6px; }
    .hint { color: #9aa3b5; font-size: 13px; margin: 0 0 10px; }
    .tree, .tree ul { list-style: none; margin: 0; padding: 0; }
    .tree { background: #161a23; border: 1px solid #262c3b; border-radius: 8px; padding: 6px 0; }
    .row { position: relative; display: flex; align-items: center; gap: 6px; height: 30px; padding: 0 8px; cursor: grab; border-radius: 4px; user-select: none; }
    .row:hover { background: #1f2533; }
    .row.dragging, .row.cut { opacity: 0.45; }
    .row.drop-inside { background: #263354; outline: 1px dashed #6ea8ff; }
    .row.drop-before::before, .row.drop-after::after { content: ""; position: absolute; left: 8px; right: 8px; height: 2px; background: #6ea8ff; }
    .row.drop-before::before { top: 0; }
    .row.drop-after::after { bottom: 0; }
    .row.drop-invalid { background: #3a1d22; cursor: no-drop; }
    [role="treeitem"]:focus { outline: none; }
    [role="treeitem"]:focus-visible > .row { outline: 2px solid #6ea8ff; outline-offset: -2px; }
    .chevron { width: 12px; color: #8a93a8; }
    .status { min-height: 1.2em; color: #9aa3b5; font-size: 13px; }
  \`,
  ],
})
export class AppComponent {
  tree = inject(DndTree);
  root = ROOT;
}
`,
          "/src/app/dnd-tree.ts": `import { ElementRef, Injectable, inject, signal } from "@angular/core";
import {
  NodeMap,
  Position,
  ROOT,
  initialNodes,
  dropPosition,
  isSelfOrAncestor,
  moveNode,
  describeMove,
  visibleIds,
} from "./normalized";

export interface DropTarget {
  id: string;
  position: Position;
  valid: boolean;
}

@Injectable()
export class DndTree {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly nodes = signal<NodeMap>(initialNodes);
  readonly expanded = signal<ReadonlySet<string>>(
    new Set(["src", "src/components", "docs"]),
  );
  // kept here: dataTransfer data is hidden during dragover
  readonly dragId = signal<string | null>(null);
  readonly dropTarget = signal<DropTarget | null>(null);
  readonly cutId = signal<string | null>(null);
  readonly focusId = signal<string>(initialNodes[ROOT].childIds[0]);
  readonly status = signal("");

  toggle(id: string) {
    this.expanded.update((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  private doMove(from: string, targetId: string, position: Position): boolean {
    const before = this.nodes();
    const result = moveNode(before, from, targetId, position);
    if (result.error) {
      this.status.set(result.error);
      return false;
    }
    if (!result.nodes || result.nodes === before) return false;
    this.nodes.set(result.nodes);
    if (position === "inside")
      this.expanded.update((prev) => new Set(prev).add(targetId));
    this.status.set(describeMove(before, from, targetId, position));
    return true;
  }

  private measure(e: DragEvent, id: string): DropTarget {
    const nodes = this.nodes();
    const drag = this.dragId()!;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const position = dropPosition(nodes[id], (e.clientY - r.top) / r.height);
    const parentId = position === "inside" ? id : nodes[id].parentId!;
    return {
      id,
      position,
      valid: drag !== id && !isSelfOrAncestor(nodes, drag, parentId),
    };
  }

  onDragStart(e: DragEvent, id: string) {
    e.dataTransfer?.setData("text/plain", this.nodes()[id].name);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    this.dragId.set(id);
  }

  onDragOver(e: DragEvent, id: string) {
    if (!this.dragId()) return;
    const t = this.measure(e, id);
    if (t.valid) {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    }
    const d = this.dropTarget();
    if (!d || d.id !== t.id || d.position !== t.position || d.valid !== t.valid)
      this.dropTarget.set(t);
  }

  onDrop(e: DragEvent, id: string) {
    e.preventDefault();
    const drag = this.dragId();
    if (drag) this.doMove(drag, id, this.measure(e, id).position);
    this.onDragEnd();
  }

  onDragEnd() {
    this.dragId.set(null);
    this.dropTarget.set(null);
  }

  private focusRow(id: string) {
    this.focusId.set(id);
    this.host.nativeElement
      .querySelector<HTMLElement>(\`[data-id="\${id}"]\`)
      ?.focus();
  }

  onKeyDown(e: KeyboardEvent, id: string) {
    const nodes = this.nodes();
    const ids = visibleIds(nodes, this.expanded());
    const i = ids.indexOf(id);
    const mod = e.ctrlKey || e.metaKey;
    const cut = this.cutId();
    if (e.key === "ArrowDown" && ids[i + 1]) this.focusRow(ids[i + 1]);
    else if (e.key === "ArrowUp" && ids[i - 1]) this.focusRow(ids[i - 1]);
    else if (e.key === "Enter" && nodes[id].type === "folder") this.toggle(id);
    else if (mod && e.key.toLowerCase() === "x") {
      this.cutId.set(id);
      this.status.set(
        "Cut " +
          nodes[id].name +
          ". Focus a folder and press Ctrl+V to move it there.",
      );
    } else if (mod && e.key.toLowerCase() === "v" && cut) {
      const position: Position =
        nodes[id].type === "folder" ? "inside" : "after";
      if (this.doMove(cut, id, position)) this.cutId.set(null);
    } else if (e.key === "Escape" && cut) {
      this.cutId.set(null);
      this.status.set("Move cancelled");
    } else return;
    e.preventDefault();
  }
}
`,
          "/src/app/normalized.ts": `// The tree is stored NORMALIZED: a flat
// map of id -> node, where each node knows
// its parentId and the ordered ids of its
// children. Moving a subtree is then two
// small edits (old parent, new parent) no matter how deep it sits. Signals need
// new references, so a move copies the map
// and the (at most three) nodes it touches.

export interface FsNode {
  id: string;
  name: string;
  type: "folder" | "file";
  parentId: string | null;
  childIds: string[];
}
export type NodeMap = Record<string, FsNode>;
export type Position = "before" | "after" | "inside";
interface SeedItem {
  name: string;
  type: "folder" | "file";
  children?: SeedItem[];
}

const seed: SeedItem[] = [
  {
    name: "src",
    type: "folder",
    children: [
      {
        name: "components",
        type: "folder",
        children: [
          { name: "Button.jsx", type: "file" },
          { name: "Modal.jsx", type: "file" },
        ],
      },
      {
        name: "hooks",
        type: "folder",
        children: [{ name: "useTree.js", type: "file" }],
      },
      { name: "App.jsx", type: "file" },
    ],
  },
  {
    name: "docs",
    type: "folder",
    children: [
      { name: "guide.md", type: "file" },
      { name: "README.md", type: "file" },
    ],
  },
  { name: "README.md", type: "file" },
];

export const ROOT = "root";

// Nested JSON (what an API usually returns) ->
// normalized map. Ids are paths, so they are stable.
export function normalize(items: SeedItem[]): NodeMap {
  const nodes: NodeMap = {
    [ROOT]: {
      id: ROOT,
      name: "Project",
      type: "folder",
      parentId: null,
      childIds: [],
    },
  };
  const walk = (list: SeedItem[], parentId: string): void =>
    list.forEach((item) => {
      const id = parentId === ROOT ? item.name : parentId + "/" + item.name;
      nodes[id] = {
        id,
        name: item.name,
        type: item.type,
        parentId,
        childIds: [],
      };
      nodes[parentId].childIds.push(id);
      if (item.children) walk(item.children, id);
    });
  walk(items, ROOT);
  return nodes;
}

export const initialNodes = normalize(seed);

// Is \`ancestorId\` the node itself or anywhere above \`id\`? Walks up, O(depth).
export function isSelfOrAncestor(
  nodes: NodeMap,
  ancestorId: string,
  id: string,
): boolean {
  for (let cur: string | null = id; cur != null; cur = nodes[cur].parentId)
    if (cur === ancestorId) return true;
  return false;
}

// Where a drop would land: 'before' | 'after' | 'inside', from the pointer's
// position inside the row (0 = top edge, 1 = bottom edge).
export function dropPosition(node: FsNode, ratio: number): Position {
  if (node.type === "folder")
    return ratio < 0.25 ? "before" : ratio > 0.75 ? "after" : "inside";
  return ratio < 0.5 ? "before" : "after";
}

// Returns { nodes } on success or { error } when the move is not allowed.
export function moveNode(
  nodes: NodeMap,
  dragId: string,
  targetId: string,
  position: Position,
): { nodes?: NodeMap; error?: string } {
  if (dragId === targetId) return { nodes }; // dropped on itself: nothing to do
  const drag = nodes[dragId];
  const parentId = position === "inside" ? targetId : nodes[targetId].parentId!;
  const parent = nodes[parentId];
  if (isSelfOrAncestor(nodes, dragId, parentId)) {
    return {
      error:
        "Cannot move " + drag.name + " into itself or one of its subfolders",
    };
  }
  if (
    parent.childIds.some(
      (c) =>
        c !== dragId && nodes[c].name.toLowerCase() === drag.name.toLowerCase(),
    )
  ) {
    return {
      error:
        "A " +
        drag.type +
        " named " +
        drag.name +
        " already exists in " +
        parent.name,
    };
  }
  const next = { ...nodes };
  const oldParent = nodes[drag.parentId!];
  next[oldParent.id] = {
    ...oldParent,
    childIds: oldParent.childIds.filter((c) => c !== dragId),
  };
  const kids = [...next[parentId].childIds];
  if (position === "inside") kids.push(dragId);
  else
    kids.splice(
      kids.indexOf(targetId) + (position === "after" ? 1 : 0),
      0,
      dragId,
    );
  next[parentId] = { ...next[parentId], childIds: kids };
  next[dragId] = { ...drag, parentId };
  return { nodes: next };
}

export function describeMove(
  nodes: NodeMap,
  dragId: string,
  targetId: string,
  position: Position,
): string {
  const what = nodes[dragId].name;
  if (position === "inside")
    return "Moved " + what + " into " + nodes[targetId].name;
  return "Moved " + what + " " + position + " " + nodes[targetId].name;
}

// Visible rows in order, for ArrowUp / ArrowDown.
export function visibleIds(
  nodes: NodeMap,
  expanded: ReadonlySet<string>,
  id = ROOT,
  out: string[] = [],
): string[] {
  for (const c of nodes[id].childIds) {
    out.push(c);
    if (nodes[c].type === "folder" && expanded.has(c))
      visibleIds(nodes, expanded, c, out);
  }
  return out;
}
`,
          "/src/app/tree-row.component.ts": `import { Component, Input, forwardRef, inject } from "@angular/core";
import { DndTree } from "./dnd-tree";

@Component({
  selector: "li[app-tree-row]",
  standalone: true,
  // recursive: lists itself (see the JIT note)
  imports: [forwardRef(() => TreeRowComponent)],
  host: {
    role: "treeitem",
    "[attr.aria-level]": "depth",
    "[attr.aria-expanded]": "isFolder ? open : null",
    "[attr.tabindex]": "tree.focusId() === id ? 0 : -1",
    "[attr.data-id]": "id",
    "[attr.data-name]": "node.name",
    "(keydown)": "onKey($event)",
    "(focus)": "onFocus($event)",
  },
  template: \`
    <div
      class="row"
      [class]="rowClass"
      [style.padding-left.px]="8 + (depth - 1) * 16"
      [attr.data-drop]="dropLabel"
      draggable="true"
      (click)="isFolder && tree.toggle(id)"
      (dragstart)="tree.onDragStart($event, id)"
      (dragover)="tree.onDragOver($event, id)"
      (drop)="tree.onDrop($event, id)"
      (dragend)="tree.onDragEnd()"
    >
      <span class="chevron" aria-hidden="true">{{
        isFolder ? (open ? "▾" : "▸") : ""
      }}</span>
      <span aria-hidden="true">{{ isFolder ? "📁" : "📄" }}</span>
      <span class="name">{{ node.name }}</span>
    </div>
    @if (open && node.childIds.length) {
      <ul role="group">
        @for (c of node.childIds; track c) {
          <li app-tree-row [id]="c" [depth]="depth + 1"></li>
        }
      </ul>
    }
  \`,
})
export class TreeRowComponent {
  @Input({ required: true }) id!: string;
  @Input() depth = 1;
  tree = inject(DndTree);

  get node() {
    return this.tree.nodes()[this.id];
  }
  get isFolder() {
    return this.node.type === "folder";
  }
  get open() {
    return this.isFolder && this.tree.expanded().has(this.id);
  }
  get dropLabel() {
    const d = this.tree.dropTarget();
    return d && d.id === this.id ? (d.valid ? d.position : "invalid") : null;
  }
  get rowClass() {
    const cls = ["row"];
    if (this.tree.dragId() === this.id) cls.push("dragging");
    if (this.tree.cutId() === this.id) cls.push("cut");
    const drop = this.dropLabel;
    if (drop) cls.push("drop-" + drop);
    return cls.join(" ");
  }

  onKey(e: KeyboardEvent) {
    if (e.target === e.currentTarget) this.tree.onKeyDown(e, this.id);
  }
  onFocus(e: FocusEvent) {
    if (e.target === e.currentTarget) this.tree.focusId.set(this.id);
  }
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build Nested Checkboxes (tri-state)",
    seoDescription:
      "Build a tri-state nested checkbox tree in React, Vue and Angular: leaf-only state, derived parents, the indeterminate DOM property, verified behaviour.",
    description: `**Question presented to candidate:**
"Build a checkbox tree, like the one for picking permissions or grocery categories. Checking a parent checks everything under it, unchecking clears it, and a parent whose children are only partly checked should show the half-checked dash. Changing children must update every parent above them."

**Requirements:**
- Render an arbitrarily deep tree of labelled checkboxes, indented by level.
- Clicking a parent that is fully checked unchecks all its descendants; clicking an unchecked or partly checked parent checks all of them.
- A parent shows checked when all its leaves are checked, unchecked when none are, and indeterminate (the dash) when some are, at every level up to the root.
- The indeterminate look must come from the real \`indeterminate\` property of the input, so assistive technology sees a mixed state.
- A summary line: "3 of 8 selected: Orange, Lemon, Lime".

**What a strong answer should cover:**
- A single source of truth: store only the checked leaves (a \`Set\` of ids); derive every parent state from them in one post-order pass.
- Why storing a \`checked\` flag on every node leads to drift, and how propagation down (toggle) and up (derive) both fall out of the leaf-only model.
- \`indeterminate\` is a DOM property with no HTML attribute, so each framework sets it differently (React: ref plus effect; Vue and Angular: property binding).
- What a native click does to an indeterminate checkbox and how that matches the rule "mixed becomes checked".
- Complexity: O(n) per change; when to memoize.

**Clarifying questions expected:**
- "When I click a partly checked parent, should it select all or clear all?"
- "Can items be disabled, and should a parent click skip them?"
- "Does the parent itself carry a value, or only the leaves?"

**Code / implementation expected:** Yes. A working recursive checkbox tree with correct tri-state behaviour.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend candidates comfortable with React state who have never built a hierarchical checkbox.
**Difficulty:** Hard

> **How to read this doc:** Plain words first, then a <code>📌 Interview term:</code> tag. All code comes from the runnable solution, and the Verified section quotes what it printed on React 19.3.1, including the real \`indeterminate\` property of every box.

## 1. Why This Even Matters — A Story First

Picture a family grocery list on the fridge with categories: Fruit (Apple, Banana, Citrus: Orange, Lemon, Lime), Vegetables, Dairy. If someone ticks "Fruit", they mean every fruit. If you have ticked only Lemon, "Fruit" is neither done nor untouched; you would draw a little dash next to it.

The trap is to keep a tick for every line. Then someone ticks Lemon and forgets to update Citrus, Fruit and the whole list; one forgotten update and the fridge lies. The fix is a rule a child could follow: **only the real items (the leaves) have ticks; a category's mark is always worked out from its items**. Then it can never be wrong.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Clicking a partly checked parent: check all or clear all? | This build checks all, matching what a native click does to an indeterminate box. |
| Are there disabled items? | A parent click must skip them, and "all checked" then means "all enabled checked". |
| Do parents carry their own value, or only leaves? | If a parent is a real permission, the leaf-only model needs an extra rule. |
| How big is the tree? | Thousands of nodes still work in O(n), but you would memoize rows and maybe virtualize. |
| Is it controlled from outside (a form value)? | Then the checked set comes in as a prop with an \`onChange\`. |
| Collapsible groups? | Adds expand state, independent from checked state. |

## 3. Requirements and Plan

📌 **Interview term: Tri-state checkbox** — a checkbox that can be checked, unchecked, or **indeterminate** (mixed, drawn as a dash), used for a parent whose children are partly selected.

### The state model

| Piece | Kind | Why |
| :--- | :--- | :--- |
| \`checked\` | state: \`Set\` of leaf ids | The only source of truth |
| \`states\` (id -> checked / unchecked / mixed), \`on\`, \`total\` | derived with \`useMemo\` | Recomputed from \`checked\` in one pass |
| summary labels | derived | Walk of the leaves |

📌 **Interview term: Single source of truth** — every fact lives in exactly one place; everything else is computed from it. Here the fact is "which leaves are checked".

<svg class="iq-diagram" width="100%" viewBox="0 0 640 270" role="img" aria-label="Clicking a parent pushes a change down to all its leaves. The parent states are then derived upward from the leaves, from Citrus to Fruit to All.">
  <defs>
    <marker id="nc4r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="240" y="20" width="160" height="44" rx="8"/>
  <text class="d-text d-accent" x="320" y="47" text-anchor="middle">All: mixed</text>
  <rect class="d-box" x="240" y="110" width="160" height="44" rx="8"/>
  <text class="d-text" x="320" y="137" text-anchor="middle">Citrus: mixed</text>
  <rect class="d-box-muted" x="40" y="200" width="150" height="44" rx="8"/>
  <text class="d-text" x="115" y="227" text-anchor="middle">Orange</text>
  <rect class="d-box-accent" x="245" y="200" width="150" height="44" rx="8"/>
  <text class="d-text d-accent" x="320" y="227" text-anchor="middle">Lemon: checked</text>
  <rect class="d-box-muted" x="450" y="200" width="150" height="44" rx="8"/>
  <text class="d-text" x="525" y="227" text-anchor="middle">Lime</text>
  <path class="d-edge-accent" d="M 320 200 L 320 154" marker-end="url(#nc4r-arrow)"/>
  <path class="d-edge-accent" d="M 320 110 L 320 64" marker-end="url(#nc4r-arrow)"/>
  <path class="d-edge-dashed" d="M 240 140 L 120 200" marker-end="url(#nc4r-arrow)"/>
  <path class="d-edge-dashed" d="M 400 140 L 520 200" marker-end="url(#nc4r-arrow)"/>
</svg>

Solid arrows are the derivation: only Lemon is stored, and Citrus, Fruit (omitted for space) and All are computed upwards from it. Dashed arrows are a parent click: it writes to the leaves only, and the parents then recompute.

## 4. Build It Step by Step

### Step 1: Derive every parent in one pass

📌 **Interview term: Post-order traversal** — visit all children before their parent. Each parent then just adds up its children's counts, so the whole tree costs O(n) per change.

~~~js
export function computeStates(node, checked, states = new Map()) {
  if (!node.children) {
    const s = checked.has(node.id) ? "checked" : "unchecked";
    states.set(node.id, s);
    return { on: s === "checked" ? 1 : 0, total: 1, states };
  }
  let on = 0;
  let total = 0;
  for (const c of node.children) {
    const r = computeStates(c, checked, states);
    on += r.on;
    total += r.total;
  }
  states.set(
    node.id,
    on === 0 ? "unchecked" : on === total ? "checked" : "mixed",
  );
  return { on, total, states };
}
~~~

A parent is \`checked\` when every leaf below it is, \`unchecked\` when none is, \`mixed\` otherwise. Nothing about a parent is stored, so it can never disagree with its children.

### Step 2: Toggle writes only leaves

~~~js
export function toggle(node, checked, states) {
  const next = new Set(checked);
  const turnOn = states.get(node.id) !== "checked";
  for (const id of leafIds(node)) {
    if (turnOn) next.add(id);
    else next.delete(id);
  }
  return next;
}
~~~

Clicking a leaf toggles that leaf. Clicking a parent sets all of its leaves to one value: off if the parent was fully checked, on if it was unchecked or mixed. Propagation *down* is this loop; propagation *up* is the derivation in step 1. There is no separate "update the ancestors" code to forget.

The App owns the set and memoizes the derivation ([useMemo](/interview-question/what-is-the-difference-between-usememo-and-usecallback)):

~~~jsx
const [checked, setChecked] = useState(() => new Set(initialChecked));
const { on, total, states } = useMemo(
  () => computeStates(groceries, checked),
  [checked],
);
~~~

### Step 3: The \`indeterminate\` property

📌 **Interview term: DOM property vs HTML attribute** — attributes are what you write in HTML; properties live on the element object. \`indeterminate\` exists only as a property: there is no \`indeterminate\` attribute you can put in markup.

React passes unknown props to the DOM as attributes, so \`<input indeterminate={true} />\` does not work. A probe of exactly that on React 19.3.1 printed:

~~~text
Received \`true\` for a non-boolean attribute \`indeterminate\`.
[react] attr: null | prop: false
~~~

So the checkbox gets a [ref](/interview-question/describe-the-useref-hook-and-its-typical-use-cases) and an effect writes the property after every commit:

~~~jsx
export default function CheckNode({ node, states, onToggle }) {
  const state = states.get(node.id);
  const ref = useRef(null);
  // indeterminate is a DOM PROPERTY with
  // no HTML attribute, so it cannot be
  // rendered as a prop; set it on the
  // element after every commit instead.
  useEffect(() => {
    ref.current.indeterminate = state === "mixed";
  });

  return (
    <li>
      <label className={node.children ? "parent" : ""}>
        <input
          ref={ref}
          type="checkbox"
          data-id={node.id}
          checked={state === "checked"}
          onChange={() => onToggle(node)}
        />
        {node.label}
      </label>
      {node.children && (
        <ul role="group" aria-label={node.label}>
          {node.children.map((c) => (
            <CheckNode
              key={c.id}
              node={c}
              states={states}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
~~~

The effect has no dependency array on purpose. A click on a mixed box makes the browser clear \`indeterminate\` before React runs. If the derived state then stays \`mixed\` (say a handler ignores the click), an effect keyed on \`[state]\` never re-runs and the dash is lost. A second probe on React 19.3.1 clicked two always-mixed boxes whose \`onChange\` did nothing, then re-rendered:

~~~text
[react] deps after ignored click + a re-render: checked false indeterminate false
[react] every after ignored click + a re-render: checked false indeterminate true
~~~

React restored \`checked\` for both controlled inputs, but only the effect without dependencies restored \`indeterminate\`.

### Step 4: The recursive row

Each \`CheckNode\` renders a \`label\` wrapping the input (so the text is clickable and is the accessible name), then a nested \`ul role="group"\` with one \`CheckNode\` per child and \`key={c.id}\`. The checkbox is a [controlled input](/interview-question/what-is-the-difference-between-controlled-and-uncontrolled-components): \`checked\` comes from the derived state and \`onChange\` calls back into the App.

## 5. Verified

Mounted in jsdom like the playground. The driver clicked the real \`<input>\` elements, so jsdom ran native checkbox activation (flip \`checked\`, clear \`indeterminate\`) before React re-rendered. Each box prints as \`[x]\` checked, \`[-]\` indeterminate (read from the \`indeterminate\` property), \`[ ]\` unchecked. Unedited output:

~~~text
[react] RENDERED: Shopping listAll groceriesFruitAppleBananaCitrusOrangeLemonLimeVegetablesCarrotPotatoDairyMilk1 of 8 selected: Lemon
[react] initial (Lemon checked):
[react]    All groceries[-] Fruit[-] Apple[ ] Banana[ ] Citrus[-] Orange[ ] Lemon[x] Lime[ ] Vegetables[ ] Carrot[ ] Potato[ ] Dairy[ ] Milk[ ]
[react]    1 of 8 selected: Lemon
[react]   indeterminate props: all=true fruit=true citrus=true veg=false | attribute present: false
[react] click Orange, Lime -> Citrus complete:
[react]    All groceries[-] Fruit[-] Apple[ ] Banana[ ] Citrus[x] Orange[x] Lemon[x] Lime[x] Vegetables[ ] Carrot[ ] Potato[ ] Dairy[ ] Milk[ ]
[react]    3 of 8 selected: Orange, Lemon, Lime
[react] click Fruit while mixed:
[react]    All groceries[-] Fruit[x] Apple[x] Banana[x] Citrus[x] Orange[x] Lemon[x] Lime[x] Vegetables[ ] Carrot[ ] Potato[ ] Dairy[ ] Milk[ ]
[react]    5 of 8 selected: Apple, Banana, Orange, Lemon, Lime
[react] click Citrus while checked:
[react]    All groceries[-] Fruit[-] Apple[x] Banana[x] Citrus[ ] Orange[ ] Lemon[ ] Lime[ ] Vegetables[ ] Carrot[ ] Potato[ ] Dairy[ ] Milk[ ]
[react]    2 of 8 selected: Apple, Banana
[react] click All while mixed:
[react]    All groceries[x] Fruit[x] Apple[x] Banana[x] Citrus[x] Orange[x] Lemon[x] Lime[x] Vegetables[x] Carrot[x] Potato[x] Dairy[x] Milk[x]
[react]    8 of 8 selected: Apple, Banana, Orange, Lemon, Lime, Carrot, Potato, Milk
[react]   any indeterminate left: false
[react] click All while checked:
[react]    All groceries[ ] Fruit[ ] Apple[ ] Banana[ ] Citrus[ ] Orange[ ] Lemon[ ] Lime[ ] Vegetables[ ] Carrot[ ] Potato[ ] Dairy[ ] Milk[ ]
[react]    0 of 8 selected
[react] click Milk:
[react]    All groceries[-] Fruit[ ] Apple[ ] Banana[ ] Citrus[ ] Orange[ ] Lemon[ ] Lime[ ] Vegetables[ ] Carrot[ ] Potato[ ] Dairy[x] Milk[x]
[react]    1 of 8 selected: Milk
~~~

What it shows: on load only Lemon is stored, yet Citrus, Fruit and All read \`indeterminate === true\` and the markup has no \`indeterminate\` attribute; completing Citrus flips it to checked while Fruit stays mixed; a click on mixed Fruit checks all five fruit leaves; a click on checked Citrus clears its three leaves; a click on mixed All checks everything and leaves no indeterminate box anywhere; Milk alone makes Dairy checked (a parent with one leaf) and All mixed. No \`console.error\`. Not checked here: how a screen reader announces the mixed state; browsers map native \`indeterminate\` to "mixed", but that was not observed in this sandbox.

## 6. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Parent with one child | Its state always equals the child |
| Click on a mixed parent | Checks all leaves (same as the native click) |
| Deep nesting | Post-order derivation handles any depth |
| Keyboard | Native checkboxes: Tab between them, Space toggles; no custom key code needed |
| Screen readers | Real \`<input type="checkbox">\` inside a \`label\`; the native \`indeterminate\` property, not a styled \`div\`; each group is \`role="group"\` named after its parent |
| Live summary | \`aria-live="polite"\` count and names |

## 7. Common Pitfalls

- **Storing \`checked\` on every node.** Parents drift from their children after the first forgotten update. Store leaves only.
- **\`indeterminate\` as a JSX prop.** React warns and sets nothing (shown above). Use a ref and an effect.
- **An effect with \`[state]\` dependencies.** If a click leaves the derived state unchanged, the browser has already cleared \`indeterminate\` and the effect never re-runs (probe above). Sync after every commit.
- **Recomputing ancestors by walking up from the clicked node.** It works for one click but gets complicated with "select all" and initial data; one O(n) derivation is simpler and always right.
- **Custom \`div\` checkboxes.** You must then rebuild focus, Space, \`role="checkbox"\` and \`aria-checked="mixed"\` yourself.
- **Treating "mixed" as checked in the summary.** Count leaves, not parents.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">"I store only the checked leaves, as a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> of ids. Every parent state is derived, so there is one source of truth and nothing can drift."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Derive up:</strong> <span style="color:#f0e2c8;">"A post-order pass counts checked leaves under each node: all is checked, none is unchecked, otherwise mixed. It is O(n) and memoized on the set."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Toggle down:</strong> <span style="color:#f0e2c8;">"A leaf click toggles that leaf; a parent click sets all its leaves on, unless the parent was fully checked, then off. That matches what a native click does to an indeterminate box."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Indeterminate:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">indeterminate</code> is a DOM property with no attribute, so in React I set it from a ref in an effect after every commit; JSX would only warn."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Accessibility:</strong> <span style="color:#f0e2c8;">"Real checkboxes inside labels, groups named after their parent, keyboard for free, and a live summary of what is selected."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle disabled items?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Skip disabled leaves in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toggle</code>, and compute parent state over enabled leaves only, so a parent whose enabled children are all checked shows checked even if a disabled one is off.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The tree has 20,000 nodes. Is O(n) per click fine?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes for the derivation. The cost is rendering 20,000 rows; memoize <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CheckNode</code> so only rows whose state changed re-render, and virtualize the flattened visible rows if needed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the selected value out?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Expose the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> (or a sorted array of leaf ids) through an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onChange</code> prop, or make the component controlled with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onChange</code> so a form owns it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does clicking a mixed box check everything?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The HTML checkbox activation sets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">indeterminate</code> to false and flips <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">checked</code>; an indeterminate box is unchecked underneath, so it becomes checked. Matching that keeps the native behaviour and the app logic in agreement.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Click a leaf and assert the parent input's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">indeterminate</code> property is true; click the parent and assert every child is checked and no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">indeterminate</code> is left. Test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computeStates</code> separately as a pure function.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Tri-state checkbox | Checked, unchecked or indeterminate |
| Single source of truth | One stored fact, everything else derived |
| Post-order traversal | Children before parent |
| DOM property vs attribute | Object field vs markup; \`indeterminate\` is property-only |
| Controlled input | Value comes from state, changes go through a handler |

---

**Conclusion:** Store only the checked leaves, derive every parent in one post-order pass, write only leaves on toggle, and set the \`indeterminate\` property from a ref after each commit. That model makes "down" and "up" propagation the same code path as rendering, so the tree is always consistent. The same pattern underlies the nested comments counts in [Build a Nested Comments widget](/interview-question/build-a-nested-comments-widget).`,
        files: {
          "/App.js": `import { useMemo, useState } from "react";
import CheckNode from "./src/CheckNode";
import {
  groceries,
  initialChecked,
  computeStates,
  toggle,
  selectedLabels,
} from "./src/checkTree";

export default function App() {
  // The single source of truth: a Set of checked LEAF ids.
  const [checked, setChecked] = useState(() => new Set(initialChecked));
  const { on, total, states } = useMemo(
    () => computeStates(groceries, checked),
    [checked],
  );
  const labels = selectedLabels(groceries, checked);

  return (
    <div className="app">
      <h1>Shopping list</h1>
      <ul className="checks">
        <CheckNode
          node={groceries}
          states={states}
          onToggle={(node) => setChecked((prev) => toggle(node, prev, states))}
        />
      </ul>
      <p className="summary" aria-live="polite" data-testid="summary">
        {on} of {total} selected{labels.length ? ": " + labels.join(", ") : ""}
      </p>
    </div>
  );
}
`,
          "/src/CheckNode.js": `import { useEffect, useRef } from "react";

export default function CheckNode({ node, states, onToggle }) {
  const state = states.get(node.id);
  const ref = useRef(null);
  // indeterminate is a DOM PROPERTY with no HTML attribute, so it cannot be
  // rendered as a prop; set it on the element after every commit instead.
  useEffect(() => {
    ref.current.indeterminate = state === "mixed";
  });

  return (
    <li>
      <label className={node.children ? "parent" : ""}>
        <input
          ref={ref}
          type="checkbox"
          data-id={node.id}
          checked={state === "checked"}
          onChange={() => onToggle(node)}
        />
        {node.label}
      </label>
      {node.children && (
        <ul role="group" aria-label={node.label}>
          {node.children.map((c) => (
            <CheckNode
              key={c.id}
              node={c}
              states={states}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
`,
          "/src/checkTree.js": `// Only LEAVES are stored as checked. Every parent state is derived from them,
// so a parent can never disagree with its children.

export const groceries = {
  id: "all",
  label: "All groceries",
  children: [
    {
      id: "fruit",
      label: "Fruit",
      children: [
        { id: "apple", label: "Apple" },
        { id: "banana", label: "Banana" },
        {
          id: "citrus",
          label: "Citrus",
          children: [
            { id: "orange", label: "Orange" },
            { id: "lemon", label: "Lemon" },
            { id: "lime", label: "Lime" },
          ],
        },
      ],
    },
    {
      id: "veg",
      label: "Vegetables",
      children: [
        { id: "carrot", label: "Carrot" },
        { id: "potato", label: "Potato" },
      ],
    },
    { id: "dairy", label: "Dairy", children: [{ id: "milk", label: "Milk" }] },
  ],
};

export const initialChecked = ["lemon"];

export function leafIds(node, out = []) {
  if (!node.children) out.push(node.id);
  else node.children.forEach((c) => leafIds(c, out));
  return out;
}

// One post-order walk: each node's state is 'checked' | 'unchecked' | 'mixed'.
// Children are counted before their parent, so the whole tree costs O(n).
export function computeStates(node, checked, states = new Map()) {
  if (!node.children) {
    const s = checked.has(node.id) ? "checked" : "unchecked";
    states.set(node.id, s);
    return { on: s === "checked" ? 1 : 0, total: 1, states };
  }
  let on = 0;
  let total = 0;
  for (const c of node.children) {
    const r = computeStates(c, checked, states);
    on += r.on;
    total += r.total;
  }
  states.set(
    node.id,
    on === 0 ? "unchecked" : on === total ? "checked" : "mixed",
  );
  return { on, total, states };
}

// Clicking a parent that is fully checked clears its leaves; clicking an
// unchecked OR mixed parent checks all of them (what a native click does too).
export function toggle(node, checked, states) {
  const next = new Set(checked);
  const turnOn = states.get(node.id) !== "checked";
  for (const id of leafIds(node)) {
    if (turnOn) next.add(id);
    else next.delete(id);
  }
  return next;
}

export function selectedLabels(node, checked, out = []) {
  if (!node.children) {
    if (checked.has(node.id)) out.push(node.label);
  } else node.children.forEach((c) => selectedLabels(c, checked, out));
  return out;
}
`,
          "/styles.css": `body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.app {
  max-width: 480px;
  margin: 0 auto;
  padding: 16px;
}
h1 {
  font-size: 18px;
  margin: 0 0 12px;
}
.checks,
.checks ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
.checks {
  background: #161a23;
  border: 1px solid #262c3b;
  border-radius: 8px;
  padding: 8px 12px;
}
.checks ul {
  padding-left: 22px;
  border-left: 1px solid #262c3b;
  margin-left: 7px;
}
label {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  cursor: pointer;
}
label.parent {
  font-weight: 600;
}
input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #6ea8ff;
}
.summary {
  color: #9aa3b5;
  font-size: 14px;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Vue 3 developers who know \`ref\`, \`computed\` and components, building a hierarchical checkbox for the first time.
**Difficulty:** Hard

> **How to read this doc:** Plain words first, then a <code>📌 Interview term:</code> tag. Code is from the runnable Vue solution; the Verified section quotes its output on Vue 3.5.44, read from each input's real \`indeterminate\` property.

## 1. Why This Even Matters — A Story First

On a family grocery list, ticking "Fruit" means every fruit, and if only Lemon is ticked, "Fruit" deserves a dash, not a tick. Keeping a tick on every line means someone eventually forgets to update a category. The reliable rule: only real items get ticks, and each category's mark is worked out from its items. In Vue that rule is one reactive \`Set\` and one \`computed\`.

## 2. Requirements and Plan

Recursive checkbox tree; parent click checks all leaves (or clears them if fully checked); parents show checked, unchecked or indeterminate at every level; real \`indeterminate\` property; a live summary.

| Piece | Vue tool |
| :--- | :--- |
| \`checked\` | \`reactive(new Set(initialChecked))\`, leaf ids only |
| \`result\` (\`on\`, \`total\`, \`states\` map) | \`computed(() => computeStates(groceries, checked))\` |
| \`labels\` | \`computed\` |
| \`CheckNode.vue\` | recursive; props \`node\`, \`states\`; emits \`toggle\` |

📌 **Interview term: Single source of truth** — the checked leaves are the only stored fact; every parent state is computed. Nothing can drift.

📌 **Interview term: Tri-state checkbox** — checked, unchecked, or indeterminate (the dash), the third meaning "some children selected".

## 3. Build It Step by Step

### Step 1: Derive parents in one pass

~~~js
export function computeStates(node, checked, states = new Map()) {
  if (!node.children) {
    const s = checked.has(node.id) ? "checked" : "unchecked";
    states.set(node.id, s);
    return { on: s === "checked" ? 1 : 0, total: 1, states };
  }
  let on = 0;
  let total = 0;
  for (const c of node.children) {
    const r = computeStates(c, checked, states);
    on += r.on;
    total += r.total;
  }
  states.set(
    node.id,
    on === 0 ? "unchecked" : on === total ? "checked" : "mixed",
  );
  return { on, total, states };
}
~~~

📌 **Interview term: Post-order traversal** — children are visited before their parent, so each parent sums its children's counts; the whole tree is O(n). The \`computed\` caches the result until the \`Set\` changes; Vue tracks \`Set.has\` on a reactive Set.

### Step 2: Toggle mutates the Set

~~~js
export function toggle(node, checked, states) {
  const turnOn = states.get(node.id) !== "checked";
  for (const id of leafIds(node)) {
    if (turnOn) checked.add(id);
    else checked.delete(id);
  }
}
~~~

Only leaves are written. Clicking a fully checked parent clears its leaves; clicking an unchecked or mixed parent fills them. Going up needs no code: the \`computed\` re-derives.

### Step 3: Bind \`indeterminate\` as a property

📌 **Interview term: DOM property binding** — when a bound name exists as a property on the element (\`'indeterminate' in input\` is true), Vue sets the property instead of an attribute. That is exactly what \`indeterminate\` needs, since it has no HTML attribute.

~~~vue
<input
  type="checkbox"
  :data-id="node.id"
  :checked="states.get(node.id) === 'checked'"
  :indeterminate="states.get(node.id) === 'mixed'"
  @change="emit('toggle', node)"
/>
~~~

### Step 4: Events through the recursion

Each \`CheckNode\` re-emits its children's \`toggle\` with \`@toggle="emit('toggle', $event)"\`, so the root receives the clicked node. For a few levels that is clear and keeps \`CheckNode\` reusable; for deep trees, \`provide\` / \`inject\` of a toggle function avoids the chain (see [provide and inject](/interview-question/what-are-provide-and-inject) and [declaring emits](/interview-question/why-declare-emits-and-can-you-validate-them)).

## 4. Verified

Mounted in jsdom with \`createApp(App).mount("#app")\`. The driver clicked real inputs, so jsdom ran native checkbox activation first. \`[x]\` checked, \`[-]\` indeterminate (from the property), \`[ ]\` unchecked. Unedited output (the first \`RENDERED\` line differs from React only in template whitespace):

~~~text
[vue] RENDERED: Shopping list All groceries Fruit Apple Banana Citrus Orange Lemon Lime Vegetables Carrot Potato Dairy Milk1 of 8 selected: Lemon
[vue] initial (Lemon checked):
[vue]    All groceries[-] Fruit[-] Apple[ ] Banana[ ] Citrus[-] Orange[ ] Lemon[x] Lime[ ] Vegetables[ ] Carrot[ ] Potato[ ] Dairy[ ] Milk[ ]
[vue]    1 of 8 selected: Lemon
[vue]   indeterminate props: all=true fruit=true citrus=true veg=false | attribute present: false
[vue] click Orange, Lime -> Citrus complete:
[vue]    All groceries[-] Fruit[-] Apple[ ] Banana[ ] Citrus[x] Orange[x] Lemon[x] Lime[x] Vegetables[ ] Carrot[ ] Potato[ ] Dairy[ ] Milk[ ]
[vue]    3 of 8 selected: Orange, Lemon, Lime
[vue] click Fruit while mixed:
[vue]    All groceries[-] Fruit[x] Apple[x] Banana[x] Citrus[x] Orange[x] Lemon[x] Lime[x] Vegetables[ ] Carrot[ ] Potato[ ] Dairy[ ] Milk[ ]
[vue]    5 of 8 selected: Apple, Banana, Orange, Lemon, Lime
[vue] click Citrus while checked:
[vue]    All groceries[-] Fruit[-] Apple[x] Banana[x] Citrus[ ] Orange[ ] Lemon[ ] Lime[ ] Vegetables[ ] Carrot[ ] Potato[ ] Dairy[ ] Milk[ ]
[vue]    2 of 8 selected: Apple, Banana
[vue] click All while mixed:
[vue]    All groceries[x] Fruit[x] Apple[x] Banana[x] Citrus[x] Orange[x] Lemon[x] Lime[x] Vegetables[x] Carrot[x] Potato[x] Dairy[x] Milk[x]
[vue]    8 of 8 selected: Apple, Banana, Orange, Lemon, Lime, Carrot, Potato, Milk
[vue]   any indeterminate left: false
[vue] click All while checked:
[vue]    All groceries[ ] Fruit[ ] Apple[ ] Banana[ ] Citrus[ ] Orange[ ] Lemon[ ] Lime[ ] Vegetables[ ] Carrot[ ] Potato[ ] Dairy[ ] Milk[ ]
[vue]    0 of 8 selected
[vue] click Milk:
[vue]    All groceries[-] Fruit[ ] Apple[ ] Banana[ ] Citrus[ ] Orange[ ] Lemon[ ] Lime[ ] Vegetables[ ] Carrot[ ] Potato[ ] Dairy[x] Milk[x]
[vue]    1 of 8 selected: Milk
~~~

The behaviour lines match React and Angular exactly: three mixed ancestors from one stored leaf and no \`indeterminate\` attribute, Citrus completing, mixed Fruit filling, checked Citrus clearing, mixed All filling everything with no dash left, and Dairy following its single child. No \`console.error\`.

A separate probe showed a Vue-specific trap. An input bound \`:checked="false" :indeterminate="true"\` whose \`@change\` does nothing was clicked, then the component re-rendered:

~~~text
[vue] before: indeterminate true
[vue] after ignored click + a re-render: checked true indeterminate false
~~~

Vue patches a DOM property only when the bound value changes, so after a click your handler ignores, the DOM keeps the browser's values. The solution is safe because every click changes the \`Set\`; a handler that can refuse a click must force the property back itself.

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Parent with one child | Mirrors the child |
| Click on a mixed parent | Checks all leaves |
| Keyboard | Native checkboxes, Space toggles |
| Screen readers | Real inputs in \`label\`s, groups named by parent; the native \`indeterminate\` property (announced as mixed by browsers; not observed in this sandbox) |

## 6. Common Pitfalls

- **Storing a flag on every node.** Parents drift; store leaves only.
- **\`v-model\` on each checkbox.** It writes \`checked\` straight into data, and a parent's checked state is not data here. Bind \`:checked\` and handle \`@change\`.
- **Using \`:indeterminate.attr\`.** Forces an attribute, which the browser ignores.
- **Refusing a click without restoring the DOM.** Unchanged bindings are not re-applied (probe above).
- **Deep re-emit chains in big trees.** Use \`provide\` / \`inject\` for the action.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">"Only checked leaves are stored, in a reactive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code>; parent states come from one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> post-order pass."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Toggle:</strong> <span style="color:#f0e2c8;">"A leaf click toggles it; a parent click sets all its leaves, off if it was fully checked, otherwise on, matching the native click on an indeterminate box."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Binding:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:indeterminate</code> works because Vue sets it as a DOM property; there is no attribute to set."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Events:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CheckNode.vue</code> is recursive and re-emits <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toggle</code> up to the root, which mutates the Set; the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> updates every ancestor."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Accessibility:</strong> <span style="color:#f0e2c8;">"Native inputs in labels, groups named after the parent, Space to toggle, and a polite live summary."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">reactive(new Set())</code> and not an array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">has</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">add</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">delete</code> are O(1) and Vue tracks them on a reactive Set; an array needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">includes</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">splice</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you expose the value to a form?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineModel()</code> for a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> or array of ids, so a parent writes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model="selected"</code> and the tree emits updates.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Disabled items?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Skip them in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toggle</code> and count only enabled leaves when deriving parents.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mount, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">trigger('change')</code> or click a leaf input, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await nextTick()</code>, assert the parent input <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.indeterminate</code> is true; click the parent and assert all children checked.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Tri-state checkbox | Checked, unchecked or indeterminate |
| Single source of truth | One stored fact, the rest derived |
| Post-order traversal | Children before parent |
| DOM property binding | Vue sets an element property when it exists |

---

**Conclusion:** In Vue, tri-state checkboxes are a reactive \`Set\` of leaf ids, one \`computed\` that derives every parent, a \`toggle\` that writes leaves only, and \`:indeterminate\` bound as a DOM property. Keep every click changing state, or restore the DOM yourself, because Vue only patches values that changed.`,
        files: {
          "/src/App.vue": `<script setup>
import { computed, reactive } from "vue";
import CheckNode from "./components/CheckNode.vue";
import {
  groceries,
  initialChecked,
  computeStates,
  toggle,
  selectedLabels,
} from "./checkTree.js";

// The single source of truth: a reactive Set of checked LEAF ids.
const checked = reactive(new Set(initialChecked));
// Re-derived only when the Set changes: {
// on, total, states: Map(id -> state) }.
const result = computed(() => computeStates(groceries, checked));
const labels = computed(() => selectedLabels(groceries, checked));

function onToggle(node) {
  toggle(node, checked, result.value.states);
}
</script>

<template>
  <div class="app">
    <h1>Shopping list</h1>
    <ul class="checks">
      <CheckNode :node="groceries" :states="result.states" @toggle="onToggle" />
    </ul>
    <p class="summary" aria-live="polite" data-testid="summary">
      {{ result.on }} of {{ result.total }} selected{{ labels.length ? ': ' + labels.join(', ') : '' }}
    </p>
  </div>
</template>

<style>
body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.app {
  max-width: 480px;
  margin: 0 auto;
  padding: 16px;
}
h1 {
  font-size: 18px;
  margin: 0 0 12px;
}
.checks,
.checks ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
.checks {
  background: #161a23;
  border: 1px solid #262c3b;
  border-radius: 8px;
  padding: 8px 12px;
}
.checks ul {
  padding-left: 22px;
  border-left: 1px solid #262c3b;
  margin-left: 7px;
}
label {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  cursor: pointer;
}
label.parent {
  font-weight: 600;
}
input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #6ea8ff;
}
.summary {
  color: #9aa3b5;
  font-size: 14px;
}
</style>
`,
          "/src/checkTree.js": `// Only LEAVES are stored as checked. Every parent state is derived from them,
// so a parent can never disagree with its children.

export const groceries = {
  id: "all",
  label: "All groceries",
  children: [
    {
      id: "fruit",
      label: "Fruit",
      children: [
        { id: "apple", label: "Apple" },
        { id: "banana", label: "Banana" },
        {
          id: "citrus",
          label: "Citrus",
          children: [
            { id: "orange", label: "Orange" },
            { id: "lemon", label: "Lemon" },
            { id: "lime", label: "Lime" },
          ],
        },
      ],
    },
    {
      id: "veg",
      label: "Vegetables",
      children: [
        { id: "carrot", label: "Carrot" },
        { id: "potato", label: "Potato" },
      ],
    },
    { id: "dairy", label: "Dairy", children: [{ id: "milk", label: "Milk" }] },
  ],
};

export const initialChecked = ["lemon"];

export function leafIds(node, out = []) {
  if (!node.children) out.push(node.id);
  else node.children.forEach((c) => leafIds(c, out));
  return out;
}

// One post-order walk: each node's state is 'checked' | 'unchecked' | 'mixed'.
// Children are counted before their parent, so the whole tree costs O(n).
export function computeStates(node, checked, states = new Map()) {
  if (!node.children) {
    const s = checked.has(node.id) ? "checked" : "unchecked";
    states.set(node.id, s);
    return { on: s === "checked" ? 1 : 0, total: 1, states };
  }
  let on = 0;
  let total = 0;
  for (const c of node.children) {
    const r = computeStates(c, checked, states);
    on += r.on;
    total += r.total;
  }
  states.set(
    node.id,
    on === 0 ? "unchecked" : on === total ? "checked" : "mixed",
  );
  return { on, total, states };
}

// Clicking a parent that is fully checked clears its leaves; clicking an
// unchecked OR mixed parent checks all of them (what a native click does too).
// Mutates the reactive Set in place.
export function toggle(node, checked, states) {
  const turnOn = states.get(node.id) !== "checked";
  for (const id of leafIds(node)) {
    if (turnOn) checked.add(id);
    else checked.delete(id);
  }
}

export function selectedLabels(node, checked, out = []) {
  if (!node.children) {
    if (checked.has(node.id)) out.push(node.label);
  } else node.children.forEach((c) => selectedLabels(c, checked, out));
  return out;
}
`,
          "/src/components/CheckNode.vue": `<script setup>
defineProps({
  node: { type: Object, required: true },
  states: { type: Map, required: true },
});
// Each level re-emits its children's event,
// so App.vue receives the clicked node.
const emit = defineEmits(["toggle"]);
</script>

<template>
  <li>
    <label :class="{ parent: node.children }">
      <!-- indeterminate exists on the element, so Vue sets it as a DOM property -->
      <input
        type="checkbox"
        :data-id="node.id"
        :checked="states.get(node.id) === 'checked'"
        :indeterminate="states.get(node.id) === 'mixed'"
        @change="emit('toggle', node)"
      />
      {{ node.label }}
    </label>
    <ul v-if="node.children" role="group" :aria-label="node.label">
      <CheckNode
        v-for="c in node.children"
        :key="c.id"
        :node="c"
        :states="states"
        @toggle="emit('toggle', $event)"
      />
    </ul>
  </li>
</template>
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Angular developers who know signals and standalone components, building a hierarchical checkbox for the first time.
**Difficulty:** Hard

> **How to read this doc:** Plain words first, then a <code>📌 Interview term:</code> tag. Code is from the runnable Angular solution, verified on Angular 22.2.3 in AOT and in the playground JIT, reading each input's real \`indeterminate\` property.

## 1. Why This Even Matters — A Story First

On a grocery list with categories, ticking "Fruit" means every fruit; with only Lemon ticked, "Fruit" gets a dash. If every line keeps its own tick, a category is eventually wrong. Store ticks only on real items and work out each category from them, and it is always right. In Angular that is one signal holding a \`Set\` and one \`computed\`.

## 2. Requirements and Plan

Recursive tree, parent click fills or clears its leaves, checked / unchecked / indeterminate parents at every level, the real \`indeterminate\` property, a live summary.

| Piece | Angular tool |
| :--- | :--- |
| \`checked\` | \`signal<ReadonlySet<string>>\`, replaced with a new Set on each change |
| \`result\`, \`labels\` | \`computed\` |
| \`CheckNodeComponent\` | \`li[app-check-node]\`, recursive, \`@Input() node\`, \`@Input() states\`, \`@Output() toggle\` |

📌 **Interview term: Single source of truth** — the checked leaves are the only stored fact; every parent state is derived.

📌 **Interview term: Tri-state checkbox** — checked, unchecked or indeterminate (the dash).

## 3. Build It Step by Step

### Step 1: Derive in one pass

~~~ts
export function computeStates(
  node: CheckItem,
  checked: ReadonlySet<string>,
  states: StateMap = new Map(),
): { on: number; total: number; states: StateMap } {
  if (!node.children) {
    const s: CheckState = checked.has(node.id)
      ? "checked"
      : "unchecked";
    states.set(node.id, s);
    return { on: s === "checked" ? 1 : 0, total: 1, states };
  }
  let on = 0;
  let total = 0;
  for (const c of node.children) {
    const r = computeStates(c, checked, states);
    on += r.on;
    total += r.total;
  }
  states.set(
    node.id,
    on === 0 ? "unchecked" : on === total ? "checked" : "mixed",
  );
  return { on, total, states };
}
~~~

📌 **Interview term: Post-order traversal** — children first, then the parent sums them; O(n) for the whole tree, recomputed by the \`computed\` only when the signal changes.

### Step 2: Toggle returns a new Set

~~~ts
checked = signal<ReadonlySet<string>>(new Set(initialChecked));
result = computed(() => computeStates(this.tree, this.checked()));
labels = computed(() => selectedLabels(this.tree, this.checked()));

onToggle(node: CheckItem) {
  this.checked.update((prev) =>
    toggle(node, prev, this.result().states),
  );
}
~~~

\`toggle\` copies the Set and writes only leaves, so \`checked.update\` gets a new reference and the \`computed\` re-runs; a mutated Set would keep the same reference and nothing would update.

### Step 3: \`[indeterminate]\` property binding

📌 **Interview term: Property binding** — \`[name]="expr"\` writes the element *property* \`name\`. \`[indeterminate]\` therefore sets \`input.indeterminate\` directly; \`[attr.indeterminate]\` would write an attribute the browser ignores.

~~~ts
<input
  type="checkbox"
  [attr.data-id]="node.id"
  [checked]="states.get(node.id) === 'checked'"
  [indeterminate]="states.get(node.id) === 'mixed'"
  (change)="toggle.emit(node)"
/>
~~~

### Step 4: Outputs through the recursion

Each level re-emits \`(toggle)="toggle.emit($event)"\`, so the root receives the clicked node (see [how child components emit events](/interview-question/how-do-child-components-emit-events-to-parents)). The component lists itself in \`imports\` via \`forwardRef\`, which the playground JIT needs for a recursive standalone component.

## 4. Verified

Run in AOT with strict templates and in the runtime JIT, both booted with no providers. Both printed the same lines; JIT shown, unedited (the \`RENDERED\` line differs from React only in template whitespace):

~~~text
[angular:playground] RENDERED: Shopping list All groceries Fruit Apple Banana Citrus Orange Lemon Lime Vegetables Carrot Potato Dairy Milk 1 of 8 selected: Lemon
[angular:playground] initial (Lemon checked):
[angular:playground]    All groceries[-] Fruit[-] Apple[ ] Banana[ ] Citrus[-] Orange[ ] Lemon[x] Lime[ ] Vegetables[ ] Carrot[ ] Potato[ ] Dairy[ ] Milk[ ]
[angular:playground]    1 of 8 selected: Lemon
[angular:playground]   indeterminate props: all=true fruit=true citrus=true veg=false | attribute present: false
[angular:playground] click Orange, Lime -> Citrus complete:
[angular:playground]    All groceries[-] Fruit[-] Apple[ ] Banana[ ] Citrus[x] Orange[x] Lemon[x] Lime[x] Vegetables[ ] Carrot[ ] Potato[ ] Dairy[ ] Milk[ ]
[angular:playground]    3 of 8 selected: Orange, Lemon, Lime
[angular:playground] click Fruit while mixed:
[angular:playground]    All groceries[-] Fruit[x] Apple[x] Banana[x] Citrus[x] Orange[x] Lemon[x] Lime[x] Vegetables[ ] Carrot[ ] Potato[ ] Dairy[ ] Milk[ ]
[angular:playground]    5 of 8 selected: Apple, Banana, Orange, Lemon, Lime
[angular:playground] click Citrus while checked:
[angular:playground]    All groceries[-] Fruit[-] Apple[x] Banana[x] Citrus[ ] Orange[ ] Lemon[ ] Lime[ ] Vegetables[ ] Carrot[ ] Potato[ ] Dairy[ ] Milk[ ]
[angular:playground]    2 of 8 selected: Apple, Banana
[angular:playground] click All while mixed:
[angular:playground]    All groceries[x] Fruit[x] Apple[x] Banana[x] Citrus[x] Orange[x] Lemon[x] Lime[x] Vegetables[x] Carrot[x] Potato[x] Dairy[x] Milk[x]
[angular:playground]    8 of 8 selected: Apple, Banana, Orange, Lemon, Lime, Carrot, Potato, Milk
[angular:playground]   any indeterminate left: false
[angular:playground] click All while checked:
[angular:playground]    All groceries[ ] Fruit[ ] Apple[ ] Banana[ ] Citrus[ ] Orange[ ] Lemon[ ] Lime[ ] Vegetables[ ] Carrot[ ] Potato[ ] Dairy[ ] Milk[ ]
[angular:playground]    0 of 8 selected
[angular:playground] click Milk:
[angular:playground]    All groceries[-] Fruit[ ] Apple[ ] Banana[ ] Citrus[ ] Orange[ ] Lemon[ ] Lime[ ] Vegetables[ ] Carrot[ ] Potato[ ] Dairy[x] Milk[x]
[angular:playground]    1 of 8 selected: Milk
~~~

Same behaviour as React and Vue, line for line. No \`console.error\` in either mode.

A probe showed an Angular trap: an input bound \`[checked]="false" [indeterminate]="true"\` with a no-op \`(change)\` was clicked and the component re-rendered:

~~~text
[angular:app] before: indeterminate true
[angular:app] after ignored click + a re-render: checked true indeterminate false
~~~

Angular writes a property only when the bound value changes, so the DOM keeps the browser's values after a click your code ignores. The solution is safe because every click changes the signal.

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Parent with one child | Mirrors the child |
| Click on a mixed parent | Checks all leaves |
| Keyboard | Native checkboxes, Space toggles |
| Screen readers | Real inputs in labels, \`role="group"\` named by parent, native \`indeterminate\` (browsers expose it as mixed; not observed here) |

## 6. Common Pitfalls

- **Mutating the Set inside the signal.** Same reference, no update. Return a new Set.
- **\`[attr.indeterminate]\`.** Writes an attribute; there is none to write.
- **\`[(ngModel)]\` on each box.** Parent state is derived, not data; bind \`[checked]\` and handle \`(change)\`.
- **Refusing a click without restoring the DOM.** Unchanged bindings are not re-applied (probe above).
- **Recursive component without the self-import.** The playground JIT fails with \`NG0303\`.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">"I keep only the checked leaf ids in a signal holding a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code>; every parent state is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> post-order pass."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Toggle:</strong> <span style="color:#f0e2c8;">"A leaf click toggles it; a parent click sets all its leaves, off if fully checked, else on, and I return a new Set so the signal changes."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Binding:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[indeterminate]</code> is a property binding that writes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">input.indeterminate</code>, which has no attribute form."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Recursion:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">li[app-check-node]</code> renders itself for children and re-emits <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toggle</code> to the root."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Accessibility:</strong> <span style="color:#f0e2c8;">"Native inputs inside labels, named groups, keyboard for free and a polite live summary."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you expose this as a form control?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Implement <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ControlValueAccessor</code> so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">formControlName</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngModel</code> can read and write the selected ids, calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onChange</code> with a sorted array after each toggle.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Disabled items?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Skip them in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toggle</code> and derive parent state from enabled leaves only.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Performance with 20,000 nodes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The derivation stays O(n); rendering is the cost, so I would flatten visible rows and use a virtual scroll, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">track</code> by id.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In TestBed, click a leaf input, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await fixture.whenStable()</code>, assert the parent <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">indeterminate</code> property; click the parent and assert every child is checked.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Tri-state checkbox | Checked, unchecked or indeterminate |
| Single source of truth | One stored fact, the rest derived |
| Post-order traversal | Children before parent |
| Property binding | \`[name]\` writes an element property |

---

**Conclusion:** Angular tri-state checkboxes are a signal holding a \`Set\` of leaf ids, a \`computed\` post-order derivation, a \`toggle\` that returns a new Set, and \`[indeterminate]\` as a property binding. Make every click change state, because Angular only writes bindings whose value changed.`,
        files: {
          "/src/app/app.component.ts": `import { Component, ViewEncapsulation, computed, signal } from "@angular/core";
import { CheckNodeComponent } from "./check-node.component";
import {
  CheckItem,
  groceries,
  initialChecked,
  computeStates,
  toggle,
  selectedLabels,
} from "./check-tree";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CheckNodeComponent],
  encapsulation: ViewEncapsulation.None,
  template: \`
    <div class="app">
      <h1>Shopping list</h1>
      <ul class="checks">
        <li
          app-check-node
          [node]="tree"
          [states]="result().states"
          (toggle)="onToggle($event)"
        ></li>
      </ul>
      <p class="summary" aria-live="polite" data-testid="summary">
        {{ result().on }} of {{ result().total }} selected{{
          labels().length ? ": " + labels().join(", ") : ""
        }}
      </p>
    </div>
  \`,
  styles: [
    \`
      body {
        margin: 0;
        background: #0f1115;
        color: #e6e6e6;
        font-family: system-ui, sans-serif;
      }
      .app {
        max-width: 480px;
        margin: 0 auto;
        padding: 16px;
      }
      h1 {
        font-size: 18px;
        margin: 0 0 12px;
      }
      .checks,
      .checks ul {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .checks {
        background: #161a23;
        border: 1px solid #262c3b;
        border-radius: 8px;
        padding: 8px 12px;
      }
      .checks ul {
        padding-left: 22px;
        border-left: 1px solid #262c3b;
        margin-left: 7px;
      }
      label {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 32px;
        cursor: pointer;
      }
      label.parent {
        font-weight: 600;
      }
      input[type="checkbox"] {
        width: 18px;
        height: 18px;
        accent-color: #6ea8ff;
      }
      .summary {
        color: #9aa3b5;
        font-size: 14px;
      }
    \`,
  ],
})
export class AppComponent {
  tree = groceries;
  // The single source of truth: a Set of checked
  // LEAF ids, replaced (never mutated) on change.
  checked = signal<ReadonlySet<string>>(new Set(initialChecked));
  result = computed(() => computeStates(this.tree, this.checked()));
  labels = computed(() => selectedLabels(this.tree, this.checked()));

  onToggle(node: CheckItem) {
    this.checked.update((prev) => toggle(node, prev, this.result().states));
  }
}
`,
          "/src/app/check-node.component.ts": `import {
  Component,
  EventEmitter,
  Input,
  Output,
  forwardRef,
} from "@angular/core";
import { CheckItem, StateMap } from "./check-tree";

@Component({
  selector: "li[app-check-node]",
  standalone: true,
  // it renders itself for the children
  imports: [forwardRef(() => CheckNodeComponent)],
  template: \`
    <label [class.parent]="!!node.children">
      <!-- [indeterminate] is a property binding: it writes input.indeterminate directly -->
      <input
        type="checkbox"
        [attr.data-id]="node.id"
        [checked]="states.get(node.id) === 'checked'"
        [indeterminate]="states.get(node.id) === 'mixed'"
        (change)="toggle.emit(node)"
      />
      {{ node.label }}
    </label>
    @if (node.children) {
      <ul role="group" [attr.aria-label]="node.label">
        @for (c of node.children; track c.id) {
          <li
            app-check-node
            [node]="c"
            [states]="states"
            (toggle)="toggle.emit($event)"
          ></li>
        }
      </ul>
    }
  \`,
})
export class CheckNodeComponent {
  @Input({ required: true }) node!: CheckItem;
  @Input({ required: true }) states!: StateMap;
  // re-emitted level by level up to the root
  @Output() toggle = new EventEmitter<CheckItem>();
}
`,
          "/src/app/check-tree.ts": `// Only LEAVES are stored as checked. Every parent state is derived from them,
// so a parent can never disagree with its children.

export interface CheckItem {
  id: string;
  label: string;
  children?: CheckItem[];
}
export type CheckState = "checked" | "unchecked" | "mixed";
export type StateMap = Map<string, CheckState>;

export const groceries: CheckItem = {
  id: "all",
  label: "All groceries",
  children: [
    {
      id: "fruit",
      label: "Fruit",
      children: [
        { id: "apple", label: "Apple" },
        { id: "banana", label: "Banana" },
        {
          id: "citrus",
          label: "Citrus",
          children: [
            { id: "orange", label: "Orange" },
            { id: "lemon", label: "Lemon" },
            { id: "lime", label: "Lime" },
          ],
        },
      ],
    },
    {
      id: "veg",
      label: "Vegetables",
      children: [
        { id: "carrot", label: "Carrot" },
        { id: "potato", label: "Potato" },
      ],
    },
    { id: "dairy", label: "Dairy", children: [{ id: "milk", label: "Milk" }] },
  ],
};

export const initialChecked: string[] = ["lemon"];

export function leafIds(node: CheckItem, out: string[] = []): string[] {
  if (!node.children) out.push(node.id);
  else node.children.forEach((c) => leafIds(c, out));
  return out;
}

// One post-order walk: each node's state is 'checked' | 'unchecked' | 'mixed'.
// Children are counted before their parent, so the whole tree costs O(n).
export function computeStates(
  node: CheckItem,
  checked: ReadonlySet<string>,
  states: StateMap = new Map(),
): { on: number; total: number; states: StateMap } {
  if (!node.children) {
    const s: CheckState = checked.has(node.id) ? "checked" : "unchecked";
    states.set(node.id, s);
    return { on: s === "checked" ? 1 : 0, total: 1, states };
  }
  let on = 0;
  let total = 0;
  for (const c of node.children) {
    const r = computeStates(c, checked, states);
    on += r.on;
    total += r.total;
  }
  states.set(
    node.id,
    on === 0 ? "unchecked" : on === total ? "checked" : "mixed",
  );
  return { on, total, states };
}

// Clicking a parent that is fully checked clears its leaves; clicking an
// unchecked OR mixed parent checks all of them (what a native click does too).
export function toggle(
  node: CheckItem,
  checked: ReadonlySet<string>,
  states: StateMap,
): Set<string> {
  const next = new Set(checked);
  const turnOn = states.get(node.id) !== "checked";
  for (const id of leafIds(node)) {
    if (turnOn) next.add(id);
    else next.delete(id);
  }
  return next;
}

export function selectedLabels(
  node: CheckItem,
  checked: ReadonlySet<string>,
  out: string[] = [],
): string[] {
  if (!node.children) {
    if (checked.has(node.id)) out.push(node.label);
  } else node.children.forEach((c) => selectedLabels(c, checked, out));
  return out;
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Nested Comments widget",
    seoDescription:
      "Build a recursive nested comments widget in React, Vue and Angular: inline replies, collapse a thread, delete a subtree, verified runnable code.",
    description: `**Question presented to candidate:**
"Build the comment section under a blog post. Comments can have replies, replies can have replies, with no fixed limit. I want to reply inline under any comment, collapse a thread to hide its replies, delete a comment together with everything under it, and add a new top-level comment."

**Requirements:**
- Render nested comments recursively, each reply indented under its parent with a thread line.
- Reply opens an inline textarea under that comment; Post is disabled while the text is empty or only spaces; Ctrl+Enter (or Cmd+Enter) posts; Escape or Cancel closes it.
- Collapse / expand a thread with a toggle button that has \`aria-expanded\`; a collapsed comment shows how many replies are hidden.
- Delete removes the comment and all its replies and announces how many were removed.
- A header shows the total comment count; a top-level form adds a new thread.

**What a strong answer should cover:**
- A recursive \`Comment\` component with a stable \`key\` per id and a depth for indentation.
- Data vs UI state: the comment tree is data; "collapsed" and "replying" are per-comment UI state that can live in the component.
- Immutable tree helpers by id (\`addReply\`, \`removeComment\`) or in-place mutation where the framework tracks it.
- Counting a subtree recursively for the header and the "N replies hidden" note.
- Accessibility: real buttons, \`aria-expanded\`, labelled textareas, a live status message.

**Clarifying questions expected:**
- "Is there a maximum depth, or do we indent forever?"
- "Should deleting keep a '[deleted]' placeholder when the comment has replies?"
- "Are comments loaded all at once, or replies fetched on demand?"

**Code / implementation expected:** Yes. A working recursive widget with reply, collapse and delete.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend candidates who know React basics and want a clean answer to the classic recursive UI question.
**Difficulty:** Medium

> **How to read this doc:** Plain words first, then a <code>📌 Interview term:</code> tag. All code comes from the runnable solution and the Verified section quotes its output on React 19.3.1. The harder sibling, with voting, sorting and depth limits, is [Nested Comments with Collapsible Threads & Voting](/interview-question/build-nested-comments-with-collapsible-threads-voting).

## 1. Why This Even Matters — A Story First

A group chat where people reply to replies looks like a family tree: Asha asks something, Ben answers, Chen answers Ben, Dana answers Asha directly. You cannot know how deep it will go, and you should not have to: every comment is "some text, plus a list of comments under it". So the screen is one component that shows a comment and then shows itself again for each reply.

Interviewers use this to test whether you can (1) write a recursive component, (2) update a nested structure by id without breaking anything, and (3) tell data apart from UI state.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Maximum depth? | Unlimited indentation becomes unreadable on phones; the advanced version caps it. |
| Delete: remove the subtree, or leave "[deleted]"? | Removing loses other people's replies; many forums keep a placeholder. This build removes the subtree, as specified. |
| Loaded all at once or paginated? | "Load more replies" changes the data shape to include cursors. |
| Who can delete? | Real apps only show Delete on your own comments. |
| Rich text, mentions? | A plain textarea is enough here; [mentions](/interview-question/build-mentions-in-a-textarea) are a separate question. |

## 3. Requirements and Plan

| Piece | Kind | Where |
| :--- | :--- | :--- |
| \`comments\` tree \`{ id, author, text, replies }\` | data state | \`App\` |
| \`status\` | state | \`App\`, for the live region |
| \`collapsed\`, \`replying\` | UI state | each \`Comment\` |
| reply draft text | UI state | each \`ReplyBox\` |
| total and hidden counts | derived | computed from the tree on render |

📌 **Interview term: UI state vs data state** — data state is what you would save to a server (the comments). UI state only describes the screen (is this thread collapsed? is a reply box open?). UI state can live in the component that uses it; data state lives where everyone who reads it can reach it ([lifting state up](/interview-question/explain-the-concept-of-lifting-state-up-in-react)).

<svg class="iq-diagram" width="100%" viewBox="0 0 620 260" role="img" aria-label="App holds the comment tree and passes onReply and onDelete down. Each Comment holds its own collapsed and replying flags and renders a Comment for each reply.">
  <defs>
    <marker id="nc5r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="200" y="20" width="220" height="60" rx="10"/>
  <text class="d-text d-accent" x="310" y="46" text-anchor="middle">App</text>
  <text class="d-sub" x="310" y="66" text-anchor="middle">comments tree, status</text>
  <rect class="d-box" x="200" y="140" width="220" height="60" rx="10"/>
  <text class="d-text" x="310" y="166" text-anchor="middle">Comment</text>
  <text class="d-sub" x="310" y="186" text-anchor="middle">collapsed, replying</text>
  <rect class="d-box-muted" x="20" y="140" width="130" height="60" rx="10"/>
  <text class="d-text" x="85" y="175" text-anchor="middle">ReplyBox</text>
  <path class="d-edge" d="M 310 80 L 310 140" marker-end="url(#nc5r-arrow)"/>
  <path class="d-edge" d="M 200 170 L 150 170" marker-end="url(#nc5r-arrow)"/>
  <path class="d-edge-accent" d="M 420 160 C 520 120 520 230 420 185" marker-end="url(#nc5r-arrow)"/>
  <path class="d-edge-dashed" d="M 250 140 L 250 80" marker-end="url(#nc5r-arrow)"/>
</svg>

The solid arrow down is props (\`comment\`, \`depth\`, \`onReply\`, \`onDelete\`); the dashed arrow up is those callbacks being called; the curved arrow is the recursion into replies.

## 4. Build It Step by Step

### Step 1: Tree helpers by id

📌 **Interview term: Immutable tree update** — returning a new tree where only the comments on the path to the change are new objects; everything else is reused. React needs new references to notice a change ([why immutability matters](/interview-question/why-must-react-state-updates-be-immutable)).

~~~js
export function addReply(list, parentId, comment) {
  if (parentId === null) return [...list, comment];
  return list.map((c) => {
    if (c.id === parentId)
      return { ...c, replies: [...c.replies, comment] };
    const replies = addReply(c.replies, parentId, comment);
    return replies === c.replies ? c : { ...c, replies };
  });
}

export function removeComment(list, id) {
  if (list.some((c) => c.id === id))
    return list.filter((c) => c.id !== id);
  let changed = false;
  const next = list.map((c) => {
    const replies = removeComment(c.replies, id);
    if (replies === c.replies) return c;
    changed = true;
    return { ...c, replies };
  });
  return changed ? next : list;
}

export const countAll = (list) =>
  list.reduce((n, c) => n + 1 + countAll(c.replies), 0);
~~~

Removing the comment removes its \`replies\` with it, which is exactly "delete the subtree". \`countAll\` counts a list and everything below it, used for the header and the hidden note.

### Step 2: The recursive Comment

📌 **Interview term: Recursive component** — a component that renders itself for its children, with a base case (no replies, or collapsed) that stops the recursion.

~~~jsx
{
  !collapsed && comment.replies.length > 0 && (
    <ul className="replies">
      {comment.replies.map((r) => (
        <Comment
          key={r.id}
          comment={r}
          depth={depth + 1}
          onReply={onReply}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
~~~

\`key={r.id}\` keeps each comment's local state attached to the right comment when a sibling is added or removed; an index key would move an open reply box to the wrong comment after a delete ([the key prop](/interview-question/what-is-the-purpose-of-the-key-prop-when-rendering-lists-in-react)).

### Step 3: Local collapse and reply state

~~~jsx
export default function Comment({ comment, depth, onReply, onDelete }) {
  const [collapsed, setCollapsed] = useState(false);
  const [replying, setReplying] = useState(false);
  const hidden = countAll(comment.replies);
~~~

The toggle is a real \`<button>\` with \`aria-expanded\` and an \`aria-label\` such as "Collapse thread by Asha". When collapsed, the text, actions and replies disappear and "6 replies hidden" appears.

### Step 4: The reply box

~~~jsx
function submit(e) {
  e?.preventDefault();
  if (!text.trim()) return;
  onSubmit(text.trim());
  setText("");
}
~~~

📌 **Interview term: Controlled textarea** — the textarea's value comes from state and every keystroke goes through \`onChange\`, so the component can trim, validate and clear it. Post is \`disabled={!text.trim()}\`, so whitespace-only replies cannot be sent. Ctrl+Enter or Cmd+Enter submits; Escape cancels.

## 5. Verified

Mounted in jsdom like the playground. The driver clicked buttons, typed with real \`input\` events and pressed keys. In the dump, each dot is one level of depth. Unedited output:

~~~text
[react] RENDERED: 6 commentsComment[-]AshaShould the explorer load folders lazily?ReplyDelete[-]BenYes, fetch children on first expand.ReplyDelete[-]AshaAnd cache them per folder id.ReplyDelete[-]ChenShow a spinner row while loading.ReplyDelete[-]DanaOnly for very large trees.ReplyDelete[-]EliShip the eager version first.ReplyDelete
[react] 6 comments: Asha: Should the explorer load folders lazily? | .Ben: Yes, fetch children on first expand. | ..Asha: And cache them per folder id. | ..Chen: Show a spinner row while loading. | .Dana: Only for very large trees. | Eli: Ship the eager version first.
[react] reply box: Reply to Ben | focused: true | Post disabled: true
[react] whitespace only -> Post disabled: true
[react] after Post: 7 comments | Reply posted | box closed: true
[react]    Asha: Should the explorer load folders lazily? | .Ben: Yes, fetch children on first expand. | ..Asha: And cache them per folder id. | ..Chen: Show a spinner row while loading. | ..You: Agreed, cache by id. | .Dana: Only for very large trees. | Eli: Ship the eager version first.
[react] Ctrl+Enter on a depth-2 reply: 8 comments | deepest depth: 3
[react] Escape closes the box: true
[react] collapse c1: false | Expand thread by Asha | 6 replies hidden
[react]    Asha: (collapsed) | Eli: Ship the eager version first.
[react] expand c1: true | rows: 8
[react] delete c2: Deleted a comment and 4 replies | 3 comments
[react]    Asha: Should the explorer load folders lazily? | .Dana: Only for very large trees. | Eli: Ship the eager version first.
[react] top-level: Comment posted | 4 comments | last: You: New top-level thread
~~~

It shows: the reply box opens focused with a label naming the parent and a disabled Post; whitespace keeps Post disabled; posting adds "You" under Ben at depth 2 and closes the box; Ctrl+Enter posts a depth-3 reply; Escape closes a box; collapsing Asha hides 6 replies and flips \`aria-expanded\` and the label; deleting Ben's comment removes it and its 4 replies (8 to 3 comments); a top-level comment is appended. No \`console.error\`.

## 6. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Empty or whitespace reply | Post disabled; submit ignores it |
| Delete a comment with an open reply box below | The whole subtree unmounts, including the box |
| Collapse with an open reply box | The box unmounts with the thread; it comes back open on expand, but its draft text is lost (keep drafts in the parent to preserve them) |
| Very long words | \`overflow-wrap: anywhere\` keeps the column width |
| Screen readers | \`article\` labelled "Comment by X", toggle with \`aria-expanded\`, labelled textareas, \`role="status"\` for Posted / Deleted |

## 7. Common Pitfalls

- **Index keys.** Deleting a comment shifts indexes and moves another comment's open reply box or collapsed state.
- **Mutating \`comment.replies.push(...)\` in React.** The reference does not change, so nothing re-renders, or worse, it re-renders later with surprising data.
- **Storing \`collapsed\` in the data.** Saving or refetching then changes what users see; it is per-viewer UI state.
- **One global "replyingTo" without thinking about it.** Fine if you want one box at a time, but say so; local state allows several drafts.
- **Counting hidden replies as \`replies.length\`.** That is only the direct children; count the subtree.
- **A \`div\` with \`onClick\` as the toggle.** Not focusable, not announced; use a \`button\`.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Data:</strong> <span style="color:#f0e2c8;">"Each comment is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ id, author, text, replies }</code>, so the whole section is a tree; I keep it in the App with small immutable helpers by id."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Recursion:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Comment</code> component renders the comment and maps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">replies</code> to more <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Comment</code>s with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key={id}</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">depth + 1</code>; no replies or collapsed is the base case."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. UI state:</strong> <span style="color:#f0e2c8;">"Collapsed and replying are UI state, so they live in each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Comment</code>; the App only owns the data and passes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onReply</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onDelete</code> down."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Actions:</strong> <span style="color:#f0e2c8;">"Reply appends to the parent's replies, delete filters the comment out, which removes its subtree, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">countAll</code> gives the totals."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Accessibility:</strong> <span style="color:#f0e2c8;">"Real buttons with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-expanded</code>, labelled textareas, Post disabled for blank text, Ctrl+Enter to post, Escape to cancel, and a live status."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you cap the depth?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">depth</code> down, and past a limit either stop indenting or render a "Continue this thread" link that shows the subtree on its own, like the advanced version.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you load replies lazily?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">replyCount</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">replies: null</code> for unloaded threads, show "Load 5 replies", fetch on click and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">updateTree</code> that comment with the result.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you keep a placeholder on delete?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For comments with replies, often yes: replace author and text with "[deleted]" and keep the replies, so other people's answers survive. Only leaves are removed outright.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this perform with 5,000 comments?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each change re-renders the path and, without memo, the whole list. Wrap <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Comment</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">React.memo</code> and give it stable handlers with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useCallback</code>; the immutable helpers already keep untouched comments referentially equal, so only the changed path re-renders. Collapse deep threads by default.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Testing Library: click Reply on a comment, type, click Post, assert the new reply is inside that comment's list; click the toggle and assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-expanded</code> and the hidden note. Unit-test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">addReply</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">removeComment</code>.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Recursive component | Renders itself for each child |
| UI state vs data state | Screen-only flags vs saved content |
| Immutable tree update | New objects only along the changed path |
| Controlled textarea | Value from state, changes through a handler |
| \`aria-expanded\` | Says whether a toggle's region is open |

---

**Conclusion:** Nested comments are one recursive component over a \`{ replies: [] }\` tree, immutable helpers by id for reply and delete, and per-comment UI state for collapse and reply. Use id keys, count subtrees for the totals, and keep the controls real buttons. Voting, sorting and depth limits build on exactly this structure.`,
        files: {
          "/App.js": `import { useState } from "react";
import Comment from "./src/Comment";
import ReplyBox from "./src/ReplyBox";
import {
  initialComments,
  makeId,
  addReply,
  removeComment,
  countAll,
} from "./src/comments";

export default function App() {
  const [comments, setComments] = useState(initialComments);
  const [status, setStatus] = useState("");

  function reply(parentId, text) {
    const comment = { id: makeId(), author: "You", text, replies: [] };
    setComments((list) => addReply(list, parentId, comment));
    setStatus(parentId ? "Reply posted" : "Comment posted");
  }

  function remove(comment) {
    const inside = countAll(comment.replies);
    setComments((list) => removeComment(list, comment.id));
    setStatus(
      "Deleted a comment" +
        (inside
          ? " and " + inside + (inside === 1 ? " reply" : " replies")
          : ""),
    );
  }

  const total = countAll(comments);
  return (
    <div className="app">
      <h1 data-testid="count">
        {total} {total === 1 ? "comment" : "comments"}
      </h1>
      <ReplyBox
        label="Add a comment"
        submitLabel="Comment"
        autoFocus={false}
        onSubmit={(t) => reply(null, t)}
      />
      <ul className="thread">
        {comments.map((c) => (
          <Comment
            key={c.id}
            comment={c}
            depth={0}
            onReply={reply}
            onDelete={remove}
          />
        ))}
      </ul>
      <p className="status" role="status" data-testid="status">
        {status}
      </p>
    </div>
  );
}
`,
          "/src/Comment.js": `import { useState } from "react";
import ReplyBox from "./ReplyBox";
import { countAll } from "./comments";

// Recursive: a comment renders its replies with this same component.
// "collapsed" and "replying" are UI state, so they live here, not in the data.
export default function Comment({ comment, depth, onReply, onDelete }) {
  const [collapsed, setCollapsed] = useState(false);
  const [replying, setReplying] = useState(false);
  const hidden = countAll(comment.replies);

  return (
    <li className="comment" data-id={comment.id} data-depth={depth}>
      <article aria-label={"Comment by " + comment.author}>
        <header>
          <button
            className="toggle"
            aria-expanded={!collapsed}
            data-testid="toggle"
            aria-label={
              (collapsed ? "Expand" : "Collapse") +
              " thread by " +
              comment.author
            }
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? "[+]" : "[-]"}
          </button>
          <strong>{comment.author}</strong>
        </header>
        {!collapsed && <p className="text">{comment.text}</p>}
        {!collapsed && (
          <div className="actions">
            <button data-testid="reply" onClick={() => setReplying(true)}>
              Reply
            </button>
            <button data-testid="delete" onClick={() => onDelete(comment)}>
              Delete
            </button>
          </div>
        )}
        {replying && !collapsed && (
          <ReplyBox
            label={"Reply to " + comment.author}
            onSubmit={(text) => {
              onReply(comment.id, text);
              setReplying(false);
            }}
            onCancel={() => setReplying(false)}
          />
        )}
        {collapsed && hidden > 0 && (
          <p className="hidden-note">
            {hidden} {hidden === 1 ? "reply" : "replies"} hidden
          </p>
        )}
      </article>
      {!collapsed && comment.replies.length > 0 && (
        <ul className="replies">
          {comment.replies.map((r) => (
            <Comment
              key={r.id}
              comment={r}
              depth={depth + 1}
              onReply={onReply}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
`,
          "/src/comments.js": `// Comments are a NESTED tree: { id, author, text, replies: [...] }.
// The helpers return new arrays and copy only
// the comments on the path to the change.

let nextId = 100;
export const makeId = () => "c" + nextId++;

export const initialComments = [
  {
    id: "c1",
    author: "Asha",
    text: "Should the explorer load folders lazily?",
    replies: [
      {
        id: "c2",
        author: "Ben",
        text: "Yes, fetch children on first expand.",
        replies: [
          {
            id: "c3",
            author: "Asha",
            text: "And cache them per folder id.",
            replies: [],
          },
          {
            id: "c4",
            author: "Chen",
            text: "Show a spinner row while loading.",
            replies: [],
          },
        ],
      },
      {
        id: "c5",
        author: "Dana",
        text: "Only for very large trees.",
        replies: [],
      },
    ],
  },
  {
    id: "c6",
    author: "Eli",
    text: "Ship the eager version first.",
    replies: [],
  },
];

export function addReply(list, parentId, comment) {
  if (parentId === null) return [...list, comment];
  return list.map((c) => {
    if (c.id === parentId) return { ...c, replies: [...c.replies, comment] };
    const replies = addReply(c.replies, parentId, comment);
    return replies === c.replies ? c : { ...c, replies };
  });
}

// Removes the comment AND everything under it.
export function removeComment(list, id) {
  if (list.some((c) => c.id === id)) return list.filter((c) => c.id !== id);
  let changed = false;
  const next = list.map((c) => {
    const replies = removeComment(c.replies, id);
    if (replies === c.replies) return c;
    changed = true;
    return { ...c, replies };
  });
  return changed ? next : list;
}

export const countAll = (list) =>
  list.reduce((n, c) => n + 1 + countAll(c.replies), 0);
`,
          "/src/ReplyBox.js": `import { useEffect, useRef, useState } from "react";

// Controlled textarea. Ctrl+Enter (or Cmd+Enter) posts, Escape cancels.
export default function ReplyBox({
  label,
  submitLabel = "Post",
  onSubmit,
  onCancel,
  autoFocus = true,
}) {
  const [text, setText] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    if (autoFocus) ref.current.focus();
  }, [autoFocus]);

  function submit(e) {
    e?.preventDefault();
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText("");
  }

  return (
    <form className="reply-box" onSubmit={submit}>
      <textarea
        ref={ref}
        aria-label={label}
        data-testid="reply-text"
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit(e);
          if (e.key === "Escape" && onCancel) onCancel();
        }}
      />
      <div className="reply-actions">
        <button type="submit" data-testid="post" disabled={!text.trim()}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
`,
          "/styles.css": `body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.app {
  max-width: 560px;
  margin: 0 auto;
  padding: 16px;
}
h1 {
  font-size: 18px;
  margin: 0 0 12px;
}
button {
  background: #1d2230;
  color: #e6e6e6;
  border: 1px solid #343b4f;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
}
button:disabled {
  opacity: 0.45;
  cursor: default;
}
.thread,
.replies {
  list-style: none;
  margin: 0;
  padding: 0;
}
.replies {
  margin-left: 10px;
  padding-left: 14px;
  border-left: 2px solid #262c3b;
}
.comment article {
  padding: 8px 0;
}
.comment header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.toggle {
  border: none;
  background: none;
  color: #8a93a8;
  padding: 0 2px;
  font-family: monospace;
}
.text {
  margin: 4px 0 6px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.actions {
  display: flex;
  gap: 6px;
}
.hidden-note {
  margin: 4px 0;
  color: #8a93a8;
  font-size: 13px;
  font-style: italic;
}
.reply-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 8px 0;
}
.reply-box textarea {
  background: #161a23;
  color: #e6e6e6;
  border: 1px solid #343b4f;
  border-radius: 6px;
  padding: 8px;
  font: inherit;
  resize: vertical;
}
.reply-actions {
  display: flex;
  gap: 6px;
}
.status {
  min-height: 1.2em;
  color: #9aa3b5;
  font-size: 13px;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Vue 3 developers who know \`<script setup>\` and want a clean recursive comments widget.
**Difficulty:** Medium

> **How to read this doc:** Plain words first, then a <code>📌 Interview term:</code> tag. Code is from the runnable Vue solution; the Verified section quotes its output on Vue 3.5.44. Voting, sorting and depth limits are in the sibling [Nested Comments with Collapsible Threads & Voting](/interview-question/build-nested-comments-with-collapsible-threads-voting).

## 1. Why This Even Matters — A Story First

Replies to replies form a family tree: you never know how deep a conversation goes. Every comment is "text plus a list of comments", so one component that shows a comment and then itself for each reply covers any depth. Vue makes the data side easy, because a reply is just a \`push\` into a reactive array.

## 2. Requirements and Plan

Recursive render with indentation and thread line; inline reply with disabled Post for blank text, Ctrl/Cmd+Enter to post, Escape to cancel; collapse with a hidden count; delete a subtree; a top-level form; a total count.

| Piece | Vue tool |
| :--- | :--- |
| \`comments\` | \`reactive(createComments())\`, mutated in place |
| \`total\` | \`computed(() => countAll(comments))\` |
| \`reply\`, \`remove\` | functions in \`App.vue\`, shared with \`provide('thread', ...)\` |
| \`collapsed\`, \`replying\` | local \`ref\`s in each \`Comment.vue\` |
| \`ReplyBox.vue\` | \`v-model\` on a textarea, emits \`submit\` and \`cancel\` |

📌 **Interview term: UI state vs data state** — the comments are data; whether a thread is collapsed or a box is open is UI state, so it lives inside the component that shows it.

## 3. Build It Step by Step

### Step 1: In-place updates

~~~js
function reply(parentId, text) {
  const comment = { id: makeId(), author: "You", text, replies: [] };
  (parentId ? findById(comments, parentId).replies : comments).push(
    comment,
  );
  status.value = parentId ? "Reply posted" : "Comment posted";
}

function remove(comment) {
  const inside = countAll(comment.replies);
  const siblings = findSiblings(comments, comment.id);
  siblings.splice(
    siblings.findIndex((c) => c.id === comment.id),
    1,
  );
  status.value =
    "Deleted a comment" +
    (inside
      ? " and " + inside + (inside === 1 ? " reply" : " replies")
      : "");
}
~~~

📌 **Interview term: Deep reactivity** — \`reactive()\` tracks nested arrays, so \`push\` and \`splice\` anywhere in the tree re-render the affected comments without copying (see [ref vs reactive](/interview-question/what-is-the-difference-between-ref-and-reactive)). \`splice\` on the siblings array removes the comment and, with it, its replies.

### Step 2: The recursive SFC

~~~vue
<ul v-if="!collapsed && comment.replies.length" class="replies">
  <Comment
    v-for="r in comment.replies"
    :key="r.id"
    :comment="r"
    :depth="depth + 1"
  />
</ul>
~~~

📌 **Interview term: Recursive component** — \`Comment.vue\` uses \`<Comment>\` in its own template; \`<script setup>\` resolves the name from the file. The \`:key\` by id keeps each comment's local \`collapsed\` and \`replying\` refs with the right comment after a delete ([:key in v-for](/interview-question/why-is-the-key-attribute-important-in-v-for)).

### Step 3: Actions without prop drilling

\`App.vue\` calls \`provide('thread', { reply, remove })\` and each \`Comment\` calls \`inject('thread')\`, so a reply five levels deep calls the same functions without five levels of props or re-emitted events ([provide and inject](/interview-question/what-are-provide-and-inject)).

### Step 4: Key modifiers on the reply box

~~~vue
<textarea
  ref="box"
  v-model="text"
  :aria-label="label"
  data-testid="reply-text"
  rows="2"
  @keydown.ctrl.enter.prevent="submit"
  @keydown.meta.enter.prevent="submit"
  @keydown.escape="cancellable && emit('cancel')"
></textarea>
~~~

\`.ctrl.enter\` and \`.meta.enter\` cover Windows/Linux and macOS; \`v-model\` keeps the text in a local ref; Post is \`:disabled="!text.trim()"\`.

## 4. Verified

Mounted with \`createApp(App).mount("#app")\` in jsdom and driven by the shared driver; each dot is one level. Unedited output:

~~~text
[vue] RENDERED: 6 commentsComment[-]AshaShould the explorer load folders lazily?ReplyDelete[-]BenYes, fetch children on first expand.ReplyDelete[-]AshaAnd cache them per folder id.ReplyDelete[-]ChenShow a spinner row while loading.ReplyDelete[-]DanaOnly for very large trees.ReplyDelete[-]EliShip the eager version first.ReplyDelete
[vue] 6 comments: Asha: Should the explorer load folders lazily? | .Ben: Yes, fetch children on first expand. | ..Asha: And cache them per folder id. | ..Chen: Show a spinner row while loading. | .Dana: Only for very large trees. | Eli: Ship the eager version first.
[vue] reply box: Reply to Ben | focused: true | Post disabled: true
[vue] whitespace only -> Post disabled: true
[vue] after Post: 7 comments | Reply posted | box closed: true
[vue]    Asha: Should the explorer load folders lazily? | .Ben: Yes, fetch children on first expand. | ..Asha: And cache them per folder id. | ..Chen: Show a spinner row while loading. | ..You: Agreed, cache by id. | .Dana: Only for very large trees. | Eli: Ship the eager version first.
[vue] Ctrl+Enter on a depth-2 reply: 8 comments | deepest depth: 3
[vue] Escape closes the box: true
[vue] collapse c1: false | Expand thread by Asha | 6 replies hidden
[vue]    Asha: (collapsed) | Eli: Ship the eager version first.
[vue] expand c1: true | rows: 8
[vue] delete c2: Deleted a comment and 4 replies | 3 comments
[vue]    Asha: Should the explorer load folders lazily? | .Dana: Only for very large trees. | Eli: Ship the eager version first.
[vue] top-level: Comment posted | 4 comments | last: You: New top-level thread
~~~

Identical to React and Angular: focused, labelled reply box with Post disabled for blank text, a depth-2 and a depth-3 reply, Escape closing a box, collapse hiding 6 replies with updated \`aria-expanded\`, delete removing a comment and its 4 replies, and a new top-level thread. No \`console.error\`.

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Blank reply | Post disabled |
| Collapse with an open box | Box unmounts; draft text is lost (keep drafts in the parent to keep them) |
| Delete with open boxes below | Subtree unmounts |
| Screen readers | \`article\` labels, \`aria-expanded\` as \`"true"\` / \`"false"\`, labelled textareas, \`role="status"\` |

## 6. Common Pitfalls

- **Index keys.** After a delete, local \`collapsed\` and \`replying\` refs attach to the wrong comment.
- **Pushing into \`props.comment.replies\` from the child.** It works, because the object is reactive, but it hides who owns the data and Vue does not warn about nested prop mutation. Call the injected \`reply\` instead.
- **Putting \`collapsed\` in the reactive data.** It would be saved and shared with every viewer.
- **\`@keydown.enter\` alone for posting.** Blocks new lines in the textarea; require Ctrl/Cmd.
- **Counting only direct replies for the hidden note.** Count the subtree.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Data:</strong> <span style="color:#f0e2c8;">"The comments are a deep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reactive</code> tree of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ id, author, text, replies }</code>; reply is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code>, delete a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">splice</code>, and the count is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Recursion:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Comment.vue</code> renders itself for each reply with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:key</code> by id; no replies, or collapsed, ends the recursion."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Sharing:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reply</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remove</code> are provided once and injected at any depth, so no event chain is needed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. UI state:</strong> <span style="color:#f0e2c8;">"Collapsed and replying are local refs per comment; the reply box is its own component with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code> and key modifiers."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Accessibility:</strong> <span style="color:#f0e2c8;">"Real buttons with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-expanded</code>, labelled textareas, Post disabled for blank text, and a live status."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why provide/inject instead of emits?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With emits every level must re-emit its children's events. One injected object reaches any depth directly, and the component stays easy to read.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you cap the depth?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">depth</code>, stop rendering children past a limit, and show a "Continue this thread" button that renders that subtree as the new root.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you keep drafts when collapsing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store drafts in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reactive</code> map keyed by comment id in the parent, and pass the current draft into the reply box with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mount, click Reply, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setValue</code> on the textarea, click Post, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await nextTick()</code>, and assert the new comment is inside the parent's list.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Recursive component | Renders itself for children |
| Deep reactivity | Nested mutations are tracked |
| provide / inject | Values reach any descendant without props |
| UI state vs data state | Screen flags vs saved content |

---

**Conclusion:** In Vue, nested comments are a self-referencing SFC over a deep reactive tree, in-place \`push\` and \`splice\` for reply and delete, provided actions for any depth, and local refs for collapse and reply. Keep keys stable and counts recursive.`,
        files: {
          "/src/App.vue": `<script setup>
import { computed, provide, reactive, ref } from "vue";
import Comment from "./components/Comment.vue";
import ReplyBox from "./components/ReplyBox.vue";
import { createComments, makeId, findSiblings, countAll } from "./comments.js";

const comments = reactive(createComments());
const status = ref("");
const total = computed(() => countAll(comments));

function findById(list, id) {
  for (const c of list) {
    if (c.id === id) return c;
    const hit = findById(c.replies, id);
    if (hit) return hit;
  }
  return null;
}

function reply(parentId, text) {
  const comment = { id: makeId(), author: "You", text, replies: [] };
  (parentId ? findById(comments, parentId).replies : comments).push(comment);
  status.value = parentId ? "Reply posted" : "Comment posted";
}

function remove(comment) {
  const inside = countAll(comment.replies);
  const siblings = findSiblings(comments, comment.id);
  siblings.splice(
    siblings.findIndex((c) => c.id === comment.id),
    1,
  );
  status.value =
    "Deleted a comment" +
    (inside ? " and " + inside + (inside === 1 ? " reply" : " replies") : "");
}

// Every Comment, however deep, gets the same two actions without prop drilling.
provide("thread", { reply, remove });
</script>

<template>
  <div class="app">
    <h1 data-testid="count">{{ total }} {{ total === 1 ? 'comment' : 'comments' }}</h1>
    <ReplyBox label="Add a comment" submit-label="Comment" :cancellable="false" :auto-focus="false"
      @submit="(t) => reply(null, t)" />
    <ul class="thread">
      <Comment v-for="c in comments" :key="c.id" :comment="c" :depth="0" />
    </ul>
    <p class="status" role="status" data-testid="status">{{ status }}</p>
  </div>
</template>

<style>
body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.app {
  max-width: 560px;
  margin: 0 auto;
  padding: 16px;
}
h1 {
  font-size: 18px;
  margin: 0 0 12px;
}
button {
  background: #1d2230;
  color: #e6e6e6;
  border: 1px solid #343b4f;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
}
button:disabled {
  opacity: 0.45;
  cursor: default;
}
.thread,
.replies {
  list-style: none;
  margin: 0;
  padding: 0;
}
.replies {
  margin-left: 10px;
  padding-left: 14px;
  border-left: 2px solid #262c3b;
}
.comment article {
  padding: 8px 0;
}
.comment header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.toggle {
  border: none;
  background: none;
  color: #8a93a8;
  padding: 0 2px;
  font-family: monospace;
}
.text {
  margin: 4px 0 6px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.actions {
  display: flex;
  gap: 6px;
}
.hidden-note {
  margin: 4px 0;
  color: #8a93a8;
  font-size: 13px;
  font-style: italic;
}
.reply-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 8px 0;
}
.reply-box textarea {
  background: #161a23;
  color: #e6e6e6;
  border: 1px solid #343b4f;
  border-radius: 6px;
  padding: 8px;
  font: inherit;
  resize: vertical;
}
.reply-actions {
  display: flex;
  gap: 6px;
}
.status {
  min-height: 1.2em;
  color: #9aa3b5;
  font-size: 13px;
}
</style>
`,
          "/src/comments.js": `// Comments are a NESTED tree: { id, author, text, replies: [...] }.
// App.vue keeps it in reactive(), so replies are pushed and spliced in place.

let nextId = 100;
export const makeId = () => "c" + nextId++;

export const createComments = () => [
  {
    id: "c1",
    author: "Asha",
    text: "Should the explorer load folders lazily?",
    replies: [
      {
        id: "c2",
        author: "Ben",
        text: "Yes, fetch children on first expand.",
        replies: [
          {
            id: "c3",
            author: "Asha",
            text: "And cache them per folder id.",
            replies: [],
          },
          {
            id: "c4",
            author: "Chen",
            text: "Show a spinner row while loading.",
            replies: [],
          },
        ],
      },
      {
        id: "c5",
        author: "Dana",
        text: "Only for very large trees.",
        replies: [],
      },
    ],
  },
  {
    id: "c6",
    author: "Eli",
    text: "Ship the eager version first.",
    replies: [],
  },
];

// The array that holds comment \`id\` (its siblings), or null.
export function findSiblings(list, id) {
  if (list.some((c) => c.id === id)) return list;
  for (const c of list) {
    const hit = findSiblings(c.replies, id);
    if (hit) return hit;
  }
  return null;
}

export const countAll = (list) =>
  list.reduce((n, c) => n + 1 + countAll(c.replies), 0);
`,
          "/src/components/Comment.vue": `<script setup>
import { computed, inject, ref } from "vue";
import ReplyBox from "./ReplyBox.vue";
import { countAll } from "../comments.js";

const props = defineProps({
  comment: { type: Object, required: true },
  depth: { type: Number, default: 0 },
});
const thread = inject("thread"); // { reply(parentId, text), remove(comment) }

// UI-only state, local to this comment.
const collapsed = ref(false);
const replying = ref(false);
const hidden = computed(() => countAll(props.comment.replies));

function post(text) {
  thread.reply(props.comment.id, text);
  replying.value = false;
}
</script>

<template>
  <li class="comment" :data-id="comment.id" :data-depth="depth">
    <article :aria-label="'Comment by ' + comment.author">
      <header>
        <button class="toggle" data-testid="toggle" :aria-expanded="String(!collapsed)"
          :aria-label="(collapsed ? 'Expand' : 'Collapse') + ' thread by ' + comment.author"
          @click="collapsed = !collapsed">{{ collapsed ? '[+]' : '[-]' }}</button>
        <strong>{{ comment.author }}</strong>
      </header>
      <template v-if="!collapsed">
        <p class="text">{{ comment.text }}</p>
        <div class="actions">
          <button data-testid="reply" @click="replying = true">Reply</button>
          <button
            data-testid="delete"
            @click="thread.remove(comment)"
          >Delete</button>
        </div>
        <ReplyBox
          v-if="replying"
          :label="'Reply to ' + comment.author"
          @submit="post"
          @cancel="replying = false"
        />
      </template>
      <p
        v-else-if="hidden"
        class="hidden-note"
      >{{ hidden }} {{ hidden === 1 ? 'reply' : 'replies' }} hidden</p>
    </article>
    <ul v-if="!collapsed && comment.replies.length" class="replies">
      <Comment
        v-for="r in comment.replies"
        :key="r.id"
        :comment="r"
        :depth="depth + 1"
      />
    </ul>
  </li>
</template>
`,
          "/src/components/ReplyBox.vue": `<script setup>
import { onMounted, ref } from "vue";

const props = defineProps({
  label: { type: String, required: true },
  submitLabel: { type: String, default: "Post" },
  cancellable: { type: Boolean, default: true },
  autoFocus: { type: Boolean, default: true },
});
const emit = defineEmits(["submit", "cancel"]);
const text = ref("");
const box = ref(null);
onMounted(() => {
  if (props.autoFocus) box.value.focus();
});

function submit() {
  const t = text.value.trim();
  if (!t) return;
  emit("submit", t);
  text.value = "";
}
</script>

<template>
  <form class="reply-box" @submit.prevent="submit">
    <!-- key modifiers: .ctrl.enter and .meta.enter post, .escape cancels -->
    <textarea ref="box" v-model="text" :aria-label="label" data-testid="reply-text" rows="2"
      @keydown.ctrl.enter.prevent="submit" @keydown.meta.enter.prevent="submit"
      @keydown.escape="cancellable && emit('cancel')"></textarea>
    <div class="reply-actions">
      <button
        type="submit"
        data-testid="post"
        :disabled="!text.trim()"
      >{{ submitLabel }}</button>
      <button
        v-if="cancellable"
        type="button"
        @click="emit('cancel')"
      >Cancel</button>
    </div>
  </form>
</template>
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Angular developers who know standalone components and signals and want a clean recursive comments widget.
**Difficulty:** Medium

> **How to read this doc:** Plain words first, then a <code>📌 Interview term:</code> tag. Code is from the runnable Angular solution, verified on Angular 22.2.3 in AOT and in the playground JIT. Voting and sorting are in [Nested Comments with Collapsible Threads & Voting](/interview-question/build-nested-comments-with-collapsible-threads-voting).

## 1. Why This Even Matters — A Story First

A conversation where people reply to replies is a family tree of unknown depth. Each comment is "text plus a list of comments", so one component that shows a comment and then itself for each reply handles any depth. In Angular the interesting parts are a component that is its own \`<li>\`, a signal store shared by every level, and local signals for UI state.

## 2. Requirements and Plan

Recursive render, inline reply (blank disabled, Ctrl/Cmd+Enter, Escape), collapse with hidden count, delete a subtree, top-level form, total count.

| Piece | Angular tool |
| :--- | :--- |
| \`comments\`, \`status\`, \`total\` | \`signal\` and \`computed\` in \`CommentStore\`, provided on \`AppComponent\` |
| \`collapsed\`, \`replying\` | local \`signal\`s in each \`CommentComponent\` |
| \`CommentComponent\` | \`li[app-comment]\`, recursive, \`@Input() comment\`, \`@Input() depth\` |
| \`ReplyBoxComponent\` | \`@Output() posted\`, \`@Output() cancel\`, key event bindings |

📌 **Interview term: UI state vs data state** — comments are data and live in the store; collapsed and replying are UI state and live in the comment component.

## 3. Build It Step by Step

### Step 1: The store

~~~ts
export class CommentStore {
  readonly comments = signal<CommentNode[]>(initialComments);
  readonly status = signal("");
  readonly total = computed(() => countAll(this.comments()));

  reply(parentId: string | null, text: string) {
    const comment: CommentNode = {
      id: makeId(),
      author: "You",
      text,
      replies: [],
    };
    this.comments.update((list) => addReply(list, parentId, comment));
    this.status.set(parentId ? "Reply posted" : "Comment posted");
  }

  remove(comment: CommentNode) {
    const inside = countAll(comment.replies);
    this.comments.update((list) => removeComment(list, comment.id));
    this.status.set(
      "Deleted a comment" +
        (inside
          ? " and " + inside + (inside === 1 ? " reply" : " replies")
          : ""),
    );
  }
}
~~~

📌 **Interview term: Immutable tree update** — \`addReply\` and \`removeComment\` return a new array with new objects only along the path to the change, so the signal sees a new reference and untouched comments keep their identity.

### Step 2: The recursive comment

~~~ts
@if (!collapsed() && comment.replies.length) {
  <ul class="replies">
    @for (r of comment.replies; track r.id) {
      <li app-comment [comment]="r" [depth]="depth + 1"></li>
    }
  </ul>
}
~~~

The selector \`li[app-comment]\` makes the \`<li>\` itself the component host, so the list markup stays \`ul > li\`. The component lists itself in \`imports\` via \`forwardRef\`, which the playground JIT needs for recursion. \`track r.id\` keeps each comment's local signals attached to the right comment after a delete ([why @for needs track](/interview-question/why-does-for-require-track-and-how-does-empty-improve-ux)).

### Step 3: Key event bindings

~~~ts
<textarea
  #box
  [attr.aria-label]="label"
  data-testid="reply-text"
  rows="2"
  [value]="text()"
  (input)="text.set(box.value)"
  (keydown.control.enter)="$event.preventDefault(); submit()"
  (keydown.meta.enter)="$event.preventDefault(); submit()"
  (keydown.escape)="cancellable && cancel.emit()"
></textarea>
~~~

Angular's key event syntax filters by key and modifiers: \`(keydown.control.enter)\` and \`(keydown.meta.enter)\` post, \`(keydown.escape)\` cancels. The output is named \`posted\`, not \`submit\`, because an output called \`submit\` would collide with the native \`submit\` event bubbling from the inner form, and the parent's handler would also run with the DOM event. A probe with an \`@Output() submit\` on a component wrapping a form, bound as \`(submit)="got($event)"\`, logged two calls for one click in both AOT and JIT:

~~~text
[angular:app] parent handler calls: output:text, dom:submit
~~~

### Step 4: Local UI state

\`collapsed = signal(false)\` and \`replying = signal(false)\` live in \`CommentComponent\`. The hidden count is a getter, \`countAll(this.comment.replies)\`, because it depends on the \`@Input\`.

## 4. Verified

Run in AOT with strict templates and in the runtime JIT, both booted with no providers; both printed the same lines. JIT shown, unedited:

~~~text
[angular:playground] RENDERED: 6 commentsComment[-]AshaShould the explorer load folders lazily?ReplyDelete[-]BenYes, fetch children on first expand.ReplyDelete[-]AshaAnd cache them per folder id.ReplyDelete[-]ChenShow a spinner row while loading.ReplyDelete[-]DanaOnly for very large trees.ReplyDelete[-]EliShip the eager version first.ReplyDelete
[angular:playground] 6 comments: Asha: Should the explorer load folders lazily? | .Ben: Yes, fetch children on first expand. | ..Asha: And cache them per folder id. | ..Chen: Show a spinner row while loading. | .Dana: Only for very large trees. | Eli: Ship the eager version first.
[angular:playground] reply box: Reply to Ben | focused: true | Post disabled: true
[angular:playground] whitespace only -> Post disabled: true
[angular:playground] after Post: 7 comments | Reply posted | box closed: true
[angular:playground]    Asha: Should the explorer load folders lazily? | .Ben: Yes, fetch children on first expand. | ..Asha: And cache them per folder id. | ..Chen: Show a spinner row while loading. | ..You: Agreed, cache by id. | .Dana: Only for very large trees. | Eli: Ship the eager version first.
[angular:playground] Ctrl+Enter on a depth-2 reply: 8 comments | deepest depth: 3
[angular:playground] Escape closes the box: true
[angular:playground] collapse c1: false | Expand thread by Asha | 6 replies hidden
[angular:playground]    Asha: (collapsed) | Eli: Ship the eager version first.
[angular:playground] expand c1: true | rows: 8
[angular:playground] delete c2: Deleted a comment and 4 replies | 3 comments
[angular:playground]    Asha: Should the explorer load folders lazily? | .Dana: Only for very large trees. | Eli: Ship the eager version first.
[angular:playground] top-level: Comment posted | 4 comments | last: You: New top-level thread
~~~

Identical to React and Vue: labelled, focused box with Post disabled for blank text, depth-2 and depth-3 replies, Escape closing a box, collapse hiding 6 replies, delete removing a comment and its 4 replies, and a new thread. No \`console.error\` in either mode.

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Blank reply | \`[disabled]="!text().trim()"\` |
| Collapse with an open box | The box is destroyed; its draft is lost |
| Delete | The subtree's components are destroyed |
| Screen readers | \`article\` labels, \`[attr.aria-expanded]\`, labelled textareas, \`role="status"\` |

## 6. Common Pitfalls

- **An \`@Output()\` named like a DOM event** (\`submit\`, \`click\`). Native events bubbling from inside also trigger the parent binding.
- **Mutating \`comment.replies\` in place.** The signal does not change, so nothing re-renders.
- **\`track $index\`.** Local signals move to the wrong comment after a delete.
- **Recursive component without the self-import.** \`NG0303\` in the playground JIT.
- **A \`click\` handler on a \`span\` for collapse.** Not focusable; use a \`button\` with \`aria-expanded\`.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Data:</strong> <span style="color:#f0e2c8;">"The comment tree is a signal in a component-scoped store with immutable helpers by id, and the total is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Recursion:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">li[app-comment]</code> renders itself with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@for</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">track r.id</code>, and imports itself through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">forwardRef</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. UI state:</strong> <span style="color:#f0e2c8;">"Collapsed and replying are local signals in each comment; only data goes through the store."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Reply box:</strong> <span style="color:#f0e2c8;">"A small component with key event bindings for Ctrl/Cmd+Enter and Escape, an output named <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">posted</code> to avoid the native submit event, and Post disabled for blank text."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Accessibility:</strong> <span style="color:#f0e2c8;">"Real buttons with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-expanded</code>, labelled textareas, and a live status line."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a store instead of outputs up the tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Outputs would have to be re-emitted at every level. Injecting one store gives every depth the same actions, and providing it on the root component scopes it per widget.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you cap depth?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">depth</code> and, past a limit, render a "Continue this thread" button that sets a signal for the subtree root.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you load replies lazily?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">replyCount</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">replies</code> empty, fetch on click, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">update</code> that comment with the loaded replies.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">TestBed: click Reply, set the textarea value and dispatch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">input</code>, click Post, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await fixture.whenStable()</code>, assert the new comment inside its parent.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Recursive component | Renders itself for each child |
| UI state vs data state | Screen flags vs saved content |
| Immutable tree update | New objects only along the changed path |
| Key event binding | \`(keydown.control.enter)\` style filters |

---

**Conclusion:** In Angular, nested comments are a recursive \`li[app-comment]\` that imports itself, a component-scoped signal store with immutable helpers, local signals for collapse and reply, and a reply box with key event bindings. Name outputs so they never collide with DOM events.`,
        files: {
          "/src/app/app.component.ts": `import { Component, ViewEncapsulation, inject } from "@angular/core";
import { CommentStore } from "./comment-store";
import { CommentComponent } from "./comment.component";
import { ReplyBoxComponent } from "./reply-box.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommentComponent, ReplyBoxComponent],
  providers: [CommentStore],
  encapsulation: ViewEncapsulation.None,
  template: \`
    <div class="app">
      <h1 data-testid="count">{{ store.total() }} {{ store.total() === 1 ? 'comment' : 'comments' }}</h1>
      <app-reply-box label="Add a comment" submitLabel="Comment" [cancellable]="false" [autoFocus]="false"
        (posted)="store.reply(null, $event)" />
      <ul class="thread">
        @for (c of store.comments(); track c.id) {
          <li app-comment [comment]="c" [depth]="0"></li>
        }
      </ul>
      <p
        class="status"
        role="status"
        data-testid="status"
      >{{ store.status() }}</p>
    </div>
  \`,
  styles: [
    \`
    body { margin: 0; background: #0f1115; color: #e6e6e6; font-family: system-ui, sans-serif; }
    .app { max-width: 560px; margin: 0 auto; padding: 16px; }
    h1 { font-size: 18px; margin: 0 0 12px; }
    button { background: #1d2230; color: #e6e6e6; border: 1px solid #343b4f; border-radius: 6px; padding: 4px 10px; cursor: pointer; font: inherit; font-size: 13px; }
    button:disabled { opacity: 0.45; cursor: default; }
    .thread, .replies { list-style: none; margin: 0; padding: 0; }
    .replies { margin-left: 10px; padding-left: 14px; border-left: 2px solid #262c3b; }
    .comment article { padding: 8px 0; }
    .comment header { display: flex; align-items: center; gap: 8px; }
    .toggle { border: none; background: none; color: #8a93a8; padding: 0 2px; font-family: monospace; }
    .text { margin: 4px 0 6px; line-height: 1.4; overflow-wrap: anywhere; }
    .actions { display: flex; gap: 6px; }
    .hidden-note { margin: 4px 0; color: #8a93a8; font-size: 13px; font-style: italic; }
    .reply-box { display: flex; flex-direction: column; gap: 6px; margin: 8px 0; }
    .reply-box textarea { background: #161a23; color: #e6e6e6; border: 1px solid #343b4f; border-radius: 6px; padding: 8px; font: inherit; resize: vertical; }
    .reply-actions { display: flex; gap: 6px; }
    .status { min-height: 1.2em; color: #9aa3b5; font-size: 13px; }
  \`,
  ],
})
export class AppComponent {
  store = inject(CommentStore);
}
`,
          "/src/app/comment-store.ts": `import { Injectable, computed, signal } from "@angular/core";
import {
  CommentNode,
  initialComments,
  makeId,
  addReply,
  removeComment,
  countAll,
} from "./comments";

// Provided by AppComponent; every recursive
// CommentComponent injects the same one.
@Injectable()
export class CommentStore {
  readonly comments = signal<CommentNode[]>(initialComments);
  readonly status = signal("");
  readonly total = computed(() => countAll(this.comments()));

  reply(parentId: string | null, text: string) {
    const comment: CommentNode = {
      id: makeId(),
      author: "You",
      text,
      replies: [],
    };
    this.comments.update((list) => addReply(list, parentId, comment));
    this.status.set(parentId ? "Reply posted" : "Comment posted");
  }

  remove(comment: CommentNode) {
    const inside = countAll(comment.replies);
    this.comments.update((list) => removeComment(list, comment.id));
    this.status.set(
      "Deleted a comment" +
        (inside
          ? " and " + inside + (inside === 1 ? " reply" : " replies")
          : ""),
    );
  }
}
`,
          "/src/app/comment.component.ts": `import { Component, Input, forwardRef, inject, signal } from "@angular/core";
import { CommentStore } from "./comment-store";
import { ReplyBoxComponent } from "./reply-box.component";
import { CommentNode, countAll } from "./comments";

@Component({
  selector: "li[app-comment]",
  standalone: true,
  imports: [ReplyBoxComponent, forwardRef(() => CommentComponent)],
  host: {
    class: "comment",
    "[attr.data-id]": "comment.id",
    "[attr.data-depth]": "depth",
  },
  template: \`
    <article [attr.aria-label]="'Comment by ' + comment.author">
      <header>
        <button class="toggle" data-testid="toggle" [attr.aria-expanded]="!collapsed()"
          [attr.aria-label]="(collapsed() ? 'Expand' : 'Collapse') + ' thread by ' + comment.author"
          (click)="collapsed.set(!collapsed())">{{ collapsed() ? '[+]' : '[-]' }}</button>
        <strong>{{ comment.author }}</strong>
      </header>
      @if (!collapsed()) {
        <p class="text">{{ comment.text }}</p>
        <div class="actions">
          <button
            data-testid="reply"
            (click)="replying.set(true)"
          >Reply</button>
          <button
            data-testid="delete"
            (click)="store.remove(comment)"
          >Delete</button>
        </div>
        @if (replying()) {
          <app-reply-box
            [label]="'Reply to ' + comment.author"
            (posted)="post($event)"
            (cancel)="replying.set(false)"
          />
        }
      } @else if (hidden) {
        <p class="hidden-note">{{ hidden }} {{ hidden === 1 ? 'reply' : 'replies' }} hidden</p>
      }
    </article>
    @if (!collapsed() && comment.replies.length) {
      <ul class="replies">
        @for (r of comment.replies; track r.id) {
          <li app-comment [comment]="r" [depth]="depth + 1"></li>
        }
      </ul>
    }
  \`,
})
export class CommentComponent {
  @Input({ required: true }) comment!: CommentNode;
  @Input() depth = 0;
  store = inject(CommentStore);
  // UI-only state, local to this comment.
  collapsed = signal(false);
  replying = signal(false);

  get hidden() {
    return countAll(this.comment.replies);
  }

  post(text: string) {
    this.store.reply(this.comment.id, text);
    this.replying.set(false);
  }
}
`,
          "/src/app/comments.ts": `// Comments are a NESTED tree: { id, author, text, replies: [...] }.
// Signals compare by reference, so the helpers return new
// arrays and copy only the comments on the path to the change.

export interface CommentNode {
  id: string;
  author: string;
  text: string;
  replies: CommentNode[];
}

let nextId = 100;
export const makeId = () => "c" + nextId++;

export const initialComments: CommentNode[] = [
  {
    id: "c1",
    author: "Asha",
    text: "Should the explorer load folders lazily?",
    replies: [
      {
        id: "c2",
        author: "Ben",
        text: "Yes, fetch children on first expand.",
        replies: [
          {
            id: "c3",
            author: "Asha",
            text: "And cache them per folder id.",
            replies: [],
          },
          {
            id: "c4",
            author: "Chen",
            text: "Show a spinner row while loading.",
            replies: [],
          },
        ],
      },
      {
        id: "c5",
        author: "Dana",
        text: "Only for very large trees.",
        replies: [],
      },
    ],
  },
  {
    id: "c6",
    author: "Eli",
    text: "Ship the eager version first.",
    replies: [],
  },
];

export function addReply(
  list: CommentNode[],
  parentId: string | null,
  comment: CommentNode,
): CommentNode[] {
  if (parentId === null) return [...list, comment];
  return list.map((c) => {
    if (c.id === parentId) return { ...c, replies: [...c.replies, comment] };
    const replies = addReply(c.replies, parentId, comment);
    return replies === c.replies ? c : { ...c, replies };
  });
}

// Removes the comment AND everything under it.
export function removeComment(list: CommentNode[], id: string): CommentNode[] {
  if (list.some((c) => c.id === id)) return list.filter((c) => c.id !== id);
  let changed = false;
  const next = list.map((c) => {
    const replies = removeComment(c.replies, id);
    if (replies === c.replies) return c;
    changed = true;
    return { ...c, replies };
  });
  return changed ? next : list;
}

export const countAll = (list: CommentNode[]): number =>
  list.reduce(
    (n: number, c: CommentNode): number => n + 1 + countAll(c.replies),
    0,
  );
`,
          "/src/app/reply-box.component.ts": `import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  signal,
} from "@angular/core";

@Component({
  selector: "app-reply-box",
  standalone: true,
  template: \`
    <form class="reply-box" (submit)="$event.preventDefault(); submit()">
      <textarea #box [attr.aria-label]="label" data-testid="reply-text" rows="2" [value]="text()"
        (input)="text.set(box.value)"
        (keydown.control.enter)="$event.preventDefault(); submit()"
        (keydown.meta.enter)="$event.preventDefault(); submit()"
        (keydown.escape)="cancellable && cancel.emit()"></textarea>
      <div class="reply-actions">
        <button
          type="submit"
          data-testid="post"
          [disabled]="!text().trim()"
        >{{ submitLabel }}</button>
        @if (cancellable) {
          <button type="button" (click)="cancel.emit()">Cancel</button>
        }
      </div>
    </form>
  \`,
})
export class ReplyBoxComponent implements AfterViewInit {
  @Input() label = "";
  @Input() submitLabel = "Post";
  @Input() cancellable = true;
  @Input() autoFocus = true;
  @Output() posted = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();
  @ViewChild("box") box!: ElementRef<HTMLTextAreaElement>;
  text = signal("");

  ngAfterViewInit() {
    if (this.autoFocus) this.box.nativeElement.focus();
  }

  submit() {
    const t = this.text().trim();
    if (!t) return;
    this.posted.emit(t);
    this.text.set("");
  }
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build Nested Comments with Collapsible Threads & Voting",
    seoDescription:
      "Nested comments with optimistic up/down votes, rollback, stale-response guards, Best/New sorting, thread-line collapse and depth limits in 3 frameworks.",
    description: `**Question presented to candidate:**
"Take a basic nested comments widget and make it feel like Reddit or Hacker News. People can upvote or downvote any comment and see the score change immediately, even though the server is slow and sometimes fails. The thread can be sorted by Best or New, clicking the vertical thread line collapses that branch, and very deep threads stop indenting and show a 'Continue this thread' link instead."

**Requirements:**
- Up and down vote buttons per comment with \`aria-pressed\`; clicking the same arrow again removes the vote; switching arrows replaces it.
- Optimistic update: the score changes at once, a simulated API (300 ms) confirms or fails; on failure the vote rolls back to the last confirmed value with a message.
- Out-of-order responses must not corrupt state: only the newest request for a comment may roll back.
- Sort Best (server score, ties older first) or New (newest first), applied at every level, without reshuffling rows when you vote.
- Collapse a thread from its \`[-]\` toggle or by clicking its thread line; collapsed comments show how many replies are hidden.
- Depth limit: below depth 3, show "Continue this thread (N more)", which opens that subtree on its own with a Back button and moves focus to the heading.

**What a strong answer should cover:**
- Separating server data (score) from the user's own vote, and showing \`score + myVote\`.
- Optimistic update with rollback to a confirmed value, plus a per-comment sequence number so a stale failure does not undo a newer vote.
- Sorting as derived data per level, and why ranking on the server score avoids rows jumping under the cursor.
- Lifting collapse state out of the components (a \`Set\` of ids) so it survives re-sorting and the "continue thread" view.
- Depth limiting and focus management when switching views; accessible toggles and thread lines.

**Clarifying questions expected:**
- "Can users vote on their own comments? Is a down vote allowed?"
- "Should a new vote re-rank the thread immediately, or only on reload?"
- "What should the user see when a vote fails: silent rollback or a message?"

**Code / implementation expected:** Yes. The vote flow with rollback and the stale-response guard is the core; sorting, collapse and the depth limit complete it.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Experienced frontend candidates who can build a recursive comments list and now need the interaction details that real products have.
**Difficulty:** Hard

> **How to read this doc:** Plain words first, then a <code>📌 Interview term:</code> tag. It assumes [Build a Nested Comments widget](/interview-question/build-a-nested-comments-widget) (recursion, tree helpers, reply boxes), so replying is not rebuilt here. The vote API is **simulated** in the solution with a 300 ms \`setTimeout\` and a "Simulate vote failures" switch; the Verified section quotes the real output on React 19.3.1.

## 1. Why This Even Matters — A Story First

Think of a school election with a slow ballot counter. When you drop your vote in the box, you want your class to see the tally move right away, not in ten seconds. But the counter sometimes rejects a ballot (smudged, late). Then the tally on the board must go back, and someone should tell you why. And if you changed your mind twice before the counter answered, the board must show your *last* choice, not whichever ballot happened to be checked last.

That is optimistic voting with rollback and stale-response protection. Add sorting that does not shuffle the board while people are reading, threads you can fold away by their side line, and a "continue" link for conversations that go too deep, and you have the full question.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Does a vote re-rank the thread immediately? | Live re-ranking makes rows jump under the cursor; this build ranks on the server score. |
| What happens on a failed vote? | Silent rollback, a message, or a retry; this build rolls back with a message. |
| Can a user switch from up to down directly? | One request with the final value (\`-1\`), not "remove then add". |
| Is there a rate limit or debounce for vote spam? | Rapid clicks send many requests; only the last should count. |
| Maximum visual depth? | Sets where "Continue this thread" kicks in; mobile wants a small number. |
| Should collapse state persist across reloads? | Then it goes to storage keyed by comment id. |

## 3. Requirements and Plan

### Separate what the server says from what I did

📌 **Interview term: Optimistic update** — show the result of a user action before the server confirms it, then confirm or roll back when the response arrives. It makes a slow network feel instant (see [optimistic updates in a todo app](/interview-question/build-a-todo-app-with-pagination-filters-optimistic-updates)).

| Piece | Kind | Why |
| :--- | :--- | :--- |
| \`comments\` (with server \`score\`, \`at\`) | data | Never changed by voting |
| \`votes\` \`{ id: -1 / 0 / 1 }\` | state | What this user has done, shown immediately |
| \`confirmed\` \`{ id: vote }\` | ref | Last vote the server accepted: the rollback target |
| \`latest\` \`{ id: seq }\` | ref | Number of the newest request per comment |
| \`collapsed\` (\`Set\`), \`sort\`, \`threadId\` | state | Lifted to \`App\`, so they survive re-sorting and the thread view |
| displayed points, sorted replies | derived | \`score + myVote\`, \`sortLevel(replies, sort)\` |

<svg class="iq-diagram" width="100%" viewBox="0 0 660 300" role="img" aria-label="Vote flow: a click updates votes immediately and sends a request with a sequence number. On success the confirmed vote is stored. On failure the vote rolls back only if the request is still the newest one.">
  <defs>
    <marker id="nc6r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="20" width="190" height="60" rx="10"/>
  <text class="d-text d-accent" x="115" y="46" text-anchor="middle">click arrow</text>
  <text class="d-sub" x="115" y="66" text-anchor="middle">votes[id] = next now</text>
  <rect class="d-box" x="250" y="20" width="190" height="60" rx="10"/>
  <text class="d-text" x="345" y="46" text-anchor="middle">sendVote</text>
  <text class="d-sub" x="345" y="66" text-anchor="middle">seq = ++latest[id]</text>
  <rect class="d-box-muted" x="470" y="20" width="170" height="60" rx="10"/>
  <text class="d-text" x="555" y="46" text-anchor="middle">ok</text>
  <text class="d-sub" x="555" y="66" text-anchor="middle">confirmed = next</text>
  <rect class="d-box" x="250" y="150" width="190" height="60" rx="10"/>
  <text class="d-text" x="345" y="176" text-anchor="middle">failed</text>
  <text class="d-sub" x="345" y="196" text-anchor="middle">is seq still latest?</text>
  <rect class="d-box-muted" x="20" y="230" width="190" height="56" rx="10"/>
  <text class="d-text" x="115" y="263" text-anchor="middle">no: ignore</text>
  <rect class="d-box-accent" x="470" y="230" width="170" height="56" rx="10"/>
  <text class="d-text d-accent" x="555" y="256" text-anchor="middle">yes: roll back</text>
  <text class="d-sub" x="555" y="276" text-anchor="middle">to confirmed</text>
  <path class="d-edge" d="M 210 50 L 250 50" marker-end="url(#nc6r-arrow)"/>
  <path class="d-edge" d="M 440 50 L 470 50" marker-end="url(#nc6r-arrow)"/>
  <path class="d-edge" d="M 345 80 L 345 150" marker-end="url(#nc6r-arrow)"/>
  <path class="d-edge-dashed" d="M 250 195 L 160 230" marker-end="url(#nc6r-arrow)"/>
  <path class="d-edge-accent" d="M 440 195 L 520 230" marker-end="url(#nc6r-arrow)"/>
</svg>

Rolling back to the *confirmed* value, not to "the value before this click", is what keeps a chain of quick clicks consistent: whatever happens, the board ends at a value the server agreed to, or at the user's newest choice while it is still pending.

## 4. Build It Step by Step

### Step 1: The simulated API

~~~js
export function sendVote(id, vote, fail) {
  return new Promise((resolve, reject) => {
    setTimeout(
      () =>
        fail
          ? reject(new Error("Network error"))
          : resolve({ id, vote }),
      300,
    );
  });
}
~~~

The \`fail\` flag is captured when the request is sent, so the driver can make one request fail and the next succeed. A real app would \`fetch\` here.

### Step 2: The vote flow

~~~jsx
function vote(comment, dir) {
  const id = comment.id;
  // same arrow again = remove my vote
  const next = (votes[id] || 0) === dir ? 0 : dir;
  setVotes((v) => ({ ...v, [id]: next })); // 1. optimistic: show it now
  const seq = (latest.current[id] || 0) + 1;
  latest.current[id] = seq;
  sendVote(id, next, simulateFailure).then(
    () => {
      // 2a. confirmed
      if (latest.current[id] === seq) confirmed.current[id] = next;
    },
    () => {
      // 2b. failed: roll back, unless a newer click superseded this one
      if (latest.current[id] !== seq) return;
      setVotes((v) => ({ ...v, [id]: confirmed.current[id] || 0 }));
      setStatus(
        "Could not save your vote on the comment by " +
          comment.author +
          ". It was restored.",
      );
    },
  );
}
~~~

📌 **Interview term: Rollback** — restoring the last known-good value after a failed optimistic update. Here the known-good value is \`confirmed.current[id]\`.

📌 **Interview term: Stale response guard** — a per-key sequence number (or request id) checked when a response arrives; only the newest request may change state. Without it, a slow failure for an old click would undo a newer, successful vote. The same idea protects [debounced search](/interview-question/implement-a-debounced-search-input-with-race-condition-safe-request-cancellation) from out-of-order results.

\`confirmed\` and \`latest\` are [refs](/interview-question/describe-the-useref-hook-and-its-typical-use-cases), not state: they never affect what is drawn, and they must be readable synchronously inside the promise callbacks. React 19 also ships \`useOptimistic\` ([how it works](/interview-question/how-does-useoptimistic-enable-optimistic-ui-in-react-19)), which reverts automatically when an Action finishes; the hand-written version is used here because it makes the rollback target and the race explicit, which is what interviewers probe.

### Step 3: Sorting that does not jump

~~~js
export const SORTS = {
  // ranked by server score, ties: older first
  best: (a, b) => b.score - a.score || a.at - b.at,
  new: (a, b) => b.at - a.at,
};
~~~

📌 **Interview term: Stable ranking** — ordering by data that does not change under the user (the server score), so the row you just voted on stays where it is until the next load. Each \`Comment\` sorts its own replies with \`sortLevel(comment.replies, ctx.sort)\`, a sorted copy computed on render, so sorting never touches the data.

### Step 4: Lifted collapse, thread lines, depth limit

~~~jsx
{
  !collapsed &&
    replies.length > 0 &&
    (tooDeep ? (
      <button
        className="continue"
        data-testid="continue"
        onClick={() => ctx.openThread(comment.id)}
      >
        Continue this thread ({countAll(comment.replies)} more)
      </button>
    ) : (
      <div className="branch">
        {/* The thread line is a real button: clicking the rail collapses this comment. */}
        <button
          className="rail"
          data-testid="rail"
          aria-label={"Collapse thread by " + comment.author}
          onClick={() => ctx.toggleCollapsed(comment.id)}
        />
        <ul className="replies">
          {replies.map((r) => (
            <Comment
              key={r.id}
              comment={r}
              depth={depth + 1}
              ctx={ctx}
            />
          ))}
        </ul>
      </div>
    ));
}
~~~

Collapse lives in a \`Set\` in \`App\` instead of each \`Comment\`. That matters here: the "continue this thread" view renders the same comments under a different parent, and a component-local flag would reset on remount. The thread line is a real \`<button>\` with an \`aria-label\`, so it is focusable and announced. Past \`MAX_DEPTH\`, replies are replaced by a "Continue this thread" button that sets \`threadId\`.

### Step 5: Focus after switching views

~~~jsx
// After switching between the full list and
// one thread, move focus to the heading.
useEffect(() => {
  if (!focusHeading.current) return;
  focusHeading.current = false;
  headingRef.current.focus();
});

function openThread(id) {
  focusHeading.current = true;
  setThreadId(id);
}
~~~

When the whole list is replaced by one thread, the button that was focused disappears. Moving focus to the heading (\`tabIndex={-1}\`) tells keyboard and screen-reader users where they are. A flag set in the click handler, read in an effect after commit, avoids stealing focus on the first render.

## 5. Verified

Mounted in jsdom like the playground. The simulated API answers after 300 ms; the driver waits with \`settle(350)\`. In the dump, each entry is \`id(points)\` and each dot one level of depth. Unedited output:

~~~text
[react] RENDERED: DiscussionSort BestNew Simulate vote failures[-]Hana15 pointsShip the eager version first, measure later.▲▼[-]Asha10 pointsLazy-load folder children on first expand?▲▼[-]Gus9 pointsOnly for trees over a few thousand nodes.▲▼[-]Ben5 pointsYes, and cache them by folder id.▲▼[-]Fay3 pointsShow a spinner row meanwhile.▲▼[-]Chen1 pointInvalidate the cache on rename.▲▼[-]Dana2 pointsOr key it by path and id.▲▼Continue this thread (1 more)
[react] Best: c6(15) c1(10) .c5(9) .c2(5) ..c4(3) ..c3(1) ...c7(2) | continue: Continue this thread (1 more)
[react] New:  c1(10) .c2(5) ..c4(3) ..c3(1) ...c7(2) .c5(9) c6(15)
[react] upvote c5 (before the server answers): 10 points | pressed: true
[react]   after 350 ms: 10 points | order unchanged: true
[react] upvote c5 again removes it: 9 points | pressed: false
[react] downvote c6: 14 points
[react] then upvote c6 (switches): 16 points | down pressed: false
[react] failing upvote on c2, optimistic: 6 points
[react]   after the failure: 5 points | Could not save your vote on the comment by Ben. It was restored.
[react] race on c4: A=up (will fail), B=down (will succeed), shown now: 2 points
[react]   after both answer: 2 points | down pressed: true | (A was stale, so no rollback)
[react] click the thread line of c2: false | 4 hidden | c6(16) c1(10) .c5(9) .c2(5)
[react] expand c2 with [+]: true | rows: 7
[react] continue this thread: Thread | focus on heading: true | c7(2) .c8(1)
[react] back: Discussion | rows: 7 | c4 kept its vote: 2 points
~~~

Read it as: Best ranks by score at every level, and New by time; \`c8\` is hidden behind "Continue this thread (1 more)" at depth 3; an upvote shows \`10 points\` and \`aria-pressed: true\` before the server answers, and the order does not change; the same arrow removes the vote; down then up on \`c6\` switches straight to \`16\`; with failures on, \`c2\` shows \`6\` and rolls back to \`5\` with a message; in the race on \`c4\`, request A (up, sent with failures on) fails *after* request B (down) was sent, and is ignored because it is stale, so \`c4\` keeps the down vote at \`2\`; the thread line collapses \`c2\` and reports 4 hidden; "Continue this thread" shows \`c7\` and \`c8\` with focus on the heading; Back returns with \`c4\` still at \`2\`. No \`console.error\`.

## 6. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Double click on the same arrow | Second click removes the vote; latest request wins |
| Failure after a newer success | Ignored by the sequence guard |
| Failure of the newest request | Roll back to the confirmed vote, message in \`role="status"\` |
| Score of 1 or -1 | "point" vs "points" |
| Deep threads | Depth 3 cap with "Continue this thread"; Back restores the list |
| Screen readers | Vote buttons with \`aria-pressed\` and labels naming the author; toggles with \`aria-expanded\`; thread lines are labelled buttons; focus moves to the heading on view change |

## 7. Common Pitfalls

- **Adding the vote into \`score\`.** Then you cannot tell server data from your own action, and a refetch double counts it. Keep \`myVote\` separate and display \`score + myVote\`.
- **Rolling back to "the value before this click".** After several fast clicks that value may itself have been optimistic. Roll back to the last confirmed value.
- **No stale-response guard.** An old failure lands after a newer success and wipes it, which is exactly the \`c4\` race above.
- **Re-ranking on every vote.** Rows jump away from the pointer; rank on the server score.
- **Keeping \`collapsed\` in each comment component** when the same comment can render in two places (list and thread view). Lift it to a \`Set\` of ids.
- **Thread lines as \`div\`s.** Mouse-only; use buttons with labels, or keep the \`[-]\` toggle as the accessible path.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Data split:</strong> <span style="color:#f0e2c8;">"The server score is data and never changes when I vote; the user's own vote is separate state, and I display <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">score + myVote</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Optimistic flow:</strong> <span style="color:#f0e2c8;">"A click sets the new vote immediately and sends it with a per-comment sequence number; success stores it as confirmed, failure rolls back to the confirmed vote and shows a message."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Races:</strong> <span style="color:#f0e2c8;">"Only the newest request for a comment may roll back, so an old failure arriving after a newer click is ignored."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Sorting:</strong> <span style="color:#f0e2c8;">"Best and New are comparators applied per level to sorted copies; Best uses the server score so rows do not jump when you vote."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Threads:</strong> <span style="color:#f0e2c8;">"Collapse is a lifted <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> of ids, toggled by the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[-]</code> button or the labelled thread line; past depth 3 I show Continue this thread and move focus to the heading when the view changes."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useOptimistic</code> here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It fits when the vote is an Action: it shows the optimistic value while the Action is pending and returns to the real state when it finishes. I would still need the confirmed value and the stale-request rule for rapid clicks, so I would keep the sequence check either way.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you stop vote spam?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the instant UI, but coalesce requests: debounce the network call per comment by a few hundred ms and send only the final value, or cancel the in-flight request with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AbortController</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you highlight comments that are new since my last visit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store the last visit time per thread (server or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">localStorage</code>), mark comments with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">at</code> after it, and clear the mark when they scroll into view, for example with an IntersectionObserver.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">10,000 comments: what breaks first?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Rendering. Collapse deep branches by default, paginate replies ("load 20 more"), memoize <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Comment</code> with stable handlers, and virtualize the flattened visible list if needed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test the race?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use fake timers and a mock API whose promises you resolve by hand: send A, send B, resolve B, reject A, then assert the vote is B's. The Verified run does the same with the simulated API.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Optimistic update | Show the result before the server confirms |
| Rollback | Restore the last confirmed value after a failure |
| Stale response guard | Only the newest request may change state |
| Stable ranking | Order by data that does not change under the user |
| \`aria-pressed\` | On or off state of a toggle button |
| Depth limit | Stop nesting and link to the subtree instead |

---

**Conclusion:** The hard parts of a voting thread are not visual: keep server data and the user's vote apart, update optimistically, roll back to a confirmed value, and let only the newest request win. Rank on stable data, lift collapse into a \`Set\` of ids so it survives every view, cap the depth with a focus-managed "continue" view, and the widget behaves like the real thing. The single-button version of the voting idea is the [Like button](/interview-question/build-a-like-button).`,
        files: {
          "/App.js": `import { useEffect, useRef, useState } from "react";
import Comment from "./src/Comment";
import {
  initialComments,
  sortLevel,
  findComment,
  sendVote,
} from "./src/thread";

export default function App() {
  const [comments] = useState(initialComments);
  const [sort, setSort] = useState("best");
  // id -> -1 | 0 | 1, shown optimistically
  const [votes, setVotes] = useState({});
  const [collapsed, setCollapsed] = useState(() => new Set());
  // "continue this thread" root, or null
  const [threadId, setThreadId] = useState(null);
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [status, setStatus] = useState("");
  const confirmed = useRef({}); // id -> last vote the server accepted
  const latest = useRef({}); // id -> sequence number of the newest request
  const headingRef = useRef(null);
  const focusHeading = useRef(false);

  // After switching between the full list and
  // one thread, move focus to the heading.
  useEffect(() => {
    if (!focusHeading.current) return;
    focusHeading.current = false;
    headingRef.current.focus();
  });

  function openThread(id) {
    focusHeading.current = true;
    setThreadId(id);
  }

  function vote(comment, dir) {
    const id = comment.id;
    // same arrow again = remove my vote
    const next = (votes[id] || 0) === dir ? 0 : dir;
    setVotes((v) => ({ ...v, [id]: next })); // 1. optimistic: show it now
    const seq = (latest.current[id] || 0) + 1;
    latest.current[id] = seq;
    sendVote(id, next, simulateFailure).then(
      () => {
        // 2a. confirmed
        if (latest.current[id] === seq) confirmed.current[id] = next;
      },
      () => {
        // 2b. failed: roll back, unless a newer click superseded this one
        if (latest.current[id] !== seq) return;
        setVotes((v) => ({ ...v, [id]: confirmed.current[id] || 0 }));
        setStatus(
          "Could not save your vote on the comment by " +
            comment.author +
            ". It was restored.",
        );
      },
    );
  }

  function toggleCollapsed(id) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const ctx = { votes, collapsed, sort, vote, toggleCollapsed, openThread };
  const root = threadId
    ? [findComment(comments, threadId)]
    : sortLevel(comments, sort);

  return (
    <div className="app">
      <div className="bar">
        <h1 ref={headingRef} tabIndex={-1}>
          {threadId ? "Thread" : "Discussion"}
        </h1>
        <label>
          Sort{" "}
          <select
            data-testid="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="best">Best</option>
            <option value="new">New</option>
          </select>
        </label>
      </div>
      <label className="fail">
        <input
          type="checkbox"
          data-testid="fail"
          checked={simulateFailure}
          onChange={(e) => setSimulateFailure(e.target.checked)}
        />{" "}
        Simulate vote failures
      </label>
      {threadId && (
        <button
          className="back"
          data-testid="back"
          onClick={() => openThread(null)}
        >
          ← Back to all comments
        </button>
      )}
      <ul className="thread">
        {root.map((c) => (
          <Comment key={c.id} comment={c} depth={0} ctx={ctx} />
        ))}
      </ul>
      <p className="status" role="status" data-testid="status">
        {status}
      </p>
    </div>
  );
}
`,
          "/src/Comment.js": `import { MAX_DEPTH, countAll, sortLevel } from "./thread";

// Recursive comment. All state (votes, collapsed ids, sort) is owned by App and
// passed down in \`ctx\`, so it survives
// re-sorting and the "continue thread" view.
export default function Comment({ comment, depth, ctx }) {
  const myVote = ctx.votes[comment.id] || 0;
  const points = comment.score + myVote;
  const collapsed = ctx.collapsed.has(comment.id);
  const replies = sortLevel(comment.replies, ctx.sort);
  const tooDeep = depth >= MAX_DEPTH && replies.length > 0;

  return (
    <li className="comment" data-id={comment.id} data-depth={depth}>
      <article aria-label={"Comment by " + comment.author}>
        <header>
          <button
            className="toggle"
            data-testid="toggle"
            aria-expanded={!collapsed}
            aria-label={
              (collapsed ? "Expand" : "Collapse") +
              " thread by " +
              comment.author
            }
            onClick={() => ctx.toggleCollapsed(comment.id)}
          >
            {collapsed ? "[+]" : "[-]"}
          </button>
          <strong>{comment.author}</strong>
          <span className="points" data-testid="points">
            {points} {Math.abs(points) === 1 ? "point" : "points"}
          </span>
          {collapsed && countAll(comment.replies) > 0 && (
            <span className="hidden-note">
              {countAll(comment.replies)} hidden
            </span>
          )}
        </header>
        {!collapsed && (
          <>
            <p className="text">{comment.text}</p>
            <div className="actions">
              <button
                className={"vote up" + (myVote === 1 ? " on" : "")}
                data-testid="up"
                aria-pressed={myVote === 1}
                aria-label={"Upvote comment by " + comment.author}
                onClick={() => ctx.vote(comment, 1)}
              >
                ▲
              </button>
              <button
                className={"vote down" + (myVote === -1 ? " on" : "")}
                data-testid="down"
                aria-pressed={myVote === -1}
                aria-label={"Downvote comment by " + comment.author}
                onClick={() => ctx.vote(comment, -1)}
              >
                ▼
              </button>
            </div>
          </>
        )}
      </article>
      {!collapsed &&
        replies.length > 0 &&
        (tooDeep ? (
          <button
            className="continue"
            data-testid="continue"
            onClick={() => ctx.openThread(comment.id)}
          >
            Continue this thread ({countAll(comment.replies)} more)
          </button>
        ) : (
          <div className="branch">
            {/* The thread line is a real button: clicking the rail collapses this comment. */}
            <button
              className="rail"
              data-testid="rail"
              aria-label={"Collapse thread by " + comment.author}
              onClick={() => ctx.toggleCollapsed(comment.id)}
            />
            <ul className="replies">
              {replies.map((r) => (
                <Comment key={r.id} comment={r} depth={depth + 1} ctx={ctx} />
              ))}
            </ul>
          </div>
        ))}
    </li>
  );
}
`,
          "/src/thread.js": `// Data, sorting and a SIMULATED vote API (no network in the playground).
// \`score\` is the server score WITHOUT my vote; my vote lives in a separate map.

// depth 0..3 render inline, deeper replies get "Continue this thread"
export const MAX_DEPTH = 3;

export const initialComments = [
  {
    id: "c1",
    author: "Asha",
    at: 10,
    score: 10,
    text: "Lazy-load folder children on first expand?",
    replies: [
      {
        id: "c2",
        author: "Ben",
        at: 40,
        score: 5,
        text: "Yes, and cache them by folder id.",
        replies: [
          {
            id: "c3",
            author: "Chen",
            at: 50,
            score: 1,
            text: "Invalidate the cache on rename.",
            replies: [
              {
                id: "c7",
                author: "Dana",
                at: 70,
                score: 2,
                text: "Or key it by path and id.",
                replies: [
                  {
                    id: "c8",
                    author: "Eli",
                    at: 80,
                    score: 1,
                    text: "Ids survive a rename, paths do not.",
                    replies: [],
                  },
                ],
              },
            ],
          },
          {
            id: "c4",
            author: "Fay",
            at: 60,
            score: 3,
            text: "Show a spinner row meanwhile.",
            replies: [],
          },
        ],
      },
      {
        id: "c5",
        author: "Gus",
        at: 30,
        score: 9,
        text: "Only for trees over a few thousand nodes.",
        replies: [],
      },
    ],
  },
  {
    id: "c6",
    author: "Hana",
    at: 5,
    score: 15,
    text: "Ship the eager version first, measure later.",
    replies: [],
  },
];

export const SORTS = {
  // ranked by server score, ties: older first
  best: (a, b) => b.score - a.score || a.at - b.at,
  new: (a, b) => b.at - a.at,
};

export const sortLevel = (list, sort) => [...list].sort(SORTS[sort]);
export const countAll = (list) =>
  list.reduce((n, c) => n + 1 + countAll(c.replies), 0);

export function findComment(list, id) {
  for (const c of list) {
    if (c.id === id) return c;
    const hit = findComment(c.replies, id);
    if (hit) return hit;
  }
  return null;
}

// Simulated server: resolves after 300 ms, or
// rejects when \`fail\` was on at send time.
export function sendVote(id, vote, fail) {
  return new Promise((resolve, reject) => {
    setTimeout(
      () => (fail ? reject(new Error("Network error")) : resolve({ id, vote })),
      300,
    );
  });
}
`,
          "/styles.css": `body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.app {
  max-width: 600px;
  margin: 0 auto;
  padding: 16px;
}
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
h1 {
  font-size: 18px;
  margin: 0;
  outline: none;
}
select,
button {
  background: #1d2230;
  color: #e6e6e6;
  border: 1px solid #343b4f;
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
}
.fail {
  display: block;
  margin: 8px 0;
  color: #9aa3b5;
  font-size: 13px;
}
.back {
  margin-bottom: 8px;
}
.thread,
.replies {
  list-style: none;
  margin: 0;
  padding: 0;
}
.comment article {
  padding: 6px 0;
}
.comment header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.toggle {
  border: none;
  background: none;
  color: #8a93a8;
  padding: 0 2px;
  font-family: monospace;
}
.points {
  color: #9aa3b5;
  font-size: 13px;
}
.hidden-note {
  color: #8a93a8;
  font-size: 13px;
  font-style: italic;
}
.text {
  margin: 4px 0 6px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.actions {
  display: flex;
  gap: 6px;
}
.vote {
  width: 32px;
  padding: 2px 0;
}
.vote.up.on {
  color: #ff9e64;
  border-color: #ff9e64;
}
.vote.down.on {
  color: #7aa2f7;
  border-color: #7aa2f7;
}
.branch {
  display: flex;
}
.rail {
  flex: 0 0 14px;
  margin: 0 6px 0 4px;
  padding: 0;
  border: none;
  border-radius: 0;
  background: none;
  border-left: 2px solid #262c3b;
}
.rail:hover,
.rail:focus-visible {
  border-left-color: #6ea8ff;
}
.replies {
  flex: 1;
  min-width: 0;
}
.continue {
  margin: 4px 0 8px 22px;
  color: #8ab4ff;
  background: none;
  border: none;
}
.status {
  min-height: 1.2em;
  color: #ff8a80;
  font-size: 13px;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Experienced Vue 3 developers who can build recursive comments and need optimistic voting, sorting, collapsible threads and a depth limit.
**Difficulty:** Hard

> **How to read this doc:** Plain words first, then a <code>📌 Interview term:</code> tag. It assumes [Build a Nested Comments widget](/interview-question/build-a-nested-comments-widget). The vote API is **simulated** in-file (300 ms \`setTimeout\`, plus a failure switch); the Verified section quotes the real output on Vue 3.5.44.

## 1. Why This Even Matters — A Story First

A class election with a slow ballot counter: the board should move the moment you vote, go back if the counter rejects your ballot, and show your *last* choice if you changed your mind before it answered. Add a board that does not reshuffle while people read, folds for long side conversations and a "continue" link for very deep ones, and you have this widget.

## 2. Requirements and Plan

Up/down votes with \`aria-pressed\`, optimistic with rollback and a stale-response guard; Best/New sorting per level on the server score; collapse via \`[-]\` or the thread line; depth limit with a focus-managed thread view.

| Piece | Vue tool |
| :--- | :--- |
| \`votes\` | \`reactive({})\`, the user's vote per id |
| \`collapsed\` | \`reactive(new Set())\`, lifted to \`App.vue\` |
| \`sort\`, \`threadId\`, \`simulateFailure\`, \`status\` | \`ref\` (\`sort\` and the checkbox use \`v-model\`) |
| \`confirmed\`, \`latest\` | plain objects: bookkeeping that never renders |
| \`root\`, per-comment \`points\`, \`replies\` | \`computed\` |
| shared state and actions | \`provide('discussion', reactive({...}))\` |

📌 **Interview term: Optimistic update** — show the result of an action before the server confirms it, then keep or undo it when the answer arrives.

## 3. Build It Step by Step

### Step 1: The vote flow

~~~js
function vote(comment, dir) {
  const id = comment.id;
  const next = (votes[id] || 0) === dir ? 0 : dir;
  votes[id] = next; // 1. optimistic
  const seq = (latest[id] || 0) + 1;
  latest[id] = seq;
  sendVote(id, next, simulateFailure.value).then(
    () => {
      if (latest[id] === seq) confirmed[id] = next;
    },
    () => {
      // 2. roll back only if no newer click replaced this one
      if (latest[id] !== seq) return;
      votes[id] = confirmed[id] || 0;
      status.value =
        "Could not save your vote on the comment by " +
        comment.author +
        ". It was restored.";
    },
  );
}
~~~

📌 **Interview term: Rollback** — restoring the last confirmed value after a failed optimistic update. 📌 **Interview term: Stale response guard** — a per-comment sequence number; a response that is not the newest for its comment is ignored.

\`confirmed\` and \`latest\` are deliberately plain objects. Making them reactive would add tracking to values no template reads.

### Step 2: Points and per-level sorting

~~~js
const myVote = computed(() => ctx.votes[props.comment.id] || 0);
const points = computed(() => props.comment.score + myVote.value);
const collapsed = computed(() => ctx.collapsed.has(props.comment.id));
const replies = computed(() =>
  sortLevel(props.comment.replies, ctx.sort),
);
const hidden = computed(() => countAll(props.comment.replies));
const tooDeep = computed(
  () => props.depth >= MAX_DEPTH && replies.value.length > 0,
);
~~~

Each comment derives its points as \`score + myVote\`, and sorts its own replies with \`sortLevel\`, which returns a sorted copy. Best ranks by the server score only, so a vote never moves a row under the pointer.

### Step 3: Thread line and depth limit

~~~vue
<template v-if="!collapsed && replies.length">
  <button
    v-if="tooDeep"
    class="continue"
    data-testid="continue"
    @click="ctx.openThread(comment.id)"
  >
    Continue this thread ({{ hidden }} more)
  </button>
  <div v-else class="branch">
    <button
      class="rail"
      data-testid="rail"
      :aria-label="'Collapse thread by ' + comment.author"
      @click="ctx.toggleCollapsed(comment.id)"
    ></button>
    <ul class="replies">
      <Comment
        v-for="r in replies"
        :key="r.id"
        :comment="r"
        :depth="depth + 1"
      />
    </ul>
  </div>
</template>
~~~

The thread line is a labelled \`<button>\`, so it is reachable by keyboard. \`collapsed\` lives in a reactive \`Set\` in \`App.vue\`, not in the component, because the same comment renders again in the thread view and local refs would reset there.

### Step 4: Focus on view change

~~~js
async function openThread(id) {
  threadId.value = id;
  await nextTick();
  heading.value.focus();
}
~~~

\`await nextTick()\` waits for the DOM to show the new view, then the heading (\`tabindex="-1"\`) receives focus, so keyboard users are not left on a removed button.

## 4. Verified

Mounted with \`createApp(App).mount("#app")\` in jsdom; the simulated API answers after 300 ms and the driver waits \`settle(350)\`. Each entry is \`id(points)\`, dots are depth. Unedited output (the first \`RENDERED\` line differs from React only in template whitespace):

~~~text
[vue] RENDERED: DiscussionSort BestNew Simulate vote failures [-]Hana15 pointsShip the eager version first, measure later.▲▼[-]Asha10 pointsLazy-load folder children on first expand?▲▼[-]Gus9 pointsOnly for trees over a few thousand nodes.▲▼[-]Ben5 pointsYes, and cache them by folder id.▲▼[-]Fay3 pointsShow a spinner row meanwhile.▲▼[-]Chen1 pointInvalidate the cache on rename.▲▼[-]Dana2 pointsOr key it by path and id.▲▼ Continue this thread (1 more)
[vue] Best: c6(15) c1(10) .c5(9) .c2(5) ..c4(3) ..c3(1) ...c7(2) | continue: Continue this thread (1 more)
[vue] New:  c1(10) .c2(5) ..c4(3) ..c3(1) ...c7(2) .c5(9) c6(15)
[vue] upvote c5 (before the server answers): 10 points | pressed: true
[vue]   after 350 ms: 10 points | order unchanged: true
[vue] upvote c5 again removes it: 9 points | pressed: false
[vue] downvote c6: 14 points
[vue] then upvote c6 (switches): 16 points | down pressed: false
[vue] failing upvote on c2, optimistic: 6 points
[vue]   after the failure: 5 points | Could not save your vote on the comment by Ben. It was restored.
[vue] race on c4: A=up (will fail), B=down (will succeed), shown now: 2 points
[vue]   after both answer: 2 points | down pressed: true | (A was stale, so no rollback)
[vue] click the thread line of c2: false | 4 hidden | c6(16) c1(10) .c5(9) .c2(5)
[vue] expand c2 with [+]: true | rows: 7
[vue] continue this thread: Thread | focus on heading: true | c7(2) .c8(1)
[vue] back: Discussion | rows: 7 | c4 kept its vote: 2 points
~~~

The behaviour lines match React and Angular exactly: instant votes with \`aria-pressed\`, no reordering on vote, toggle-off and switch, rollback with a message, the \`c4\` race where the stale failure is ignored, collapse by thread line with 4 hidden, and the continue-thread view with focus on the heading. No \`console.error\`.

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Same arrow twice | Removes the vote |
| Old failure after newer click | Ignored |
| Newest request fails | Back to confirmed, message in \`role="status"\` |
| Screen readers | \`aria-pressed\` as \`"true"\` / \`"false"\`, \`aria-expanded\`, labelled thread lines, heading focus on view change |

## 6. Common Pitfalls

- **Writing the vote into \`score\`.** You lose the server value and double count on refetch.
- **Making the bookkeeping reactive.** Harmless but wasteful; and a \`watch\` on it would fire on every click.
- **Local \`collapsed\` refs.** They reset when the same comment remounts in the thread view.
- **Sorting \`props.comment.replies\` in place.** \`sort()\` mutates the reactive data and re-triggers every render; sort a copy.
- **Binding \`:aria-pressed="myVote === 1"\` without \`String()\`.** \`false\` would remove the attribute in Vue 3, so the button would not announce "not pressed".

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Data split:</strong> <span style="color:#f0e2c8;">"The server score is data; the user's vote is a separate reactive map, and points are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">score + myVote</code> in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Optimistic flow:</strong> <span style="color:#f0e2c8;">"A click sets the vote at once and sends it with a per-comment sequence number; success records the confirmed vote, failure restores it if the request is still the newest."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Sorting:</strong> <span style="color:#f0e2c8;">"Best and New are comparators applied per level to sorted copies; Best uses the server score so rows stay put."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Threads:</strong> <span style="color:#f0e2c8;">"Collapse is a reactive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> in the root, toggled by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[-]</code> or the labelled thread line, so it survives the thread view."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Depth:</strong> <span style="color:#f0e2c8;">"Past depth 3, Continue this thread sets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">threadId</code>, the root becomes that comment, and focus moves to the heading after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextTick</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">watch</code> the votes and send requests from there?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The request belongs to the user action, with its own sequence number and rollback target. A watcher would also fire for rollbacks and would need extra flags to tell them apart.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you debounce vote requests?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the instant UI, and per comment delay the network call with a timer that restarts on each click, sending only the final value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where would you persist collapse state?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> on the Set that writes the ids to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">localStorage</code> per thread, and an initial read on mount.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test the race?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mock <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sendVote</code> with promises you resolve by hand, click up then down, reject the first, resolve the second, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await flushPromises()</code>, and assert the down vote is shown.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Optimistic update | Show the result before the server confirms |
| Rollback | Restore the last confirmed value |
| Stale response guard | Only the newest request may change state |
| Stable ranking | Order by data that does not change under the user |

---

**Conclusion:** In Vue, a voting thread is a reactive vote map beside untouched server data, an optimistic flow with a confirmed rollback target and a sequence guard, per-level sorted copies on stable data, a lifted reactive \`Set\` for collapse, and a focus-managed continue-thread view.`,
        files: {
          "/src/App.vue": `<script setup>
import { computed, nextTick, provide, reactive, ref } from "vue";
import Comment from "./components/Comment.vue";
import { initialComments, sortLevel, findComment, sendVote } from "./thread.js";

const comments = initialComments; // read-only here: only votes change
const sort = ref("best");
const votes = reactive({}); // id -> -1 | 0 | 1, shown optimistically
const collapsed = reactive(new Set());
const threadId = ref(null); // "continue this thread" root, or null
const simulateFailure = ref(false);
const status = ref("");
const heading = ref(null);
// Bookkeeping that never renders: plain objects, not reactive.
const confirmed = {}; // id -> last vote the server accepted
const latest = {}; // id -> sequence number of the newest request

const root = computed(() =>
  threadId.value
    ? [findComment(comments, threadId.value)]
    : sortLevel(comments, sort.value),
);

function vote(comment, dir) {
  const id = comment.id;
  const next = (votes[id] || 0) === dir ? 0 : dir;
  votes[id] = next; // 1. optimistic
  const seq = (latest[id] || 0) + 1;
  latest[id] = seq;
  sendVote(id, next, simulateFailure.value).then(
    () => {
      if (latest[id] === seq) confirmed[id] = next;
    },
    () => {
      // 2. roll back only if no newer click replaced this one
      if (latest[id] !== seq) return;
      votes[id] = confirmed[id] || 0;
      status.value =
        "Could not save your vote on the comment by " +
        comment.author +
        ". It was restored.";
    },
  );
}

function toggleCollapsed(id) {
  if (collapsed.has(id)) collapsed.delete(id);
  else collapsed.add(id);
}

async function openThread(id) {
  threadId.value = id;
  await nextTick();
  heading.value.focus();
}

provide(
  "discussion",
  reactive({ votes, collapsed, sort, vote, toggleCollapsed, openThread }),
);
</script>

<template>
  <div class="app">
    <div class="bar">
      <h1
        ref="heading"
        tabindex="-1"
      >{{ threadId ? 'Thread' : 'Discussion' }}</h1>
      <label>Sort
        <select v-model="sort" data-testid="sort">
          <option value="best">Best</option>
          <option value="new">New</option>
        </select>
      </label>
    </div>
    <label class="fail">
      <input
        v-model="simulateFailure"
        type="checkbox"
        data-testid="fail"
      /> Simulate vote failures
    </label>
    <button
      v-if="threadId"
      class="back"
      data-testid="back"
      @click="openThread(null)"
    >← Back to all comments</button>
    <ul class="thread">
      <Comment v-for="c in root" :key="c.id" :comment="c" :depth="0" />
    </ul>
    <p class="status" role="status" data-testid="status">{{ status }}</p>
  </div>
</template>

<style>
body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.app {
  max-width: 600px;
  margin: 0 auto;
  padding: 16px;
}
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
h1 {
  font-size: 18px;
  margin: 0;
  outline: none;
}
select,
button {
  background: #1d2230;
  color: #e6e6e6;
  border: 1px solid #343b4f;
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
}
.fail {
  display: block;
  margin: 8px 0;
  color: #9aa3b5;
  font-size: 13px;
}
.back {
  margin-bottom: 8px;
}
.thread,
.replies {
  list-style: none;
  margin: 0;
  padding: 0;
}
.comment article {
  padding: 6px 0;
}
.comment header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.toggle {
  border: none;
  background: none;
  color: #8a93a8;
  padding: 0 2px;
  font-family: monospace;
}
.points {
  color: #9aa3b5;
  font-size: 13px;
}
.hidden-note {
  color: #8a93a8;
  font-size: 13px;
  font-style: italic;
}
.text {
  margin: 4px 0 6px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.actions {
  display: flex;
  gap: 6px;
}
.vote {
  width: 32px;
  padding: 2px 0;
}
.vote.up.on {
  color: #ff9e64;
  border-color: #ff9e64;
}
.vote.down.on {
  color: #7aa2f7;
  border-color: #7aa2f7;
}
.branch {
  display: flex;
}
.rail {
  flex: 0 0 14px;
  margin: 0 6px 0 4px;
  padding: 0;
  border: none;
  border-radius: 0;
  background: none;
  border-left: 2px solid #262c3b;
}
.rail:hover,
.rail:focus-visible {
  border-left-color: #6ea8ff;
}
.replies {
  flex: 1;
  min-width: 0;
}
.continue {
  margin: 4px 0 8px 22px;
  color: #8ab4ff;
  background: none;
  border: none;
}
.status {
  min-height: 1.2em;
  color: #ff8a80;
  font-size: 13px;
}
</style>
`,
          "/src/components/Comment.vue": `<script setup>
import { computed, inject } from "vue";
import { MAX_DEPTH, countAll, sortLevel } from "../thread.js";

const props = defineProps({
  comment: { type: Object, required: true },
  depth: { type: Number, default: 0 },
});
// Shared state and actions from App.vue: votes, collapsed,
// sort, vote(), toggleCollapsed(), openThread()
const ctx = inject("discussion");

const myVote = computed(() => ctx.votes[props.comment.id] || 0);
const points = computed(() => props.comment.score + myVote.value);
const collapsed = computed(() => ctx.collapsed.has(props.comment.id));
const replies = computed(() => sortLevel(props.comment.replies, ctx.sort));
const hidden = computed(() => countAll(props.comment.replies));
const tooDeep = computed(
  () => props.depth >= MAX_DEPTH && replies.value.length > 0,
);
</script>

<template>
  <li class="comment" :data-id="comment.id" :data-depth="depth">
    <article :aria-label="'Comment by ' + comment.author">
      <header>
        <button class="toggle" data-testid="toggle" :aria-expanded="String(!collapsed)"
          :aria-label="(collapsed ? 'Expand' : 'Collapse') + ' thread by ' + comment.author"
          @click="ctx.toggleCollapsed(comment.id)">{{ collapsed ? '[+]' : '[-]' }}</button>
        <strong>{{ comment.author }}</strong>
        <span
          class="points"
          data-testid="points"
        >{{ points }} {{ Math.abs(points) === 1 ? 'point' : 'points' }}</span>
        <span
          v-if="collapsed && hidden"
          class="hidden-note"
        >{{ hidden }} hidden</span>
      </header>
      <template v-if="!collapsed">
        <p class="text">{{ comment.text }}</p>
        <div class="actions">
          <button class="vote up" :class="{ on: myVote === 1 }" data-testid="up" :aria-pressed="String(myVote === 1)"
            :aria-label="'Upvote comment by ' + comment.author" @click="ctx.vote(comment, 1)">▲</button>
          <button class="vote down" :class="{ on: myVote === -1 }" data-testid="down" :aria-pressed="String(myVote === -1)"
            :aria-label="'Downvote comment by ' + comment.author" @click="ctx.vote(comment, -1)">▼</button>
        </div>
      </template>
    </article>
    <template v-if="!collapsed && replies.length">
      <button
        v-if="tooDeep"
        class="continue"
        data-testid="continue"
        @click="ctx.openThread(comment.id)"
      >
        Continue this thread ({{ hidden }} more)
      </button>
      <div v-else class="branch">
        <button class="rail" data-testid="rail" :aria-label="'Collapse thread by ' + comment.author"
          @click="ctx.toggleCollapsed(comment.id)"></button>
        <ul class="replies">
          <Comment
            v-for="r in replies"
            :key="r.id"
            :comment="r"
            :depth="depth + 1"
          />
        </ul>
      </div>
    </template>
  </li>
</template>
`,
          "/src/thread.js": `// Data, sorting and a SIMULATED vote API (no network in the playground).
// \`score\` is the server score WITHOUT my vote; my vote lives in a separate map.

// depth 0..3 render inline, deeper replies get "Continue this thread"
export const MAX_DEPTH = 3;

export const initialComments = [
  {
    id: "c1",
    author: "Asha",
    at: 10,
    score: 10,
    text: "Lazy-load folder children on first expand?",
    replies: [
      {
        id: "c2",
        author: "Ben",
        at: 40,
        score: 5,
        text: "Yes, and cache them by folder id.",
        replies: [
          {
            id: "c3",
            author: "Chen",
            at: 50,
            score: 1,
            text: "Invalidate the cache on rename.",
            replies: [
              {
                id: "c7",
                author: "Dana",
                at: 70,
                score: 2,
                text: "Or key it by path and id.",
                replies: [
                  {
                    id: "c8",
                    author: "Eli",
                    at: 80,
                    score: 1,
                    text: "Ids survive a rename, paths do not.",
                    replies: [],
                  },
                ],
              },
            ],
          },
          {
            id: "c4",
            author: "Fay",
            at: 60,
            score: 3,
            text: "Show a spinner row meanwhile.",
            replies: [],
          },
        ],
      },
      {
        id: "c5",
        author: "Gus",
        at: 30,
        score: 9,
        text: "Only for trees over a few thousand nodes.",
        replies: [],
      },
    ],
  },
  {
    id: "c6",
    author: "Hana",
    at: 5,
    score: 15,
    text: "Ship the eager version first, measure later.",
    replies: [],
  },
];

export const SORTS = {
  // ranked by server score, ties: older first
  best: (a, b) => b.score - a.score || a.at - b.at,
  new: (a, b) => b.at - a.at,
};

export const sortLevel = (list, sort) => [...list].sort(SORTS[sort]);
export const countAll = (list) =>
  list.reduce((n, c) => n + 1 + countAll(c.replies), 0);

export function findComment(list, id) {
  for (const c of list) {
    if (c.id === id) return c;
    const hit = findComment(c.replies, id);
    if (hit) return hit;
  }
  return null;
}

// Simulated server: resolves after 300 ms, or
// rejects when \`fail\` was on at send time.
export function sendVote(id, vote, fail) {
  return new Promise((resolve, reject) => {
    setTimeout(
      () => (fail ? reject(new Error("Network error")) : resolve({ id, vote })),
      300,
    );
  });
}
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Experienced Angular developers who can build recursive comments with signals and need optimistic voting, sorting, collapsible threads and a depth limit.
**Difficulty:** Hard

> **How to read this doc:** Plain words first, then a <code>📌 Interview term:</code> tag. It assumes [Build a Nested Comments widget](/interview-question/build-a-nested-comments-widget). The vote API is **simulated** in-file (300 ms \`setTimeout\` and a failure switch); the solution was verified on Angular 22.2.3 in AOT and in the playground JIT.

## 1. Why This Even Matters — A Story First

With a slow ballot counter, the class board should move when you vote, go back when a ballot is rejected, and end at your last choice even if you changed your mind before the counter answered. Add sorting that does not shuffle, folds for side threads and a "continue" link for deep ones, and you have this widget.

## 2. Requirements and Plan

Up/down votes with \`aria-pressed\`, optimistic with rollback and a stale-response guard, Best/New per level on the server score, collapse via \`[-]\` or the thread line, depth limit with focus on the heading.

| Piece | Angular tool |
| :--- | :--- |
| \`votes\`, \`collapsed\`, \`sort\`, \`threadId\`, \`simulateFailure\`, \`status\` | \`signal\`s in \`Discussion\`, provided on \`AppComponent\` |
| \`root\` | \`computed\` |
| \`confirmed\`, \`latest\` | plain private fields: bookkeeping that never renders |
| points, sorted replies, \`tooDeep\` | getters in \`CommentComponent\` (they depend on \`@Input\`) |

📌 **Interview term: Optimistic update** — show the result first, then confirm or undo it when the server answers.

## 3. Build It Step by Step

### Step 1: The vote flow

~~~ts
vote(comment: Post, dir: Vote) {
  const id = comment.id;
  const next: Vote = this.myVote(id) === dir ? 0 : dir;
  this.votes.update((v) => ({ ...v, [id]: next })); // 1. optimistic
  const seq = (this.latest[id] ?? 0) + 1;
  this.latest[id] = seq;
  sendVote(id, next, this.simulateFailure()).then(
    () => {
      if (this.latest[id] === seq) this.confirmed[id] = next;
    },
    () => {
      // 2. roll back unless superseded
      if (this.latest[id] !== seq) return;
      this.votes.update((v) => ({
        ...v,
        [id]: this.confirmed[id] ?? 0,
      }));
      this.status.set(
        "Could not save your vote on the comment by " +
          comment.author +
          ". It was restored.",
      );
    },
  );
}
~~~

📌 **Interview term: Rollback** — restore the last confirmed value after a failure. 📌 **Interview term: Stale response guard** — a per-comment sequence number; only the newest response may roll back.

\`votes.update\` returns a new object each time, which is what tells the signal it changed. The promise callbacks set signals, so zoneless Angular re-renders after the 300 ms answer without zone.js; a plain field set there would not.

### Step 2: Getters over inputs

~~~ts
get myVote() {
  return this.d.myVote(this.comment.id);
}
get points() {
  return this.comment.score + this.myVote;
}
get collapsed() {
  return this.d.collapsed().has(this.comment.id);
}
get replies() {
  return sortLevel(this.comment.replies, this.d.sort());
}
get hidden() {
  return countAll(this.comment.replies);
}
get tooDeep() {
  return this.depth >= MAX_DEPTH && this.comment.replies.length > 0;
}
~~~

These read \`@Input\` fields and signals; the template re-evaluates them on each check, and the signals keep them reactive (see [computed vs getters](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls)). Best sorts by the server score only, so a vote never moves a row.

### Step 3: Thread line and depth limit

~~~ts
@if (!collapsed && replies.length) {
  @if (tooDeep) {
    <button class="continue" data-testid="continue" (click)="d.openThread(comment.id)">
      Continue this thread ({{ hidden }} more)
    </button>
  } @else {
    <div class="branch">
      <button class="rail" data-testid="rail" [attr.aria-label]="'Collapse thread by ' + comment.author"
        (click)="d.toggleCollapsed(comment.id)"></button>
      <ul class="replies">
        @for (r of replies; track r.id) {
          <li app-comment [comment]="r" [depth]="depth + 1"></li>
        }
      </ul>
    </div>
  }
}
~~~

The thread line is a labelled button. \`collapsed\` is a signal holding a \`Set\` in the service, because the same comment is rendered again inside the thread view. The component imports itself through \`forwardRef\`, which the playground JIT needs for recursion.

### Step 4: Focus on view change

~~~ts
openThread(id: string | null) {
  this.threadId.set(id);
  afterNextRender(
    () =>
      this.host.nativeElement.querySelector<HTMLElement>("h1")?.focus(),
    { injector: this.injector },
  );
}
~~~

\`afterNextRender\` runs after the new view is in the DOM, then the heading takes focus.

## 4. Verified

Run in AOT with strict templates and in the runtime JIT, both with no providers; the simulated API answers after 300 ms and the driver waits \`settle(350)\`. Both runs printed the same lines; JIT shown, unedited (the \`RENDERED\` line differs from React only in template whitespace):

~~~text
[angular:playground] RENDERED: DiscussionSort BestNew Simulate vote failures [-]Hana15 pointsShip the eager version first, measure later.▲▼[-]Asha10 pointsLazy-load folder children on first expand?▲▼[-]Gus9 pointsOnly for trees over a few thousand nodes.▲▼[-]Ben5 pointsYes, and cache them by folder id.▲▼[-]Fay3 pointsShow a spinner row meanwhile.▲▼[-]Chen1 pointInvalidate the cache on rename.▲▼[-]Dana2 pointsOr key it by path and id.▲▼ Continue this thread (1 more)
[angular:playground] Best: c6(15) c1(10) .c5(9) .c2(5) ..c4(3) ..c3(1) ...c7(2) | continue: Continue this thread (1 more)
[angular:playground] New:  c1(10) .c2(5) ..c4(3) ..c3(1) ...c7(2) .c5(9) c6(15)
[angular:playground] upvote c5 (before the server answers): 10 points | pressed: true
[angular:playground]   after 350 ms: 10 points | order unchanged: true
[angular:playground] upvote c5 again removes it: 9 points | pressed: false
[angular:playground] downvote c6: 14 points
[angular:playground] then upvote c6 (switches): 16 points | down pressed: false
[angular:playground] failing upvote on c2, optimistic: 6 points
[angular:playground]   after the failure: 5 points | Could not save your vote on the comment by Ben. It was restored.
[angular:playground] race on c4: A=up (will fail), B=down (will succeed), shown now: 2 points
[angular:playground]   after both answer: 2 points | down pressed: true | (A was stale, so no rollback)
[angular:playground] click the thread line of c2: false | 4 hidden | c6(16) c1(10) .c5(9) .c2(5)
[angular:playground] expand c2 with [+]: true | rows: 7
[angular:playground] continue this thread: Thread | focus on heading: true | c7(2) .c8(1)
[angular:playground] back: Discussion | rows: 7 | c4 kept its vote: 2 points
~~~

Behaviour matches React and Vue line for line, including the \`c4\` race where the stale failure is ignored. No \`console.error\` in either mode.

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Same arrow twice | Removes the vote |
| Old failure after a newer click | Ignored |
| Newest request fails | Back to confirmed, message in \`role="status"\` |
| Screen readers | \`[attr.aria-pressed]\`, \`[attr.aria-expanded]\`, labelled thread lines, heading focus on view change |

## 6. Common Pitfalls

- **Setting a plain field in the promise callback.** Zoneless Angular does not re-render; use signals.
- **Mutating \`votes()\` in place.** Same reference, no update; return a new object.
- **Making \`confirmed\` and \`latest\` signals.** They would schedule renders for values nobody shows.
- **Re-ranking on every vote.** Rows jump; rank on server data.
- **Local \`collapsed\` signals.** They reset when a comment is rendered again in the thread view.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Data split:</strong> <span style="color:#f0e2c8;">"Server scores are read-only data; the user's votes are a signal map, and the component shows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">score + myVote</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Optimistic flow:</strong> <span style="color:#f0e2c8;">"A click updates the votes signal immediately and sends the request with a sequence number; success stores the confirmed vote, failure restores it only if the request is still the newest."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Zoneless:</strong> <span style="color:#f0e2c8;">"The promise callbacks write signals, so the view updates after the response without zone.js."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Sorting and threads:</strong> <span style="color:#f0e2c8;">"Best and New sort copies per level on the server score; collapse is a signal holding a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> of ids, toggled by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[-]</code> or the thread line."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Depth:</strong> <span style="color:#f0e2c8;">"Past depth 3, Continue this thread sets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">threadId</code>, the root becomes that comment, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterNextRender</code> focuses the heading."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would RxJS make the race easier?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Subject</code> of vote intents per comment with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap</code> to the API cancels or ignores earlier requests automatically, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">catchError</code> can emit the rollback. The sequence number is the same idea without RxJS.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you debounce vote requests?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pipe the per-comment intents through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">debounceTime(300)</code> before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap</code>, keeping the instant optimistic update outside the stream.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you persist collapse state?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect</code> that writes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">collapsed()</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">localStorage</code>, plus reading it when the service is created.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test the race?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Replace <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sendVote</code> with controllable promises, click up then down, reject the first and resolve the second, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await fixture.whenStable()</code>, and assert the down vote.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Optimistic update | Show the result before the server confirms |
| Rollback | Restore the last confirmed value |
| Stale response guard | Only the newest request may change state |
| Stable ranking | Order by data that does not change under the user |

---

**Conclusion:** In Angular, a voting thread is a signal map of the user's votes beside read-only scores, an optimistic flow with a confirmed rollback target and a sequence guard, signals written from promise callbacks for zoneless rendering, stable per-level sorting, a lifted \`Set\` signal for collapse, and \`afterNextRender\` focus for the continue-thread view.`,
        files: {
          "/src/app/app.component.ts": `import { Component, ViewEncapsulation, inject } from "@angular/core";
import { Discussion } from "./discussion";
import { CommentComponent } from "./comment.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommentComponent],
  providers: [Discussion],
  encapsulation: ViewEncapsulation.None,
  template: \`
    <div class="app">
      <div class="bar">
        <h1 tabindex="-1">{{ d.threadId() ? 'Thread' : 'Discussion' }}</h1>
        <label>Sort
          <select
            #s
            data-testid="sort"
            [value]="d.sort()"
            (change)="d.sort.set($any(s.value))"
          >
            <option value="best">Best</option>
            <option value="new">New</option>
          </select>
        </label>
      </div>
      <label class="fail">
        <input
          #f
          type="checkbox"
          data-testid="fail"
          [checked]="d.simulateFailure()"
          (change)="d.simulateFailure.set(f.checked)"
        /> Simulate vote failures
      </label>
      @if (d.threadId()) {
        <button
          class="back"
          data-testid="back"
          (click)="d.openThread(null)"
        >← Back to all comments</button>
      }
      <ul class="thread">
        @for (c of d.root(); track c.id) {
          <li app-comment [comment]="c" [depth]="0"></li>
        }
      </ul>
      <p class="status" role="status" data-testid="status">{{ d.status() }}</p>
    </div>
  \`,
  styles: [
    \`
    body { margin: 0; background: #0f1115; color: #e6e6e6; font-family: system-ui, sans-serif; }
    .app { max-width: 600px; margin: 0 auto; padding: 16px; }
    .bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    h1 { font-size: 18px; margin: 0; outline: none; }
    select, button { background: #1d2230; color: #e6e6e6; border: 1px solid #343b4f; border-radius: 6px; padding: 4px 8px; cursor: pointer; font: inherit; font-size: 13px; }
    .fail { display: block; margin: 8px 0; color: #9aa3b5; font-size: 13px; }
    .back { margin-bottom: 8px; }
    .thread, .replies { list-style: none; margin: 0; padding: 0; }
    .comment article { padding: 6px 0; }
    .comment header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .toggle { border: none; background: none; color: #8a93a8; padding: 0 2px; font-family: monospace; }
    .points { color: #9aa3b5; font-size: 13px; }
    .hidden-note { color: #8a93a8; font-size: 13px; font-style: italic; }
    .text { margin: 4px 0 6px; line-height: 1.4; overflow-wrap: anywhere; }
    .actions { display: flex; gap: 6px; }
    .vote { width: 32px; padding: 2px 0; }
    .vote.up.on { color: #ff9e64; border-color: #ff9e64; }
    .vote.down.on { color: #7aa2f7; border-color: #7aa2f7; }
    .branch { display: flex; }
    .rail { flex: 0 0 14px; margin: 0 6px 0 4px; padding: 0; border: none; border-radius: 0; background: none; border-left: 2px solid #262c3b; }
    .rail:hover, .rail:focus-visible { border-left-color: #6ea8ff; }
    .replies { flex: 1; min-width: 0; }
    .continue { margin: 4px 0 8px 22px; color: #8ab4ff; background: none; border: none; }
    .status { min-height: 1.2em; color: #ff8a80; font-size: 13px; }
  \`,
  ],
})
export class AppComponent {
  d = inject(Discussion);
}
`,
          "/src/app/comment.component.ts": `import { Component, Input, forwardRef, inject } from "@angular/core";
import { Discussion } from "./discussion";
import { MAX_DEPTH, Post, countAll, sortLevel } from "./thread";

@Component({
  selector: "li[app-comment]",
  standalone: true,
  imports: [forwardRef(() => CommentComponent)],
  host: {
    class: "comment",
    "[attr.data-id]": "comment.id",
    "[attr.data-depth]": "depth",
  },
  template: \`
    <article [attr.aria-label]="'Comment by ' + comment.author">
      <header>
        <button class="toggle" data-testid="toggle" [attr.aria-expanded]="!collapsed"
          [attr.aria-label]="(collapsed ? 'Expand' : 'Collapse') + ' thread by ' + comment.author"
          (click)="d.toggleCollapsed(comment.id)">{{ collapsed ? '[+]' : '[-]' }}</button>
        <strong>{{ comment.author }}</strong>
        <span
          class="points"
          data-testid="points"
        >{{ points }} {{ points === 1 || points === -1 ? 'point' : 'points' }}</span>
        @if (collapsed && hidden) {
          <span class="hidden-note">{{ hidden }} hidden</span>
        }
      </header>
      @if (!collapsed) {
        <p class="text">{{ comment.text }}</p>
        <div class="actions">
          <button class="vote up" [class.on]="myVote === 1" data-testid="up" [attr.aria-pressed]="myVote === 1"
            [attr.aria-label]="'Upvote comment by ' + comment.author" (click)="d.vote(comment, 1)">▲</button>
          <button class="vote down" [class.on]="myVote === -1" data-testid="down" [attr.aria-pressed]="myVote === -1"
            [attr.aria-label]="'Downvote comment by ' + comment.author" (click)="d.vote(comment, -1)">▼</button>
        </div>
      }
    </article>
    @if (!collapsed && replies.length) {
      @if (tooDeep) {
        <button
          class="continue"
          data-testid="continue"
          (click)="d.openThread(comment.id)"
        >
          Continue this thread ({{ hidden }} more)
        </button>
      } @else {
        <div class="branch">
          <button class="rail" data-testid="rail" [attr.aria-label]="'Collapse thread by ' + comment.author"
            (click)="d.toggleCollapsed(comment.id)"></button>
          <ul class="replies">
            @for (r of replies; track r.id) {
              <li app-comment [comment]="r" [depth]="depth + 1"></li>
            }
          </ul>
        </div>
      }
    }
  \`,
})
export class CommentComponent {
  @Input({ required: true }) comment!: Post;
  @Input() depth = 0;
  d = inject(Discussion);

  get myVote() {
    return this.d.myVote(this.comment.id);
  }
  get points() {
    return this.comment.score + this.myVote;
  }
  get collapsed() {
    return this.d.collapsed().has(this.comment.id);
  }
  get replies() {
    return sortLevel(this.comment.replies, this.d.sort());
  }
  get hidden() {
    return countAll(this.comment.replies);
  }
  get tooDeep() {
    return this.depth >= MAX_DEPTH && this.comment.replies.length > 0;
  }
}
`,
          "/src/app/discussion.ts": `import {
  ElementRef,
  Injectable,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
} from "@angular/core";
import {
  Post,
  SortKey,
  Vote,
  initialComments,
  sortLevel,
  findComment,
  sendVote,
} from "./thread";

@Injectable()
export class Discussion {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private injector = inject(Injector);

  readonly comments = initialComments; // read-only here: only votes change
  readonly sort = signal<SortKey>("best");
  readonly votes = signal<Record<string, Vote>>({}); // shown optimistically
  readonly collapsed = signal<ReadonlySet<string>>(new Set());
  readonly threadId = signal<string | null>(null);
  readonly simulateFailure = signal(false);
  readonly status = signal("");
  // Bookkeeping that never renders: plain fields, not signals.
  private confirmed: Record<string, Vote> = {};
  private latest: Record<string, number> = {};

  readonly root = computed(() => {
    const id = this.threadId();
    const hit = id ? findComment(this.comments, id) : null;
    return hit ? [hit] : sortLevel(this.comments, this.sort());
  });

  myVote(id: string): Vote {
    return this.votes()[id] ?? 0;
  }

  vote(comment: Post, dir: Vote) {
    const id = comment.id;
    const next: Vote = this.myVote(id) === dir ? 0 : dir;
    this.votes.update((v) => ({ ...v, [id]: next })); // 1. optimistic
    const seq = (this.latest[id] ?? 0) + 1;
    this.latest[id] = seq;
    sendVote(id, next, this.simulateFailure()).then(
      () => {
        if (this.latest[id] === seq) this.confirmed[id] = next;
      },
      () => {
        // 2. roll back unless superseded
        if (this.latest[id] !== seq) return;
        this.votes.update((v) => ({ ...v, [id]: this.confirmed[id] ?? 0 }));
        this.status.set(
          "Could not save your vote on the comment by " +
            comment.author +
            ". It was restored.",
        );
      },
    );
  }

  toggleCollapsed(id: string) {
    this.collapsed.update((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  openThread(id: string | null) {
    this.threadId.set(id);
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLElement>("h1")?.focus(),
      { injector: this.injector },
    );
  }
}
`,
          "/src/app/thread.ts": `// Data, sorting and a SIMULATED vote API (no network in the playground).
// \`score\` is the server score WITHOUT my vote; my vote lives in a separate map.

export interface Post {
  id: string;
  author: string;
  at: number;
  score: number;
  text: string;
  replies: Post[];
}
export type SortKey = "best" | "new";
export type Vote = -1 | 0 | 1;

// depth 0..3 render inline, deeper replies get "Continue this thread"
export const MAX_DEPTH = 3;

export const initialComments: Post[] = [
  {
    id: "c1",
    author: "Asha",
    at: 10,
    score: 10,
    text: "Lazy-load folder children on first expand?",
    replies: [
      {
        id: "c2",
        author: "Ben",
        at: 40,
        score: 5,
        text: "Yes, and cache them by folder id.",
        replies: [
          {
            id: "c3",
            author: "Chen",
            at: 50,
            score: 1,
            text: "Invalidate the cache on rename.",
            replies: [
              {
                id: "c7",
                author: "Dana",
                at: 70,
                score: 2,
                text: "Or key it by path and id.",
                replies: [
                  {
                    id: "c8",
                    author: "Eli",
                    at: 80,
                    score: 1,
                    text: "Ids survive a rename, paths do not.",
                    replies: [],
                  },
                ],
              },
            ],
          },
          {
            id: "c4",
            author: "Fay",
            at: 60,
            score: 3,
            text: "Show a spinner row meanwhile.",
            replies: [],
          },
        ],
      },
      {
        id: "c5",
        author: "Gus",
        at: 30,
        score: 9,
        text: "Only for trees over a few thousand nodes.",
        replies: [],
      },
    ],
  },
  {
    id: "c6",
    author: "Hana",
    at: 5,
    score: 15,
    text: "Ship the eager version first, measure later.",
    replies: [],
  },
];

export const SORTS: Record<SortKey, (a: Post, b: Post) => number> = {
  // ranked by server score, ties: older first
  best: (a, b) => b.score - a.score || a.at - b.at,
  new: (a, b) => b.at - a.at,
};

export const sortLevel = (list: Post[], sort: SortKey): Post[] =>
  [...list].sort(SORTS[sort]);
export const countAll = (list: Post[]): number =>
  list.reduce((n: number, c: Post): number => n + 1 + countAll(c.replies), 0);

export function findComment(list: Post[], id: string): Post | null {
  for (const c of list) {
    if (c.id === id) return c;
    const hit = findComment(c.replies, id);
    if (hit) return hit;
  }
  return null;
}

// Simulated server: resolves after 300 ms, or
// rejects when \`fail\` was on at send time.
export function sendVote(
  id: string,
  vote: Vote,
  fail: boolean,
): Promise<{ id: string; vote: Vote }> {
  return new Promise((resolve, reject) => {
    setTimeout(
      () => (fail ? reject(new Error("Network error")) : resolve({ id, vote })),
      300,
    );
  });
}
`,
        },
      },
    },
  },
];

export default augments;
