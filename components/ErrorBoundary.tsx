import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-container">
          <div className="error-boundary-content">
            <h1 className="error-boundary-title">应用出现错误</h1>
            <p className="error-boundary-description">
              应用在加载时遇到了错误。请检查浏览器控制台获取详细信息。
            </p>
            {this.state.error && (
              <div className="error-boundary-section">
                <h2 className="error-boundary-section-title">错误信息：</h2>
                <pre className="error-boundary-pre">
                  {this.state.error.toString()}
                </pre>
              </div>
            )}
            {this.state.errorInfo && (
              <div className="error-boundary-section">
                <h2 className="error-boundary-section-title">组件堆栈：</h2>
                <pre className="error-boundary-pre error-boundary-pre-stack">
                  {this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="error-boundary-button"
            >
              重新加载页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
