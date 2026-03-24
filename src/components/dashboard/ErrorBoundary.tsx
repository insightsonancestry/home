"use client";

import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; resetKey: number; }

export class DashboardErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, resetKey: 0 };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Something went wrong.
          </p>
          <button
            onClick={() => this.setState((s) => ({ hasError: false, resetKey: s.resetKey + 1 }))}
            className="text-xs uppercase tracking-[2px] px-4 py-2 border rounded-sm"
            style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
          >
            Try again
          </button>
        </div>
      );
    }
    return <div key={this.state.resetKey}>{this.props.children}</div>;
  }
}
