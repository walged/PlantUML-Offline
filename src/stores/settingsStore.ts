import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeJSONStorage } from "../lib/safeStorage";

export type Language = "en" | "ru";
export type Theme = "dark" | "light";

/** Built-in AI provider presets. "custom" lets the user enter any base URL. */
export type AiProvider = "openrouter" | "deepseek" | "openai" | "anthropic" | "custom";

export interface AiProviderPreset {
  id: AiProvider;
  label: string;
  baseUrl: string;
  defaultModel: string;
  /** Suggested models for the model dropdown. */
  models: string[];
  /** Where to get an API key. */
  keyUrl?: string;
}

/**
 * Provider presets. OpenRouter is the default: one key gives access to many
 * models, it is OpenAI-compatible, and it is reachable from CIS. Any other
 * OpenAI-compatible endpoint (Qwen/DashScope, Kie.AI, local Ollama, …) works via
 * the "custom" preset.
 */
export const AI_PROVIDERS: AiProviderPreset[] = [
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "anthropic/claude-opus-4-8",
    models: [
      "anthropic/claude-opus-4-8",
      "anthropic/claude-sonnet-4-6",
      "openai/gpt-4o",
      "deepseek/deepseek-chat",
      "qwen/qwen-2.5-coder-32b-instruct",
      "google/gemini-2.0-flash-001",
    ],
    keyUrl: "https://openrouter.ai/keys",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner"],
    keyUrl: "https://platform.deepseek.com/api_keys",
  },
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
    models: ["gpt-4o", "gpt-4o-mini"],
    keyUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-opus-4-8",
    models: ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5"],
    keyUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "custom",
    label: "Custom (OpenAI-compatible)",
    baseUrl: "",
    defaultModel: "",
    models: [],
  },
];

interface SettingsState {
  language: Language;
  theme: Theme;
  imageSavePath: string | null;
  fontSize: number;
  renderDelay: number;
  autoSave: boolean;
  plantUmlServer: string;
  useEmbeddedServer: boolean;
  checkForUpdates: boolean;

  // AI settings. Note: the API key is stored locally on the user's machine for
  // a single-user desktop app with a user-supplied key.
  aiProvider: AiProvider;
  aiApiKey: string;
  aiModel: string;
  aiCustomBaseUrl: string;

  // Actions
  setLanguage: (lang: Language) => void;
  setTheme: (theme: Theme) => void;
  setImageSavePath: (path: string | null) => void;
  setFontSize: (size: number) => void;
  setRenderDelay: (delay: number) => void;
  setAutoSave: (enabled: boolean) => void;
  setPlantUmlServer: (server: string) => void;
  setUseEmbeddedServer: (use: boolean) => void;
  setCheckForUpdates: (check: boolean) => void;
  setAiProvider: (provider: AiProvider) => void;
  setAiApiKey: (key: string) => void;
  setAiModel: (model: string) => void;
  setAiCustomBaseUrl: (url: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: "en",
      theme: "dark",
      imageSavePath: null,
      fontSize: 14,
      renderDelay: 500,
      autoSave: true,
      plantUmlServer: "http://localhost:18123", // Default to embedded server
      useEmbeddedServer: true, // Default to embedded server for offline support
      checkForUpdates: true, // Check for updates on startup by default

      aiProvider: "openrouter",
      aiApiKey: "",
      aiModel: "anthropic/claude-opus-4-8",
      aiCustomBaseUrl: "",

      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      setImageSavePath: (imageSavePath) => set({ imageSavePath }),
      setFontSize: (fontSize) => set({ fontSize }),
      setRenderDelay: (renderDelay) => set({ renderDelay }),
      setAutoSave: (autoSave) => set({ autoSave }),
      setPlantUmlServer: (plantUmlServer) => set({ plantUmlServer }),
      setUseEmbeddedServer: (useEmbeddedServer) => set({ useEmbeddedServer }),
      setCheckForUpdates: (checkForUpdates) => set({ checkForUpdates }),
      setAiProvider: (aiProvider) => set({ aiProvider }),
      setAiApiKey: (aiApiKey) => set({ aiApiKey }),
      setAiModel: (aiModel) => set({ aiModel }),
      setAiCustomBaseUrl: (aiCustomBaseUrl) => set({ aiCustomBaseUrl }),
    }),
    {
      name: "plantuml-editor-settings",
      storage: createJSONStorage(() => safeJSONStorage),
    },
  ),
);

// Translations
export const translations = {
  en: {
    // Toolbar
    newFile: "New",
    openFile: "Open",
    exportSvg: "SVG",
    exportPng: "PNG",
    settings: "Settings",
    about: "About",
    toggleSidebar: "Toggle Sidebar",

    // Sidebar
    files: "Files",
    templates: "Templates",
    newFileBtn: "New File",

    // Editor
    noFileOpen: "No file open",
    createOrOpen: "Create a new file or open an existing one",

    // Preview
    preview: "Preview",
    zoom: "Zoom",
    zoomIn: "Zoom In",
    zoomOut: "Zoom Out",
    fitToView: "Fit to View",
    resetZoom: "Reset View",
    rendering: "Rendering...",
    noPreview: "No preview available",
    writeCode: "Write PlantUML code to see the preview",

    // Settings
    settingsTitle: "Settings",
    language: "Language",
    theme: "Theme",
    lightTheme: "Light",
    darkTheme: "Dark",
    editorFontSize: "Editor Font Size",
    renderDelay: "Render Delay (ms)",
    renderDelayHint: "Delay before rendering after typing",
    autoSave: "Auto-save files",
    imageSavePath: "Image Save Path",
    choosePath: "Choose...",
    notSet: "Not set (will ask on first export)",
    plantUmlServer: "PlantUML Server",
    customServerHint: "For offline use: run local PlantUML server",
    useEmbeddedServer: "Use embedded server",
    embeddedServerHint: "Built-in PlantUML server for offline work",
    embeddedServerRunning: "Embedded server running",
    embeddedServerStopped: "Embedded server stopped",
    embeddedServerError: "Embedded server error",
    startEmbeddedServer: "Start Server",
    stopEmbeddedServer: "Stop Server",
    restartEmbeddedServer: "Restart Server",
    embeddedServerPort: "Port",

    // About
    aboutTitle: "About PlantUML Offline",
    version: "Version",
    description:
      "A modern desktop editor for creating UML diagrams using PlantUML syntax. Write code, see live preview.",
    features: "Features",
    feature1: "Monaco Editor with PlantUML syntax highlighting",
    feature2: "Live diagram preview",
    feature3: "8 built-in diagram templates",
    feature4: "Export to SVG and PNG",
    feature5: "Zoom and pan preview",
    developer: "Developer",
    website: "Website",
    github: "GitHub",
    poweredBy: "Powered by",
    builtWith: "Built with",

    // Templates
    templateClass: "Class Diagram",
    templateSequence: "Sequence Diagram",
    templateUseCase: "Use Case Diagram",
    templateActivity: "Activity Diagram",
    templateState: "State Diagram",
    templateComponent: "Component Diagram",
    templateER: "ER Diagram",
    templateMindmap: "Mind Map",

    // Dialogs
    replaceContent: 'Replace current content with "{name}" template?',
    replaceWarning: "This will overwrite your existing code.",
    selectImageFolder: "Select folder to save images",
    confirmReplace: "Confirm Replace",
    replaceWithTemplate:
      'Replace current content with "{template}" template?\n\nThis will overwrite your existing code.',

    // Sidebar
    openFiles: "Open Files",

    // Actions
    undo: "Undo",
    redo: "Redo",
    save: "Save",

    // Server Status
    serverOnline: "Online",
    serverOffline: "Offline",
    serverChecking: "Checking...",
    serverOfflineTitle: "Server Unavailable",
    serverOfflineMessage: "PlantUML server is not reachable. Diagram rendering will not work.",
    currentServer: "Current server",
    suggestions: "Suggestions",
    suggestionCheckInternet: "Check your internet connection",
    suggestionLocalServer: "Run a local PlantUML server:",
    localServerHint: "Then set server URL to:",
    dismiss: "Dismiss",
    retryConnection: "Retry Connection",
    restartServer: "Restart Server",
    restarting: "Restarting...",

    // Updates
    checkForUpdates: "Check for updates on startup",
    updateAvailable: "Update Available",
    newVersionAvailable: "A new version {version} is available!",
    currentVersion: "Current version",
    download: "Download",
    later: "Later",
    checkingForUpdates: "Checking for updates...",
    noUpdatesAvailable: "You have the latest version",
    updateCheckFailed: "Could not check for updates",

    // AI
    aiAssistant: "AI Assistant",
    aiSettings: "AI Assistant",
    aiProvider: "Provider",
    aiApiKey: "API Key",
    aiModel: "Model",
    aiCustomBaseUrl: "Custom base URL",
    aiCustomBaseUrlHint: "OpenAI-compatible endpoint (DeepSeek, Qwen, Kie.AI, Ollama, …)",
    aiGetKey: "Get API key",
    aiKeyStoredLocally: "The key is stored locally on this device.",
    aiNoKey: "Add an AI API key in Settings → AI Assistant to use this feature.",
    aiGenerateFromText: "Generate from description",
    aiGeneratePrompt: "Describe the diagram you want",
    aiGeneratePlaceholder: "e.g. class diagram for an online shop with User, Order, Product",
    aiGenerate: "Generate",
    aiGenerating: "Generating…",
    aiFixError: "Fix with AI",
    aiFixing: "Fixing…",
    aiExplain: "Explain",
    aiImprove: "Improve / refactor",
    aiSend: "Send",
    aiThinking: "Thinking…",
    aiChatPlaceholder: "Ask to add a class, change layout, convert diagram type…",
    aiApply: "Apply to editor",
    aiInsert: "Insert",
    aiCopy: "Copy",
    aiClear: "Clear chat",
    aiError: "AI request failed",
    aiOpenPanel: "AI Assistant",
  },
  ru: {
    // Toolbar
    newFile: "Новый",
    openFile: "Открыть",
    exportSvg: "SVG",
    exportPng: "PNG",
    settings: "Настройки",
    about: "О программе",
    toggleSidebar: "Боковая панель",

    // Sidebar
    files: "Файлы",
    templates: "Шаблоны",
    newFileBtn: "Новый файл",

    // Editor
    noFileOpen: "Файл не открыт",
    createOrOpen: "Создайте новый файл или откройте существующий",

    // Preview
    preview: "Предпросмотр",
    zoom: "Масштаб",
    zoomIn: "Увеличить",
    zoomOut: "Уменьшить",
    fitToView: "По размеру",
    resetZoom: "Сбросить вид",
    rendering: "Рендеринг...",
    noPreview: "Предпросмотр недоступен",
    writeCode: "Напишите код PlantUML для просмотра",

    // Settings
    settingsTitle: "Настройки",
    language: "Язык",
    theme: "Тема",
    lightTheme: "Светлая",
    darkTheme: "Тёмная",
    editorFontSize: "Размер шрифта редактора",
    renderDelay: "Задержка рендеринга (мс)",
    renderDelayHint: "Задержка перед рендерингом после ввода",
    autoSave: "Автосохранение файлов",
    imageSavePath: "Папка для сохранения изображений",
    choosePath: "Выбрать...",
    notSet: "Не задано (спросит при первом экспорте)",
    plantUmlServer: "Сервер PlantUML",
    customServerHint: "Для оффлайн: запустите локальный сервер PlantUML",
    useEmbeddedServer: "Использовать встроенный сервер",
    embeddedServerHint: "Встроенный PlantUML сервер для работы без интернета",
    embeddedServerRunning: "Встроенный сервер запущен",
    embeddedServerStopped: "Встроенный сервер остановлен",
    embeddedServerError: "Ошибка встроенного сервера",
    startEmbeddedServer: "Запустить сервер",
    stopEmbeddedServer: "Остановить сервер",
    restartEmbeddedServer: "Перезапустить сервер",
    embeddedServerPort: "Порт",

    // About
    aboutTitle: "О программе PlantUML Offline",
    version: "Версия",
    description:
      "Современный редактор для создания UML-диаграмм с использованием синтаксиса PlantUML. Пишите код, смотрите результат.",
    features: "Возможности",
    feature1: "Monaco Editor с подсветкой синтаксиса PlantUML",
    feature2: "Предпросмотр диаграмм в реальном времени",
    feature3: "8 встроенных шаблонов диаграмм",
    feature4: "Экспорт в SVG и PNG",
    feature5: "Масштабирование и перемещение",
    developer: "Разработчик",
    website: "Сайт",
    github: "GitHub",
    poweredBy: "На основе",
    builtWith: "Создано с помощью",

    // Templates
    templateClass: "Диаграмма классов",
    templateSequence: "Диаграмма последовательности",
    templateUseCase: "Диаграмма вариантов использования",
    templateActivity: "Диаграмма активности",
    templateState: "Диаграмма состояний",
    templateComponent: "Диаграмма компонентов",
    templateER: "ER-диаграмма",
    templateMindmap: "Интеллект-карта",

    // Dialogs
    replaceContent: 'Заменить текущий контент шаблоном "{name}"?',
    replaceWarning: "Это перезапишет ваш существующий код.",
    selectImageFolder: "Выберите папку для сохранения изображений",
    confirmReplace: "Подтверждение замены",
    replaceWithTemplate:
      'Заменить текущий контент шаблоном "{template}"?\n\nЭто перезапишет ваш существующий код.',

    // Sidebar
    openFiles: "Открытые файлы",

    // Actions
    undo: "Отменить",
    redo: "Повторить",
    save: "Сохранить",

    // Server Status
    serverOnline: "Онлайн",
    serverOffline: "Оффлайн",
    serverChecking: "Проверка...",
    serverOfflineTitle: "Сервер недоступен",
    serverOfflineMessage: "PlantUML сервер недоступен. Рендеринг диаграмм не будет работать.",
    currentServer: "Текущий сервер",
    suggestions: "Рекомендации",
    suggestionCheckInternet: "Проверьте подключение к интернету",
    suggestionLocalServer: "Запустите локальный сервер PlantUML:",
    localServerHint: "Затем укажите URL сервера:",
    dismiss: "Закрыть",
    retryConnection: "Повторить",
    restartServer: "Перезапустить сервер",
    restarting: "Перезапуск...",

    // Updates
    checkForUpdates: "Проверять обновления при запуске",
    updateAvailable: "Доступно обновление",
    newVersionAvailable: "Доступна новая версия {version}!",
    currentVersion: "Текущая версия",
    download: "Скачать",
    later: "Позже",
    checkingForUpdates: "Проверка обновлений...",
    noUpdatesAvailable: "У вас установлена последняя версия",
    updateCheckFailed: "Не удалось проверить обновления",

    // AI
    aiAssistant: "ИИ-ассистент",
    aiSettings: "ИИ-ассистент",
    aiProvider: "Провайдер",
    aiApiKey: "API-ключ",
    aiModel: "Модель",
    aiCustomBaseUrl: "Свой базовый URL",
    aiCustomBaseUrlHint: "OpenAI-совместимый эндпоинт (DeepSeek, Qwen, Kie.AI, Ollama, …)",
    aiGetKey: "Получить API-ключ",
    aiKeyStoredLocally: "Ключ хранится локально на этом устройстве.",
    aiNoKey: "Добавьте API-ключ в Настройки → ИИ-ассистент, чтобы использовать эту функцию.",
    aiGenerateFromText: "Сгенерировать по описанию",
    aiGeneratePrompt: "Опишите нужную диаграмму",
    aiGeneratePlaceholder: "напр. диаграмма классов интернет-магазина с User, Order, Product",
    aiGenerate: "Сгенерировать",
    aiGenerating: "Генерация…",
    aiFixError: "Исправить с ИИ",
    aiFixing: "Исправление…",
    aiExplain: "Объяснить",
    aiImprove: "Улучшить / отрефакторить",
    aiSend: "Отправить",
    aiThinking: "Думаю…",
    aiChatPlaceholder: "Попросите добавить класс, изменить компоновку, сменить тип диаграммы…",
    aiApply: "Применить в редактор",
    aiInsert: "Вставить",
    aiCopy: "Копировать",
    aiClear: "Очистить чат",
    aiError: "Ошибка запроса к ИИ",
    aiOpenPanel: "ИИ-ассистент",
  },
};

export function useTranslation() {
  const language = useSettingsStore((state) => state.language);
  return translations[language];
}
