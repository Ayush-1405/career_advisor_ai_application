# Flutter
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Riverpod / Dart reflection
-keep class ** implements java.io.Serializable { *; }

# OkHttp / Dio
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# Keep model classes
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# Prevent stripping of annotations
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions

# ── Fix R8 missing class errors ───────────────────────────────────────────────

# Google Play Core (deferred components / split install)
-dontwarn com.google.android.play.core.**
-keep class com.google.android.play.core.** { *; }

# Error-prone annotations (compile-time only, safe to ignore at runtime)
-dontwarn com.google.errorprone.annotations.**

# javax.annotation (not present in Android SDK)
-dontwarn javax.annotation.**
-dontwarn javax.annotation.concurrent.**

# Google Tink crypto library annotations
-dontwarn com.google.crypto.tink.**
