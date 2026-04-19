import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/connection.dart';
import '../services/api_service.dart';

final connectionsProvider =
    StateNotifierProvider<ConnectionsNotifier, AsyncValue<ConnectionsState>>(
        (ref) {
  final apiService = ref.watch(apiServiceProvider);
  return ConnectionsNotifier(apiService);
});

class ConnectionsState {
  final List<ConnectionUser> network;
  final List<ConnectionUser> suggested;
  final List<ConnectionUser> invitations;
  final List<ConnectionUser> sentRequests;

  const ConnectionsState({
    this.network = const [],
    this.suggested = const [],
    this.invitations = const [],
    this.sentRequests = const [],
  });

  ConnectionsState copyWith({
    List<ConnectionUser>? network,
    List<ConnectionUser>? suggested,
    List<ConnectionUser>? invitations,
    List<ConnectionUser>? sentRequests,
  }) {
    return ConnectionsState(
      network: network ?? this.network,
      suggested: suggested ?? this.suggested,
      invitations: invitations ?? this.invitations,
      sentRequests: sentRequests ?? this.sentRequests,
    );
  }
}

class ConnectionsNotifier
    extends StateNotifier<AsyncValue<ConnectionsState>> {
  final ApiService _apiService;
  bool _loading = false;

  ConnectionsNotifier(this._apiService) : super(const AsyncValue.loading()) {
    fetchData();
  }

  Future<void> fetchData({bool background = false}) async {
    if (_loading) return;
    _loading = true;

    if (!background || state.valueOrNull == null) {
      state = const AsyncValue.loading();
    }

    try {
      // Run all 4 in parallel. Each is wrapped so one failure doesn't kill the rest.
      final results = await Future.wait([
        _apiService.fetchMyNetwork().catchError((_) => null),
        _apiService.fetchSuggestedFriends().catchError((_) => null),
        _apiService.fetchInvitations().catchError((_) => null),
        _apiService.fetchSentRequests().catchError((_) => null),
      ]);

      state = AsyncValue.data(ConnectionsState(
        network:      _parseUsers(results[0]),
        suggested:    _parseUsers(results[1]),
        invitations:  _parseUsers(results[2]),
        sentRequests: _parseUsers(results[3]),
      ));
    } catch (e, st) {
      if (state.valueOrNull == null) {
        state = AsyncValue.error(e, st);
      }
    } finally {
      _loading = false;
    }
  }

  List<ConnectionUser> _parseUsers(dynamic res) {
    if (res == null) return [];
    if (res is List) {
      return res
          .whereType<Map<String, dynamic>>()
          .map((e) => ConnectionUser.fromJson(e))
          .toList();
    }
    // Handle { success: true, data: [...] } if _handleResponse didn't unwrap
    if (res is Map && res['data'] is List) {
      return _parseUsers(res['data']);
    }
    return [];
  }

  Future<void> followUser(String userId) async {
    final current = state.valueOrNull;
    if (current != null) {
      final moved = current.suggested.where((u) => u.id == userId).toList();
      state = AsyncValue.data(current.copyWith(
        suggested: current.suggested.where((u) => u.id != userId).toList(),
        sentRequests: [...current.sentRequests, ...moved],
      ));
    }
    try {
      await _apiService.followUser(userId);
    } catch (_) {}
    await fetchData(background: true);
  }

  Future<void> unfollowUser(String userId) async {
    final current = state.valueOrNull;
    if (current != null) {
      final moved = [
        ...current.network.where((u) => u.id == userId),
        ...current.sentRequests.where((u) => u.id == userId),
        ...current.invitations.where((u) => u.id == userId),
      ];
      state = AsyncValue.data(current.copyWith(
        network: current.network.where((u) => u.id != userId).toList(),
        sentRequests: current.sentRequests.where((u) => u.id != userId).toList(),
        invitations: current.invitations.where((u) => u.id != userId).toList(),
        suggested: [
          ...current.suggested,
          ...moved.where((u) => !current.suggested.any((s) => s.id == u.id)),
        ],
      ));
    }
    try {
      await _apiService.followUser(userId);
    } catch (_) {}
    await fetchData(background: true);
  }

  Future<void> acceptInvitation(String userId) async {
    try {
      await _apiService.acceptRequest(userId);
    } catch (_) {}
    await fetchData(background: true);
  }

  Future<void> rejectInvitation(String userId) async {
    try {
      await _apiService.rejectRequest(userId);
    } catch (_) {}
    await fetchData(background: true);
  }
}
