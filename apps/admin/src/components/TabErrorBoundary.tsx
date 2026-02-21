"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  tabName: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class TabErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[${this.props.tabName}] Tab error:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="mb-2 font-mono text-sm text-cream">
            error loading {this.props.tabName}
          </p>
          <p className="mb-6 max-w-sm font-mono text-xs text-muted">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded-xl bg-white/5 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[2px] text-cream transition-colors hover:bg-white/10"
          >
            retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
