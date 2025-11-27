import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Language = "en" | "ru";
export type Theme = "dark" | "light";

interface SettingsState {
  language: Language;
  theme: Theme;
  imageSavePath: string | null;
  fontSize: number;
  renderDelay: number;
  autoSave: boolean;
  plantUmlServer: string;
  useEmbeddedServer: boolean;

  // Actions
  setLanguage: (lang: Language) => void;
  setTheme: (theme: Theme) => void;
  setImageSavePath: (path: string | null) => void;
  setFontSize: (size: number) => void;
  setRenderDelay: (delay: number) => void;
  setAutoSave: (enabled: boolean) => void;
  setPlantUmlServer: (server: string) => void;
  setUseEmbeddedServer: (use: boolean) => void;
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

      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      setImageSavePath: (imageSavePath) => set({ imageSavePath }),
      setFontSize: (fontSize) => set({ fontSize }),
      setRenderDelay: (renderDelay) => set({ renderDelay }),
      setAutoSave: (autoSave) => set({ autoSave }),
      setPlantUmlServer: (plantUmlServer) => set({ plantUmlServer }),
      setUseEmbeddedServer: (useEmbeddedServer) => set({ useEmbeddedServer }),
    }),
    {
      name: "plantuml-editor-settings",
    }
  )
);

// Translations
export const translations = {
  en: {
    // Toolbar
    newFile: "New",
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
    zoom: "Zoom",
    fitToView: "Fit to View",
    resetZoom: "Reset Zoom",

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
    description: "A modern desktop editor for creating UML diagrams using PlantUML syntax. Write code, see live preview.",
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
    replaceContent: "Replace current content with \"{name}\" template?",
    replaceWarning: "This will overwrite your existing code.",
    selectImageFolder: "Select folder to save images",
    confirmReplace: "Confirm Replace",
    replaceWithTemplate: "Replace current content with \"{template}\" template?\n\nThis will overwrite your existing code.",

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
  },
  ru: {
    // Toolbar
    newFile: "Новый",
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
    zoom: "Масштаб",
    fitToView: "По размеру",
    resetZoom: "Сбросить",

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
    description: "Современный редактор для создания UML-диаграмм с использованием синтаксиса PlantUML. Пишите код, смотрите результат.",
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
    replaceContent: "Заменить текущий контент шаблоном \"{name}\"?",
    replaceWarning: "Это перезапишет ваш существующий код.",
    selectImageFolder: "Выберите папку для сохранения изображений",
    confirmReplace: "Подтверждение замены",
    replaceWithTemplate: "Заменить текущий контент шаблоном \"{template}\"?\n\nЭто перезапишет ваш существующий код.",

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
  },
};

export function useTranslation() {
  const language = useSettingsStore((state) => state.language);
  return translations[language];
}
