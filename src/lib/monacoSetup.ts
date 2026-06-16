import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

// Vite-bundled Monaco workers. Importing them with `?worker` lets Vite bundle
// each worker locally so the editor works fully offline and under a strict CSP
// (no CDN fetch). See https://github.com/microsoft/monaco-editor.
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

/**
 * Configure Monaco to load from the locally-bundled package instead of the
 * default CDN (cdn.jsdelivr.net). The previous CDN default broke the editor
 * (stuck on "Loading…") under the app's Content-Security-Policy and would also
 * fail with no internet — unacceptable for an offline-first app.
 */
export function setupMonaco() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (self as any).MonacoEnvironment = {
    getWorker(_: unknown, label: string) {
      switch (label) {
        case "json":
          return new jsonWorker();
        case "css":
        case "scss":
        case "less":
          return new cssWorker();
        case "html":
        case "handlebars":
        case "razor":
          return new htmlWorker();
        case "typescript":
        case "javascript":
          return new tsWorker();
        default:
          return new editorWorker();
      }
    },
  };

  // Tell @monaco-editor/react to use our bundled monaco instance.
  loader.config({ monaco });
}
