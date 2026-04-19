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

# Google Play Core
-keep class com.google.android.play.core.** { *; }
-dontwarn com.google.android.play.core.**

# Error Prone
-dontwarn com.google.errorprone.annotations.**

# Javax Annotation
-dontwarn javax.annotation.**
-keep class javax.annotation.** { *; }
