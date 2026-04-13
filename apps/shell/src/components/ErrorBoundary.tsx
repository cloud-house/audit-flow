import React from 'react';

interface Props {
  name: string;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error(`[ErrorBoundary:${this.props.name}]`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-gray-600 font-medium">{this.props.name} failed to load</p>
          <p className="text-sm text-gray-400 mt-1">{this.state.error?.message}</p>
          <button
            className="mt-4 px-4 py-2 text-sm bg-brand-600 text-white rounded hover:bg-brand-700"
            onClick={() => this.setState({ hasError: false })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
