/*
 * libretaw — личный мессенджер.
 * Copyright (C) 2026 авторы libretaw
 *
 * Эта программа — свободное программное обеспечение: вы можете распространять её
 * и/или изменять на условиях GNU General Public License версии 3 или более поздней.
 * Программа распространяется БЕЗ КАКИХ-ЛИБО ГАРАНТИЙ. См. файл LICENSE.
 */
package org.libretaw.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.util.ArrayList;

/** Одна активность: открывает приложение из assets/web и выдаёт камеру и микрофон по запросу страницы. */
public class MainActivity extends Activity {

    private static final int REQ_MEDIA = 1001;
    private WebView web;
    private PermissionRequest pendingRequest;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // localStorage: данные аккаунта хранятся на устройстве
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setDatabaseEnabled(true);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return !url.startsWith("file:///android_asset/");   // внешние ссылки не открываем внутри приложения
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                // Страница просит камеру и/или микрофон: сначала спрашиваем у системы
                ArrayList<String> need = new ArrayList<>();
                for (String r : request.getResources()) {
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) need.add(Manifest.permission.CAMERA);
                    if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) need.add(Manifest.permission.RECORD_AUDIO);
                }
                ArrayList<String> missing = new ArrayList<>();
                for (String p : need) {
                    if (checkSelfPermission(p) != PackageManager.PERMISSION_GRANTED) missing.add(p);
                }
                if (missing.isEmpty()) {
                    request.grant(request.getResources());
                } else {
                    pendingRequest = request;
                    requestPermissions(missing.toArray(new String[0]), REQ_MEDIA);
                }
            }
        });

        web.loadUrl("file:///android_asset/web/index.html");
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode != REQ_MEDIA || pendingRequest == null) return;
        ArrayList<String> granted = new ArrayList<>();
        for (String r : pendingRequest.getResources()) {
            boolean ok = false;
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) ok = isGranted(permissions, results, Manifest.permission.CAMERA);
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) ok = isGranted(permissions, results, Manifest.permission.RECORD_AUDIO);
            if (ok) granted.add(r);
        }
        if (granted.isEmpty()) pendingRequest.deny();
        else pendingRequest.grant(granted.toArray(new String[0]));
        pendingRequest = null;
    }

    private static boolean isGranted(String[] perms, int[] results, String want) {
        for (int i = 0; i < perms.length; i++) {
            if (want.equals(perms[i])) return results[i] == PackageManager.PERMISSION_GRANTED;
        }
        return false;
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack(); else super.onBackPressed();
    }
}
