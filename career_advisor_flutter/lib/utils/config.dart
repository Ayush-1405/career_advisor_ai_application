class AppConfig {
  /// Production backend URL.
  /// For local development, override via the "Change Server URL" button in the app.
  static const String _defaultUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://career-advisor-ai-application.onrender.com',
  );

  static String _overrideUrl = _defaultUrl;

  static String get baseUrl {
    final url = _overrideUrl.endsWith('/')
        ? _overrideUrl.substring(0, _overrideUrl.length - 1)
        : _overrideUrl;
    return url;
  }

  static set baseUrl(String url) {
    _overrideUrl = url.endsWith('/') ? url.substring(0, url.length - 1) : url;
  }

  static void resetToDefault() {
    _overrideUrl = _defaultUrl;
  }
}
