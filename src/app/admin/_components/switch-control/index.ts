/**
 * Three-state feature switch controls, shared by /admin/recruiters,
 * /admin/developers and /admin/switches.
 *
 * Server (page):
 *   import { loadSwitchViews } from "@/app/admin/_components/switch-control/views";
 *   const views = await loadSwitchViews({ side: "hiring" });
 *
 * Client:
 *   <SwitchControl view={v} />                  row: label, subtitle, segment, inline confirm
 *   <SwitchSegment value onSelect label />      the On / Read only / Off control alone
 *   <SwitchConfirm view target onCancel onDone /> the confirm panel alone
 *   setFeatureSwitch({ key, state, message, resumeAt, note })   server action
 *
 * views.ts is server-only and is not re-exported here, so this barrel is
 * safe to import from client components.
 */
export { default as SwitchControl, switchSubtitle } from "./SwitchControl";
export { default as SwitchSegment } from "./SwitchSegment";
export { default as SwitchConfirm } from "./SwitchConfirm";
export { setFeatureSwitch, type SetSwitchResult } from "./actions";
export { validateSwitchInput, STATE_LABELS, type SetSwitchInput } from "./validate";
export type { SwitchView, SwitchState, SwitchSide } from "./types";
