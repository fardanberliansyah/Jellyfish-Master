package com.jellyfishmaster.sensei;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        fixZoom();
    }

    @Override
    public void onResume() {
        super.onResume();
        fixZoom();
    }

    /* Lebar halaman = lebar layar HP, tanpa pembesaran, ukuran huruf tetap 100% */
    private void fixZoom() {
        try {
            WebView wv = this.bridge.getWebView();
            WebSettings s = wv.getSettings();
            s.setUseWideViewPort(false);
            s.setLoadWithOverviewMode(false);
            s.setSupportZoom(false);
            s.setBuiltInZoomControls(false);
            s.setDisplayZoomControls(false);
            s.setTextZoom(100);
            wv.setInitialScale(0);
        } catch (Exception e) { }
    }
}
