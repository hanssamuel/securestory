import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

function ErrorFallback({ error }: { error: any }) {
  return (
    <div style={{ fontFamily: "system-ui", padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>SecureStory</h1>
      <div style={{ color: "crimson", whiteSpace: "pre-wrap" }}>
        App crashed: {String(error?.message || error)}
      </div>
      <p style={{ opacity: 0.7 }}>
        Open DevTools Console (Cmd + Option + J) to see the stack trace.
      </p>
    </div>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { error };
  }
  render() {
    if (this.state.error) return <ErrorFallback error={this.state.error} />;
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
