package com.rafael.devocional;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // O backend de sync roda em HTTP puro (163.176.30.222:3001, sem TLS) e o app
    // e servido pelo Capacitor em https://localhost, entao o WebView bloqueia a
    // chamada por "mixed content" mesmo com o cleartext liberado no
    // network_security_config (essa e uma politica separada, do WebView).
    WebSettings settings = getBridge().getWebView().getSettings();
    settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
  }
}
