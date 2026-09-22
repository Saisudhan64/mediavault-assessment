import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Something went wrong',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="empty">
          <p>Something went wrong.</p>
          <p className="muted">{this.state.message}</p>
          <button onClick={() => this.setState({ hasError: false, message: '' })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}