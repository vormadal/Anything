"use client";

import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-sm w-full">
            <p className="text-red-700 dark:text-red-300 font-medium mb-1">
              Failed to load this section
            </p>
            <p className="text-red-500 dark:text-red-400 text-sm mb-4">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <Button
              onClick={this.handleReset}
              variant="outline"
              size="sm"
              className="border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900"
            >
              Retry
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
