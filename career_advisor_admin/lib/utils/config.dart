class AppConfig {
  // Node.js Backend URL - Port 3000
  // Use your computer's IP address for physical devices
  // ADMIN APP: Use 172.20.10.1 (different from user app which uses 172.20.10.2)
  static const String productionUrl = 'http://172.20.10.1:3000';

  static String get baseUrl {
    // Return production URL for all platforms by default
    // Ensure no trailing slash to avoid double slashes in paths
    final url = productionUrl.endsWith('/')
        ? productionUrl.substring(0, productionUrl.length - 1)
        : productionUrl;
    
    // Force HTTP (never HTTPS for local development)
    if (url.startsWith('https://') && url.contains('172.20.')) {
      return url.replaceFirst('https://', 'http://');
    }
    
    return url;
  }
}
