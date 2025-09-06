import React, { Component, ReactNode } from 'react';
import { MapPin, RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Map component error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-center space-y-4 max-w-md mx-auto p-6">
            <div className="flex justify-center">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Map Loading Error
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                The map component couldn't load properly. This might be due to a network issue or browser compatibility.
              </p>
              {this.state.error && (
                <details className="text-xs text-gray-500 mb-4">
                  <summary className="cursor-pointer font-medium">Error Details</summary>
                  <pre className="mt-2 text-left bg-gray-100 p-2 rounded text-xs overflow-auto">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
              
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <MapPin className="h-4 w-4" />
                <span>Map will be available soon</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MapErrorBoundary;
