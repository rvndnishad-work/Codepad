# Interview room tools

Live interview rooms have a dock of shared tools (whiteboard, code pad, shared
notes, question card, ranking board, timer). The interviewer switches a tool
on from **Tools** and it opens for the candidate straight away; the candidate
follows whatever is presented.

## How it fits together

| Piece | File | Job |
| :--- | :--- | :--- |
| Tool list and rules | `src/lib/interview/tools.ts` | Ids, labels, descriptions, default formats, the switchboard reducer (`applyToolsAction`), roles. Pure, unit tested. |
| Tool UIs | `src/app/interview/[id]/tools/registry.tsx` | Maps each id to its stage component and optional header controls. |
| Icons | `src/app/interview/[id]/tools/icons.ts` | One icon per id. Kept apart so the wizard does not load the editors. |
| Dock, stage, Tools menu | `src/app/interview/[id]/tools/InterviewToolbox.tsx` | Generic. It never needs to change for a new tool. |
| Sync | `src/app/interview/[id]/tools/useToolsRoom.ts` and `src/app/api/interview/[id]/tools/route.ts` | One shared Yjs doc per interview (server relay plus WebRTC) and the interviewer-only switchboard in `InterviewSession.toolsJson`. |

There are two kinds of state:

- **Shared content** (drawings, text, lists) lives in the Yjs doc, `room.doc`. Both sides can edit it and it is saved on the server, so a refresh or a late joiner sees everything.
- **Switchboard** (which tools are on, what is presented, the question card, the timer) lives in `toolsJson`. Only interviewers can change it, through `PATCH /api/interview/[id]/tools`.

## Adding a tool

1. **Id and description.** Add the id to `TOOL_IDS` in `src/lib/interview/tools.ts` and an entry to `TOOL_DEFS` (label, blurb, `goodFor` tags, `stage: true`, and `defaultFor`, the formats that start with it switched on). The order of `TOOL_IDS` is the dock order.
2. **Icon.** Add a lucide icon to `TOOL_ICON` in `tools/icons.ts`.
3. **UI.** Write the component in `tools/stages/<Name>.tsx`. It receives `ToolProps` (`tools/types.ts`): `room`, `state`, `isInterviewer`, `readOnly`, `dark`, `guideQuestions` and `run`. Register it in `TOOL_PLUGINS` in `tools/registry.tsx`. For a heavy library, load it with `next/dynamic` and `ssr: false`, as the whiteboard does.
4. **Shared content.** Keep the tool's data under its own key in the doc, for example `room.doc.getMap("<tool id>")` or `room.doc.getText("<tool id>")`. Never write default content when the tool mounts: both browsers would insert it and it would appear twice. Show a placeholder instead.
5. **Interviewer-only state.** Only if the tool has state that the candidate must not change: add a `ToolsAction`, handle it in `applyToolsAction`, add its zod schema to `actionSchema` in the route, and add a unit test in `tests/unit/interview-tools.test.ts`.
6. **Check.** Run `npx tsc --noEmit`, which fails while any id is missing from `TOOL_DEFS`, `TOOL_ICON` or `TOOL_PLUGINS`. Then run `npx vitest run tests/unit/interview-tools.test.ts` and try it with two browsers: log in as the interviewer, and open the room as the candidate with `?token=<shareToken>`.

The Tools menu, the dock, the wizard's "Tools in the room" picker and the API validation all pick the new tool up from these lists; none of them need editing.

## Rules to keep

- The candidate must never receive reference answers. Anything a tool shows comes from the doc or the switchboard, which both sides can read.
- Tools must work read-only once the interview ends (`readOnly`).
- Use the site colour tokens, never hex colours.
