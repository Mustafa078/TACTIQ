import React, { Component } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Studio Error Boundary caught rendering error:", error, errorInfo);
  }

  handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            backgroundColor: "#080c14",
            color: "#f3f4f6",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            fontFamily: "sans-serif",
            textAlign: "center",
          }}
        >
          <h2 style={{ color: "#ef4444", marginBottom: "1rem", fontSize: "1.5rem" }}>
            Match View Render Error
          </h2>
          <p style={{ color: "#9ca3af", maxWidth: "520px", marginBottom: "1.5rem", lineHeight: "1.5" }}>
            An issue occurred while parsing or rendering the custom match data.
          </p>
          <pre
            style={{
              background: "#111827",
              padding: "1rem",
              borderRadius: "8px",
              fontSize: "0.85rem",
              color: "#f87171",
              maxWidth: "600px",
              overflowX: "auto",
              marginBottom: "1.5rem",
              border: "1px solid #1f2937",
            }}
          >
            {this.state.error?.message || "Unknown render exception"}
          </pre>
          <button
            onClick={this.handleReset}
            style={{
              background: "#10b981",
              color: "#000",
              fontWeight: "600",
              padding: "0.75rem 1.5rem",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
            }}
          >
            Reset Match Data &amp; Reload Studio
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

