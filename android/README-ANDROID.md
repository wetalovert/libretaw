# Сборка APK в Android Studio

## Что установить

1. **Android Studio** (Koala 2024.1 или новее): https://developer.android.com/studio . Она включает JDK 17, который нужен для сборки.
2. В Android Studio откройте **Settings → Languages & Frameworks → Android SDK → SDK Platforms** и поставьте **Android 14.0 (API 34)**.
3. В **SDK Tools** поставьте **Android SDK Build-Tools 34**, **Android SDK Platform-Tools** и **Android SDK Command-line Tools**.
4. Для установки на телефон включите на нём режим разработчика и отладку по USB.

## Сборка

1. Из корня проекта выполните: `npm run android:assets` (копирует приложение `web/` в `android/app/src/main/assets/web`).
2. В Android Studio: **File → Open** и выберите папку `android/` (не корень проекта).
3. Дождитесь окончания Gradle Sync.
4. **Build → Build Bundle(s) / APK(s) → Build APK(s)**. Готовый файл: `android/app/build/outputs/apk/debug/app-debug.apk`.

Для релизной версии: **Build → Generate Signed App Bundle / APK**, создайте ключ (keystore) и храните его отдельно от проекта.

## Когда менялось приложение

Каждый раз после изменений в `web/` запускайте `npm run android:assets` перед сборкой.

## Что проверить на телефоне

- Камера и микрофон запрашиваются при первом кружке/QR (разрешите их).
- Приложение работает без интернета; внешние библиотеки QR подгружаются с cdnjs, поэтому сканирование QR требует сети.
- Bluetooth и mesh в этой версии не реализованы: передача через сеть (локальная сеть, VPN, свой сервер, хостинг).
