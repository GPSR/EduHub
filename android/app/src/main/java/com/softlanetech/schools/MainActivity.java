package com.softlanetech.schools;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        clearWebViewCache();
    }

    private void clearWebViewCache() {
        try {
            if (bridge == null) return;
            WebView webView = bridge.getWebView();
            if (webView == null) return;
            webView.clearCache(true);
            WebSettings settings = webView.getSettings();
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        } catch (Exception ignored) {
            // no-op
        }
    }
}
