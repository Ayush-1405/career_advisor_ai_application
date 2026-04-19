class AppConfig {
  /// Production backend URL for the admin app.
  /// Override via the "Change Server URL" button or set API_BASE_URL at build time.
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://172.20.10.1:3000',
  );
}
