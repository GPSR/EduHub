import type { CapacitorConfig } from '@capacitor/cli';

const isProduction = process.env.NODE_ENV === 'production';

const config: CapacitorConfig = {
  appId: 'com.softlanetech.eduhub',
  appName: 'EduHub',
  webDir: 'capacitor_www',

  // In development, point to your local server
  // In production, use the bundled web assets
  ...(isProduction ? {} : {
    server: {
      url: process.env.CAPACITOR_SERVER_URL ?? 'http://localhost:3000',
      cleartext: true,
    }
  }),

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
    webContentsDebuggingEnabled: !isProduction,
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
      style: 'dark',
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
