import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/user.dart';
import '../services/api_service.dart';

final dashboardProvider =
    StateNotifierProvider<DashboardNotifier, AsyncValue<DashboardData>>((ref) {
  final apiService = ref.watch(apiServiceProvider);
  return DashboardNotifier(apiService);
});

/// Tracks the last time dashboard data was successfully loaded.
/// Used by the screen to decide whether to silently refresh on re-entry.
DateTime? _lastDashboardLoad;

class DashboardData {
  final User? user;
  final List<dynamic> suggestions;
  final Map<String, dynamic> stats;
  final Map<String, dynamic> socialStats;

  const DashboardData({
    this.user,
    this.suggestions = const [],
    this.stats = const {
      'resumeUploaded': false,
      'resumeCount': 0,
      'suggestionsAvailable': 0,
      'skillsAssessed': false,
      'completionRate': 0,
      'totalActivities': 0,
      'recentActivities': [],
      'appliedCount': 0,
    },
    this.socialStats = const {'connectionsCount': 0},
  });

  DashboardData copyWith({
    User? user,
    List<dynamic>? suggestions,
    Map<String, dynamic>? stats,
    Map<String, dynamic>? socialStats,
  }) {
    return DashboardData(
      user: user ?? this.user,
      suggestions: suggestions ?? this.suggestions,
      stats: stats ?? this.stats,
      socialStats: socialStats ?? this.socialStats,
    );
  }
}

class DashboardNotifier extends StateNotifier<AsyncValue<DashboardData>> {
  final ApiService _apiService;
  bool _loading = false;

  DashboardNotifier(this._apiService) : super(const AsyncValue.loading()) {
    loadData();
  }

  /// Returns true if data is stale (older than [staleAfter]).
  bool isStale({Duration staleAfter = const Duration(seconds: 30)}) {
    if (_lastDashboardLoad == null) return true;
    return DateTime.now().difference(_lastDashboardLoad!) > staleAfter;
  }

  /// Load dashboard data.
  /// [background] = true → keep showing existing data while refreshing (no loading spinner).
  /// [force] = true → bypass the stale check and always reload.
  Future<void> loadData({bool background = false, bool force = false}) async {
    if (_loading) return;

    // Skip if data is fresh and not forced
    if (!force && background && !isStale()) return;

    _loading = true;

    if (!background || state.valueOrNull == null) {
      state = const AsyncValue.loading();
    }

    try {
      // All 4 API calls in parallel
      final results = await Future.wait([
        _apiService.getUserProfile(),
        _apiService.fetchDashboardStats(),
        _apiService.fetchUserSocialStats(),
        _apiService.fetchCareerRecommendations(),
      ]);

      final user = User.fromJson(results[0] as Map<String, dynamic>);

      const defaultStats = <String, dynamic>{
        'resumeUploaded': false,
        'resumeCount': 0,
        'suggestionsAvailable': 0,
        'skillsAssessed': false,
        'completionRate': 0,
        'totalActivities': 0,
        'recentActivities': <dynamic>[],
        'appliedCount': 0,
      };

      final rawStats = results[1] as Map<String, dynamic>? ?? {};
      final mergedStats = <String, dynamic>{
        ...defaultStats,
        ...rawStats,
        'resumeUploaded': rawStats['resumeUploaded'] ?? rawStats['hasResume'] ?? false,
        'skillsAssessed': rawStats['skillsAssessed'] ?? rawStats['hasSkillsAssessment'] ?? false,
      };

      _lastDashboardLoad = DateTime.now();

      state = AsyncValue.data(DashboardData(
        user: user,
        stats: mergedStats,
        socialStats: results[2] as Map<String, dynamic>? ?? {'connectionsCount': 0},
        suggestions: results[3] as List<dynamic>? ?? [],
      ));
    } catch (e, st) {
      if (state.valueOrNull == null) {
        state = AsyncValue.error(e, st);
      }
      // Keep stale data on background error — don't show error screen
    } finally {
      _loading = false;
    }
  }
}
