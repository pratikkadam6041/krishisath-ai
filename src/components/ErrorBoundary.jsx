/**
 * ErrorBoundary.jsx — Catches React component crashes so a single
 * broken screen never blanks the entire app.
 */
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[KrishiSarth] Screen crashed:', error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Navigate to home on reset
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f8f3] px-6 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] bg-red-100 text-4xl">
            🌾
          </div>
          <h1 className="text-2xl font-black text-[#1a3d1a]">कुछ गलत हो गया</h1>
          <p className="mt-2 text-base text-slate-500">Something went wrong on this page.</p>
          {this.state.error && (
            <p className="mt-2 max-w-xs rounded-xl bg-red-50 px-4 py-2 font-mono text-xs text-red-700 break-all">
              {this.state.error.message}
            </p>
          )}
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-8 rounded-2xl bg-[#1a3d1a] px-8 py-4 text-sm font-black text-white shadow-lg"
          >
            वापस जाएं / Go Back Home
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
