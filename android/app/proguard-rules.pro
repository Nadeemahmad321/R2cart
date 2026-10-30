# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.

# React Native Core
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keepclassmembers class * {
    @com.facebook.react.uimanager.annotations.ReactProp <methods>;
    @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>;
}

# React Native Vector Icons
-keep class com.oblador.vectoricons.** { *; }

# Firebase Core & Messaging (Google Play FCM)
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception
-keepclassmembers enum * { *; }
-dontwarn com.google.firebase.**
-keep class com.google.firebase.** { *; }
-keep class io.invertase.firebase.** { *; }
-dontwarn io.invertase.firebase.**
-dontwarn com.google.android.gms.**

# React Native Async Storage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Safe Area Context & Screen Management
-keep class com.th3rdwave.safeareacontext.** { *; }
-keep class com.swmansion.rnscreens.** { *; }

# JNI & Hermes native engine bindings
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.soloader.** { *; }

# Prevent stripping of Kotlin standard library metadata
-keep class kotlin.Metadata { *; }
-keepclassmembers class **$WhenMappings {
    <fields>;
}

# Network & JSON serialization
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
