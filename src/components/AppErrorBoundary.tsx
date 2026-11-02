import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorScreen } from '@/components/ui/Feedback';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  details: string[];
}

/**
 * Catches rendering errors so a broken screen never looks like lost data.
 * The user can retry or open troubleshooting without clearing storage.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, details: [] };

  static getDerivedStateFromError(): State {
    return { hasError: true, details: [] };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Tide hit a rendering error.', error, info.componentStack);
    if (import.meta.env.DEV) {
      this.setState({
        details: [
          error.message,
          ...(info.componentStack ? [info.componentStack.slice(0, 500)] : []),
        ],
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorScreen
          title="Tide hit an unexpected snag"
          message="Your saved records were not changed. Reload the app to try again, and export a backup before making any big changes."
          details={this.state.details}
          onRetry={() => window.location.reload()}
        />
      );
    }
    return this.props.children;
  }
}
