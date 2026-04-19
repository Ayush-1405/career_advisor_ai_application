import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'providers/base_url_provider.dart';
import 'router/admin_router.dart';
import 'utils/theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();

  // Clear any cached HTTPS URLs (local dev artifact)
  final saved = prefs.getString('api_base_url');
  if (saved != null && saved.startsWith('https://') &&
      RegExp(r'172\.|192\.168\.|10\.').hasMatch(saved)) {
    await prefs.remove('api_base_url');
  }

  final cleanUrl = prefs.getString('api_base_url');
  String? urlOverride;
  if (cleanUrl != null && cleanUrl.startsWith('http')) {
    urlOverride = cleanUrl.endsWith('/')
        ? cleanUrl.substring(0, cleanUrl.length - 1)
        : cleanUrl;
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

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(adminRouterProvider);
    return MaterialApp.router(
      title: 'CareerPath Admin',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.getAdminTheme(),
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
