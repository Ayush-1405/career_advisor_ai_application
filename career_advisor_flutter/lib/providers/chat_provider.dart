import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/chat_message.dart';
import '../services/api_service.dart';

final myChatsProvider = StateNotifierProvider<MyChatsNotifier, AsyncValue<List<ChatRoom>>>((ref) {
  final apiService = ref.watch(apiServiceProvider);
  return MyChatsNotifier(apiService);
});

class MyChatsNotifier extends StateNotifier<AsyncValue<List<ChatRoom>>> {
  final ApiService _apiService;

  MyChatsNotifier(this._apiService) : super(const AsyncValue.loading()) {
    fetchChats();
  }

  Future<void> fetchChats({bool background = false}) async {
    if (!background && state.valueOrNull == null) {
      state = const AsyncValue.loading();
    }
    try {
      final response = await _apiService.fetchMyChats();
      if (response is List) {
        final chats = response.map((e) => ChatRoom.fromJson(e as Map<String, dynamic>)).toList();
        state = AsyncValue.data(chats);
      } else {
        state = const AsyncValue.data([]);
      }
    } catch (e, st) {
      if (!background) state = AsyncValue.error(e, st);
    }
  }

  /// Instantly clear unread badge for a room (called when user opens the chat).
  void markRoomAsRead(String roomId) {
    final current = state.valueOrNull;
    if (current == null) return;
    state = AsyncValue.data(
      current.map((r) => r.chatRoomId == roomId ? r.copyWith(unreadCount: 0) : r).toList(),
    );
  }

  Future<void> markAllAsRead() async {
    final currentChats = state.valueOrNull;
    if (currentChats == null || currentChats.isEmpty) return;
    try {
      final updatedChats = currentChats.map((r) => r.copyWith(unreadCount: 0)).toList();
      state = AsyncValue.data(updatedChats);
      final roomsWithUnread = currentChats.where((r) => (r.unreadCount) > 0);
      await Future.wait(roomsWithUnread.map((r) => _apiService.markMessagesAsRead(r.id)));
      await fetchChats(background: true);
    } catch (e) {
      state = AsyncValue.data(currentChats);
      rethrow;
    }
  }

  Future<void> deleteChat(String roomId) async {
    final currentChats = state.valueOrNull ?? [];
    state = AsyncValue.data(currentChats.where((r) => r.chatRoomId != roomId).toList());
    try {
      await _apiService.deleteChat(roomId);
    } catch (e) {
      state = AsyncValue.data(currentChats);
      rethrow;
    }
  }

  Future<void> clearAllChats() async {
    final currentChats = state.valueOrNull ?? [];
    state = const AsyncValue.data([]);
    try {
      await _apiService.clearAllChats();
    } catch (e) {
      state = AsyncValue.data(currentChats);
      rethrow;
    }
  }
}

final chatMessagesProvider = StateNotifierProvider.family<ChatMessagesNotifier, AsyncValue<List<ChatMessage>>, String>(
  (ref, roomId) {
    final apiService = ref.watch(apiServiceProvider);
    return ChatMessagesNotifier(apiService, roomId, ref);
  },
);

class ChatMessagesNotifier extends StateNotifier<AsyncValue<List<ChatMessage>>> {
  final ApiService _apiService;
  final String roomId;
  final Ref _ref;

  ChatMessagesNotifier(this._apiService, this.roomId, this._ref)
      : super(const AsyncValue.loading()) {
    fetchMessages();
  }

  Future<void> fetchMessages({bool background = false}) async {
    if (!background && state.valueOrNull == null) {
      state = const AsyncValue.loading();
    }
    try {
      final response = await _apiService.fetchMessages(roomId);
      if (response is List) {
        final msgs = response
            .map((e) => ChatMessage.fromJson(e as Map<String, dynamic>))
            .toList();
        state = AsyncValue.data(msgs);

        // Mark incoming messages as read + clear badge in chat list
        _apiService.markMessagesAsRead(roomId).then((_) {
          _ref.read(myChatsProvider.notifier).markRoomAsRead(roomId);
        }).catchError((_) {});
      } else {
        state = const AsyncValue.data([]);
      }
    } catch (e, st) {
      if (!background) state = AsyncValue.error(e, st);
    }
  }

  /// Optimistic send — adds message to list immediately, then syncs.
  Future<void> sendMessage(String receiverId, String content) async {
    // Optimistic: add a temporary message immediately
    final tempMsg = ChatMessage(
      id: 'temp_${DateTime.now().millisecondsSinceEpoch}',
      chatRoomId: roomId,
      senderId: 'me', // will be replaced on refresh
      content: content,
      isRead: false,
      timestamp: DateTime.now(),
    );
    final current = state.valueOrNull ?? [];
    state = AsyncValue.data([...current, tempMsg]);

    try {
      await _apiService.sendMessage(receiverId, content);
      // Refresh to get real message with correct ID and senderId
      await fetchMessages(background: true);
    } catch (e) {
      // Rollback optimistic message on failure
      state = AsyncValue.data(current);
      rethrow;
    }
  }

  /// Mark all messages in this room as read (called when other user opens the chat).
  /// This updates the isRead flag on our sent messages so "Seen" shows.
  Future<void> refreshReadStatus() async {
    final current = state.valueOrNull;
    if (current == null) return;
    // Re-fetch to get updated isRead flags from server
    await fetchMessages(background: true);
  }

  Future<void> clearMessages() async {
    final currentMsgs = state.valueOrNull ?? [];
    state = const AsyncValue.data([]);
    try {
      await _apiService.clearMessages(roomId);
    } catch (e) {
      state = AsyncValue.data(currentMsgs);
      rethrow;
    }
  }
}

final onlineStatusProvider = StreamProvider.family.autoDispose<bool, String>((ref, userId) async* {
  final apiService = ref.watch(apiServiceProvider);
  try {
    final initialStatus = await apiService.getUserStatus(userId);
    yield initialStatus?['isOnline'] == true;
  } catch (_) {
    yield false;
  }

  await for (final _ in Stream.periodic(const Duration(seconds: 15))) {
    try {
      final status = await apiService.getUserStatus(userId);
      yield status?['isOnline'] == true;
    } catch (_) {
      yield false;
    }
  }
});
