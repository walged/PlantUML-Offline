import { Component, ErrorInfo, ReactNode } from "react";
import "./ErrorBoundary.css";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches render/runtime errors in the React tree so a crash shows a recovery
 * screen instead of a blank black window (issue #1). The "Reset app data"
 * action clears persisted state that may have grown too large or become
 * corrupted in localStorage, which is the most common cause of the crash.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetData = () => {
    try {
      // Remove the app's persisted/cached state but keep nothing stale behind.
      const keysToRemove = [
        "plantuml-editor-storage",
        "plantuml-editor-autosave",
        "plantuml-render-cache",
      ];
      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }
    } catch {
      // If localStorage itself is unavailable, fall through to reload.
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="error-boundary">
        <div className="error-boundary-card">
          <div className="error-boundary-icon">⚠️</div>
          <h1>Something went wrong / Произошла ошибка</h1>
          <p className="error-boundary-message">
            The application failed to load. This is usually caused by corrupted or oversized saved
            data.
            <br />
            Приложение не загрузилось. Обычно это вызвано повреждёнными или слишком большими
            сохранёнными данными.
          </p>

          {this.state.error && (
            <pre className="error-boundary-details">{this.state.error.message}</pre>
          )}

          <div className="error-boundary-actions">
            <button className="error-btn primary" onClick={this.handleResetData}>
              Reset app data / Сбросить данные
            </button>
            <button className="error-btn secondary" onClick={this.handleReload}>
              Reload / Перезагрузить
            </button>
          </div>

          <p className="error-boundary-hint">
            "Reset app data" clears saved diagrams from local storage. Export important diagrams
            first if you can reach the editor.
          </p>
        </div>
      </div>
    );
  }
}
