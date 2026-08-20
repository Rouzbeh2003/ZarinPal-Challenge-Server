import { Component, StrictMode, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "@/app";
import { AuthProvider } from "@/lib/auth";
import "./style.css";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[App crash]", error, info.componentStack);
  }

  render() {
    if (this.state.error !== null) {
      return (
        <div dir="rtl" lang="fa" className="min-h-screen bg-background p-6 font-sans text-foreground">
          <h1 className="text-lg font-semibold">خطا در بارگذاری برنامه</h1>
          <pre dir="ltr" className="mt-4 overflow-auto rounded-lg border border-destructive/40 bg-muted p-4 text-left text-xs leading-5">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-4 rounded-md border border-border px-4 py-2 text-sm"
          >
            تلاش دوباره
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);