"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; fallbackLabel: string };
type State = { hasError: boolean; error?: Error };

export default class BlockErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error(`[BlockErrorBoundary:${this.props.fallbackLabel}]`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-200">
          <div className="font-bold">This block failed to render — {this.props.fallbackLabel}</div>
          <div className="mt-1 text-[11px] text-muted truncate">{this.state.error?.message ?? "Unknown error"}</div>
          <div className="mt-2 text-[11px]">The rest of the page is unaffected. Try refreshing — the error is isolated to this block.</div>
        </div>
      );
    }
    return this.props.children;
  }
}
