plugins {
    id("com.android.application")
}

android {
    namespace = "org.libretaw.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "org.libretaw.app"
        minSdk = 26            // Android 8.0 и новее: WebRTC и WebView с нужными возможностями
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false      // приложение — один HTML-файл, минификация Java не нужна
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
