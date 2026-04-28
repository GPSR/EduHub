import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize } from "@capacitor/keyboard";

function normalizeAppEnv(raw?: string | null): "stage" | "production" {
  const value = String(raw ?? "").trim().toLowerCase();
  // "int"/"integration" now map to stage to avoid NXDOMAIN host usage.
  if (value === "int" || value === "integration") return "stage";
  // Keep accepting the legacy misspelling "stgae" to avoid breaking existing env files.
  if (value === "stage" || value === "staging" || value === "stgae") return "stage";
  return "production";
}

const appEnv = normalizeAppEnv(process.env.APP_ENV ?? process.env.DEPLOY_ENV);
const defaultSchoolsUrlByEnv = {
  // Current staging DNS uses "stgae". Keep this default until infra is renamed.
  stage: "https://stgae.schools.softlanetech.com",
  production: "https://schools.softlanetech.com",
} as const;

const prodServerUrl =
  process.env.CAPACITOR_PROD_URL ??
  process.env.SCHOOL_APP_BASE_URL ??
  process.env.NEXT_PUBLIC_SCHOOL_APP_BASE_URL ??
  defaultSchoolsUrlByEnv[appEnv];
const serverUrl = process.env.CAPACITOR_SERVER_URL ?? prodServerUrl;
const isCleartext = serverUrl.startsWith("http://");

const config: CapacitorConfig = {
  appId: 'com.softlanetech.schools.eduhub26042701',
  appName: 'Schools',
  webDir: 'capacitor_www',

  // This app relies on a live Next.js backend (Neon DB/Auth/Server Actions),
  // so native builds should point to a hosted HTTPS URL.
  server: {
    url: serverUrl,
    cleartext: isCleartext
  },

  ios: {
    contentInset: 'automatic',
    backgroundColor: '#060912',
    preferredContentMode: 'mobile',
    scrollEnabled: true,
  },

  android: {
    backgroundColor: '#060912',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: isCleartext,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#060912',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#060912',
      overlaysWebView: true,
    },
    Keyboard: {
      resize: KeyboardResize.Native,
      resizeOnFullScreen: true,
    },
  },
};

export default config;
