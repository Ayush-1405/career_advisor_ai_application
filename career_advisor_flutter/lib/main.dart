import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:app_links/app_links.dart';
import 'providers/base_url_provider.dart';
import 'router/app_router.dart';
import 'utils/theme.dart';
import 'providers/theme_provider.dart';
import 'utils/config.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  final savedUrl = prefs.getString('api_base_url');

  // Logic to handle URL overrides safely
  String? urlOverride;
  if (savedUrl != null && savedUrl.startsWith('http')) {
    // In release mode, ignore local overrides (localhost/10.0.2.2/192.168.x.x etc)
    // to prevent connection errors on real devices from old debug session settings
    const bool isRelease = bool.fromEnvironment('dart.vm.product');
    final bool isLocal =
        savedUrl.contains('localhost') ||
        savedUrl.contains('10.') ||
        savedUrl.contains('127.0.0.1') ||
        savedUrl.contains('192.168.') ||
        savedUrl.contains('172.'); // Common local IP ranges

    if (!isRelease || !isLocal) {
      urlOverride = savedUrl;
      // Ensure no trailing slash to avoid // in URL
      if (urlOverride.endsWith('/')) {
        urlOverride = urlOverride.substring(0, urlOverride.length - 1);
      }
      AppConfig.baseUrl = urlOverride;
    } else {
      debugPrint('Release mode: Ignoring local API override $savedUrl');
    }
  }

  runApp(
    ProviderScope(
      overrides: [
        if (urlOverride != null)
          baseUrlProvider.overrideWith((ref) => urlOverride!),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends ConsumerStatefulWidget {
  const MyApp({super.key});

  @override
  ConsumerState<MyApp> createState() => _MyAppState();
}

class _MyAppState extends ConsumerState<MyApp> {
  late final AppLinks _appLinks;

  @override
  void initState() {
    super.initState();
    _initDeepLinks();
  }

  void _initDeepLinks() {
    _appLinks = AppLinks();

    // Handle link that launched the app from a cold start
    // Use a small delay to ensure the router is fully initialized first
    _appLinks.getInitialLink().then((uri) {
      if (uri != null) {
        // Delay to let the router and auth state initialize
        Future.delayed(const Duration(milliseconds: 500), () {
          if (mounted) _handleDeepLink(uri);
        });
      }
    });

    // Handle links while app is already running
    _appLinks.uriLinkStream.listen((uri) {
      if (mounted) _handleDeepLink(uri);
    });
  }

  void _handleDeepLink(Uri uri) {
    debugPrint('[DeepLink] Received: $uri');
    // careerapp://reset-password?token=xxx&email=yyy
    if (uri.scheme == 'careerapp' && uri.host == 'reset-password') {
      final token = uri.queryParameters['token'];
      final email = uri.queryParameters['email'];
      if (token != null && email != null) {
        final router = ref.read(appRouterProvider);
        router.go(
          '/reset-password?token=${Uri.encodeComponent(token)}&email=${Uri.encodeComponent(email)}',
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(appRouterProvider);
    final themeMode = ref.watch(themeProvider);

    return MaterialApp.router(
      title: 'CareerPath AI',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.getUserTheme(isDark: false),
      darkTheme: AppTheme.getUserTheme(isDark: true),
      themeMode: themeMode,
      routerConfig: router,
      builder: (context, child) {
        if (child == null) return const SizedBox.shrink();
        return AnimatedSwitcher(
          duration: const Duration(milliseconds: 250),
          switchInCurve: Curves.easeOut,
          switchOutCurve: Curves.easeIn,
          transitionBuilder: (widget, animation) =>
              FadeTransition(opacity: animation, child: widget),
          child: child,
        );
      },
    );
  }
}
