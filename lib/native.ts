/**
 * Native bridge utilities — gracefully degrade on web.
 * Import these instead of calling Capacitor plugins directly
 * so they work on Web/PWA and iOS/Android without errors.
 */

/** Check if we're running inside a Capacitor native shell */
export function isNative(): boolean {
  if (typeof window === "undefined") return false;
  return (window as any).Capacitor?.isNativePlatform?.() ?? false;
}

export function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return (window as any).Capacitor?.getPlatform?.() === "ios";
}

export function isAndroid(): boolean {
  if (typeof window === "undefined") return false;
  return (window as any).Capacitor?.getPlatform?.() === "android";
}

/** Haptic feedback — only fires on native */
export async function haptic(style: "light" | "medium" | "heavy" | "success" | "warning" | "error" = "light") {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import("@capacitor/haptics");
    if (style === "success" || style === "warning" || style === "error") {
      const map = { success: NotificationType.Success, warning: NotificationType.Warning, error: NotificationType.Error };
      await Haptics.notification({ type: map[style] });
    } else {
      const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
      await Haptics.impact({ style: map[style] });
    }
  } catch { /* ignore */ }
}

/** Hide splash screen */
export async function hideSplash() {
  if (!isNative()) return;
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch { /* ignore */ }
}

/** Set status bar style */
export async function setStatusBar(style: "dark" | "light") {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: style === "dark" ? Style.Dark : Style.Light });
  } catch { /* ignore */ }
}

/** Network status */
export async function getNetworkStatus(): Promise<{ connected: boolean; connectionType: string }> {
  if (!isNative()) {
    return { connected: navigator.onLine, connectionType: "unknown" };
  }
  try {
    const { Network } = await import("@capacitor/network");
    const status = await Network.getStatus();
    return { connected: status.connected, connectionType: status.connectionType };
  } catch {
    return { connected: true, connectionType: "unknown" };
  }
}
