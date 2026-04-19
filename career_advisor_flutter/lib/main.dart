import 'package:flutter/foundation.dart';
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

  String? urlOverride;
  if (savedUrl != null && savedUrl.startsWith('http')) {
    // In release mode, ignore local IP overrides from old debug sessions
    const isRelease = bool.fromEnvironment('dart.vm.product');
    final isLocal = savedUrl.contains('localhost') ||
        savedUrl.contains('127.0.0.1') ||
        savedUrl.contains('10.0.2.2') ||
        RegExp(r'192\.168\.|172\.\d+\.|10\.').hasMatch(savedUrl);

    if (!isRelease || !isLocal) {
      urlOverride = savedUrl.endsWith('/')
          ? savedUrl.substring(0, savedUrl.length - 1)
          : savedUrl;
      AppConfig.baseUrl = urlOverride;
    } else {
      // Release mode with local IP — clear it so production URL is used
      await prefs.remove('api_base_url');
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

    // Cold start deep link
    _appLinks.getInitialLink().then((uri) {
      if (uri != null) {
        Future.delayed(const Duration(milliseconds: 500), () {
          if (mounted) _handleDeepLink(uri);
        });
      }
    });

    // Foreground deep link
    _appLinks.uriLinkStream.listen((uri) {
      if (mounted) _handleDeepLink(uri);
    });
  }

  void _handleDeepLink(Uri uri) {
    if (kDebugMode) debugPrint('[DeepLink] $uri');
    if (uri.scheme == 'careerapp' && uri.host == 'reset-password') {
      final token = uri.queryParameters['token'];
      final email = uri.queryParameters['email'];
      if (token != null && email != null) {
        ref.read(appRouterProvider).go(
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
