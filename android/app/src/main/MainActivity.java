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
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.util.ArrayList;

/**
 * Одна активность: открывает приложение из assets/web, выдаёт камеру и микрофон по запросу страницы,
 * открывает выбор файлов любого типа и показывает системные уведомления через мост LTWNative.
 */
public class MainActivity extends Activity {

    private static final int REQ_MEDIA = 1001;
    private static final int REQ_NOTIFY = 1002;
    private static final int REQ_FILE = 1003;
    private static final String CHANNEL_ID = "messages";

    private WebView web;
    private PermissionRequest pendingRequest;
    private ValueCallback<Uri[]> filePathCallback;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannel();

        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // localStorage: данные аккаунта хранятся на устройстве
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setDatabaseEnabled(true);

        web.addJavascriptInterface(new Bridge(), "LTWNative");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return !url.startsWith("file:///android_asset/");   // внешние ссылки не открываем внутри приложения
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                view.evaluateJavascript(NOTIFICATION_POLYFILL, null);
                view.evaluateJavascript("window.__ltwPerm='" + nativePermission() + "';", null);
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

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback, FileChooserParams params) {
                // Выбор файлов любого типа: системный проводник, несколько файлов если страница их просит
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                if (params != null && params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) {
                    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                }
                try {
                    startActivityForResult(intent, REQ_FILE);
                } catch (Exception e) {
                    filePathCallback.onReceiveValue(null);
                    filePathCallback = null;
                    return false;
                }
                return true;
            }
        });

        web.loadUrl("file:///android_asset/web/index.html");
        askNotificationPermission();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQ_FILE || filePathCallback == null) return;
        Uri[] results = null;
        if (resultCode == RESULT_OK && data != null) {
            if (data.getClipData() != null) {
                int n = data.getClipData().getItemCount();
                results = new Uri[n];
                for (int i = 0; i < n; i++) results[i] = data.getClipData().getItemAt(i).getUri();
            } else if (data.getData() != null) {
                results = new Uri[]{data.getData()};
            }
        }
        filePathCallback.onReceiveValue(results);
        filePathCallback = null;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == REQ_NOTIFY) {
            String p = nativePermission();
            web.evaluateJavascript("window.__ltwPerm='" + p + "';if(window.__ltwSetPerm)__ltwSetPerm('" + p + "');", null);
            return;
        }
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

    private void askNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFY);
        }
    }

    private String nativePermission() {
        if (Build.VERSION.SDK_INT < 33) return "granted";
        return checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED ? "granted" : "default";
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "Сообщения", NotificationManager.IMPORTANCE_DEFAULT);
            ch.setDescription("Новые сообщения и события чатов");
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.createNotificationChannel(ch);
        }
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack(); else super.onBackPressed();
    }

    /** Мост между страницей и системой: уведомления и запрос разрешения. */
    private class Bridge {
        @JavascriptInterface
        public String perm() {
            return nativePermission();
        }

        @JavascriptInterface
        public void ask() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    askNotificationPermission();
                }
            });
        }

        @JavascriptInterface
        public void show(String title, String body, String tag) {
            if (!"granted".equals(nativePermission())) return;
            Intent open = new Intent(MainActivity.this, MainActivity.class);
            open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pi = PendingIntent.getActivity(MainActivity.this, 0, open,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            Notification.Builder b = Build.VERSION.SDK_INT >= 26
                    ? new Notification.Builder(MainActivity.this, CHANNEL_ID)
                    : new Notification.Builder(MainActivity.this);
            b.setSmallIcon(R.mipmap.ic_launcher)
             .setContentTitle(title == null ? "libretaw" : title)
             .setContentText(body == null ? "" : body)
             .setContentIntent(pi)
             .setAutoCancel(true);
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                int id = (tag == null || tag.isEmpty()) ? (int) (System.currentTimeMillis() & 0x7fffffff) : tag.hashCode();
                nm.notify(id, b.build());
            }
        }
    }

    /** Заменяет window.Notification на мост к системным уведомлениям (в WebView его нет). */
    private static final String NOTIFICATION_POLYFILL =
        "(function(){if(window.__ltwN)return;window.__ltwN=1;" +
        "function N(title,opts){this.title=String(title);this.body=(opts&&opts.body)||'';this.tag=(opts&&opts.tag)||'';" +
        "try{if(window.LTWNative)LTWNative.show(this.title,String(this.body),String(this.tag))}catch(e){}}" +
        "N.permission=window.__ltwPerm||(window.LTWNative?LTWNative.perm():'default');" +
        "N.requestPermission=function(){return new Promise(function(res){try{if(window.LTWNative)LTWNative.ask()}catch(e){}" +
        "setTimeout(function(){N.permission=window.__ltwPerm||N.permission;res(N.permission)},800)})};" +
        "N.prototype.close=function(){};N.prototype.onclick=null;window.Notification=N;" +
        "window.__ltwSetPerm=function(p){N.permission=p};})();";
}
