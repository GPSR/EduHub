import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.softlanetech.schools',
  appName: 'Schools',
  webDir: 'capacitor_www',
  server: {
    url: 'http://10.0.0.214:3003',
    cleartext: true,
    allowNavigation: ['10.0.0.214']
  }
};

export default config;
