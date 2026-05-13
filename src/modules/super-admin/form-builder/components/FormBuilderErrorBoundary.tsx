/**
 * FormBuilderErrorBoundary
 * Specialized error boundary for form builder panels.
 * Provides a panel-level reset without navigating away from the editor.
 */
import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  /** Panel name shown in the error message */
  panelName?: string;
  /** Called when the user clicks "Close Panel" */
  onClose?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class FormBuilderErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[FormBuilderErrorBoundary:${this.props.panelName ?? 'unknown'}]`, error, info.componentStack);
  }

  handleRetry = () => this.setState({ hasError: false, error: null });

  handleClose = () => {
    this.setState({ hasError: false, error: null });
    this.props.onClose?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center p-6">
          <div className="max-w-sm w-full rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
            <div className="text-3xl mb-3">⚠️</div>
            <h3 className="text-base font-semibold text-red-800 dark:text-red-300">
              {this.props.panelName ?? 'Panel'} failed to load
            </h3>
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
            <div className="mt-4 flex gap-2 justify-center">
              <button
                onClick={this.handleRetry}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
              >
                Retry
              </button>
              {this.props.onClose && (
                <button
                  onClick={this.handleClose}
                  className="rounded-md bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Close Panel
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
