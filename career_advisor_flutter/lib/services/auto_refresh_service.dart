import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/social_feed_provider.dart';
import '../providers/connections_provider.dart';
import '../providers/notifications_provider.dart';
import '../providers/chat_provider.dart';
import '../providers/dashboard_provider.dart';

class AutoRefreshService {
  final Ref _ref;
  Timer? _feedTimer;
  Timer? _connectionsTimer;
  Timer? _notificationsTimer;
  Timer? _chatsTimer;
  Timer? _dashboardTimer;
  bool _isActive = false;

  AutoRefreshService(this._ref);

  void start() {
    if (_isActive) return;
    _isActive = true;

    // Feed: every 20s
    _feedTimer = Timer.periodic(const Duration(seconds: 20), (_) {
      _ref.read(socialFeedProvider.notifier).fetchFeed(background: true);
    });

    // Connections: every 30s
    _connectionsTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      _ref.read(connectionsProvider.notifier).fetchData(background: true);
    });

    // Notifications: every 15s
    _notificationsTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      _ref.read(notificationsProvider.notifier).fetchNotifications(background: true);
    });

    // Chats: every 15s
    _chatsTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      _ref.read(myChatsProvider.notifier).fetchChats(background: true);
    });

    // Dashboard: every 20s (stale check inside prevents unnecessary calls)
    _dashboardTimer = Timer.periodic(const Duration(seconds: 20), (_) {
      _ref.read(dashboardProvider.notifier).loadData(background: true);
    });
  }

  void stop() {
    _isActive = false;
    _feedTimer?.cancel();
    _connectionsTimer?.cancel();
    _notificationsTimer?.cancel();
    _chatsTimer?.cancel();
    _dashboardTimer?.cancel();
  }

  /// Called when app returns to foreground — refresh everything immediately.
  Future<void> refreshAll() async {
    await Future.wait<void>([
      _ref.read(socialFeedProvider.notifier).fetchFeed(background: true),
      _ref.read(connectionsProvider.notifier).fetchData(background: true),
      _ref.read(notificationsProvider.notifier).fetchNotifications(background: true),
      _ref.read(myChatsProvider.notifier).fetchChats(background: true),
      _ref.read(dashboardProvider.notifier).loadData(background: true, force: true),
    ]);
  }

  /// Called on every navigation change — refreshes the relevant provider for the new screen.
  void refreshForRoute(String route) {
    switch (route) {
      case '/feed':
        _ref.read(socialFeedProvider.notifier).fetchFeed(background: true);
        break;
      case '/connections':
        _ref.read(connectionsProvider.notifier).fetchData(background: true);
        _ref.read(notificationsProvider.notifier).fetchNotifications(background: true);
        break;
      case '/chat':
        _ref.read(myChatsProvider.notifier).fetchChats(background: true);
        break;
      case '/dashboard':
      case '/home':
        _ref.read(dashboardProvider.notifier).loadData(background: true);
        _ref.read(connectionsProvider.notifier).fetchData(background: true);
        break;
      case '/profile':
        _ref.read(dashboardProvider.notifier).loadData(background: true, force: true);
        _ref.read(myPostsProvider.notifier).fetchMyPosts(background: true);
        _ref.read(connectionsProvider.notifier).fetchData(background: true);
        break;
    }
  }

  /// Called after a user action that changes dashboard data.
  void invalidateDashboard() {
    _ref.read(dashboardProvider.notifier).loadData(background: true, force: true);
  }

  void dispose() => stop();
}

final autoRefreshServiceProvider = Provider<AutoRefreshService>((ref) {
  final service = AutoRefreshService(ref);
  ref.onDispose(() => service.dispose());
  return service;
});
