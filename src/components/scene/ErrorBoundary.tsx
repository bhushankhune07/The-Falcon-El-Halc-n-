import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class SceneErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SceneErrorBoundary caught WebGL/3D render error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center w-full h-full bg-slate-950 text-slate-100 p-6 border border-red-500/30 rounded-lg">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4 text-red-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">3D Scene Initialisation Failed</h3>
          <p className="text-sm text-slate-400 text-center max-w-md mb-4">
            {this.state.error?.message || 'WebGL hardware acceleration issue or context loss.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-md transition-colors shadow-sm"
          >
            Retry WebGL Context
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
