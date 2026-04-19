import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'providers/base_url_provider.dart';
import 'router/admin_router.dart';
import 'utils/theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  
  // FORCE CLEAR any HTTPS URLs and reset to HTTP
  final savedUrl = prefs.getString('api_base_url');
  if (savedUrl != null && savedUrl.startsWith('https://')) {
    debugPrint('Clearing HTTPS URL: $savedUrl');
    await prefs.remove('api_base_url');
  }
  
  final cleanUrl = prefs.getString('api_base_url');

  // Logic to handle URL overrides safely
  String? urlOverride;
  if (cleanUrl != null && cleanUrl.startsWith('http')) {
    urlOverride = cleanUrl;
    // Ensure no trailing slash to avoid // in URL
    if (urlOverride.endsWith('/')) {
      urlOverride = urlOverride.substring(0, urlOverride.length - 1);
    }
    debugPrint('Using saved URL: $urlOverride');
  } else {
    debugPrint('Using default URL from config');
  }

  runApp(
    ProviderScope(
      overrides: [
        if (urlOverride != null)
          baseUrlProvider.overrideWith((ref) => urlOverride!),
      ],
      child: const ProviderScope(child: MyApp()),
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
