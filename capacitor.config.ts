import type { CapacitorConfig } from "@capacitor/cli";

const prodServerUrl =
  process.env.CAPACITOR_PROD_URL ??
  process.env.SCHOOL_APP_BASE_URL ??
  process.env.NEXT_PUBLIC_SCHOOL_APP_BASE_URL ??
  "https://schools.softlanetech.com";
const serverUrl = process.env.CAPACITOR_SERVER_URL ?? prodServerUrl;
const isCleartext = serverUrl.startsWith("http://");

const config: CapacitorConfig = {
  appId: 'com.softlanetech.schools',
  appName: 'Schools',
  webDir: 'capacitor_www',

  // This app relies on a live Next.js backend (Prisma/Auth/Server Actions),
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
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
