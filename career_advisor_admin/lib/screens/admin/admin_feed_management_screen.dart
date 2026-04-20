import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../services/api_service.dart';
import '../../utils/theme.dart';
import '../../widgets/animated_screen.dart';
import 'dart:async';

/// Comprehensive Feed Management Screen for Admin
/// Allows viewing, moderating, and managing all user posts
class AdminFeedManagementScreen extends ConsumerStatefulWidget {
  const AdminFeedManagementScreen({super.key});

  @override
  ConsumerState<AdminFeedManagementScreen> createState() =>
      _AdminFeedManagementScreenState();
}

class _AdminFeedManagementScreenState
    extends ConsumerState<AdminFeedManagementScreen> {
  List<dynamic> _posts = [];
  bool _isLoading = true;
  String? _error;
  Timer? _autoRefreshTimer;

  @override
  void initState() {
    super.initState();
    _loadPosts();
    // Auto-refresh every 30 seconds
    _autoRefreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      _loadPosts(background: true);
    });
  }

  @override
  void dispose() {
    _autoRefreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadPosts({bool background = false}) async {
    if (!mounted) return;
    if (!background) {
      setState(() {
        _isLoading = true;
        _error = null;
      });
    }

    try {
      final apiService = ref.read(apiServiceProvider);
      final response = await apiService.fetchAdminSocialPosts();

      if (mounted) {
        setState(() {
          if (response is Map && response.containsKey('data')) {
            _posts = response['data'] as List? ?? [];
          } else if (response is List) {
            _posts = response;
          } else {
            _posts = [];
          }
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted && !background) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _deletePost(String postId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Post'),
        content: const Text('Are you sure you want to delete this post?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      final apiService = ref.read(apiServiceProvider);
      await apiService.deleteAdminPost(postId);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Post deleted successfully')),
        );
        _loadPosts();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedScreen(
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Feed Management'),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _loadPosts,
              tooltip: 'Refresh',
            ),
          ],
        ),
        body: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('Error: $_error'),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _loadPosts,
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  )
                : _posts.isEmpty
                    ? const Center(child: Text('No posts found'))
                    : RefreshIndicator(
                        onRefresh: _loadPosts,
                        child: ListView.builder(
                          itemCount: _posts.length,
                          padding: const EdgeInsets.all(16),
                          itemBuilder: (context, index) {
                            final post = _posts[index];
                            final userId = post['userId']?.toString() ?? '';
                            return Card(
                              margin: const EdgeInsets.only(bottom: 12),
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                                side: BorderSide(color: Colors.grey.shade200),
                              ),
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        GestureDetector(
                                          onTap: userId.isNotEmpty
                                              ? () => context.push('/admin/users/$userId')
                                              : null,
                                          child: CircleAvatar(
                                            radius: 20,
                                            backgroundColor: AppTheme.adminPrimaryRed.withOpacity(0.1),
                                            backgroundImage: post['userAvatar'] != null && (post['userAvatar'] as String).isNotEmpty
                                                ? NetworkImage(post['userAvatar'] as String) : null,
                                            child: (post['userAvatar'] == null || (post['userAvatar'] as String).isEmpty)
                                                ? Text((post['userName'] ?? 'U')[0].toUpperCase(),
                                                    style: TextStyle(color: AppTheme.adminPrimaryRed, fontWeight: FontWeight.bold))
                                                : null,
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: GestureDetector(
                                            onTap: userId.isNotEmpty
                                                ? () => context.push('/admin/users/$userId')
                                                : null,
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(post['userName'] ?? 'Unknown',
                                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                                                Text(_formatDate(post['createdAt']),
                                                    style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                                              ],
                                            ),
                                          ),
                                        ),
                                        IconButton(
                                          icon: const Icon(Icons.delete_outline, color: Colors.red),
                                          onPressed: () => _deletePost(post['id']),
                                          tooltip: 'Delete post',
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 10),
                                    if (post['content'] != null && (post['content'] as String).isNotEmpty)
                                      Text(post['content'] ?? '', style: const TextStyle(fontSize: 14)),
                                    const SizedBox(height: 8),
                                    Row(
                                      children: [
                                        Icon(Icons.favorite_border, size: 16, color: Colors.grey[600]),
                                        const SizedBox(width: 4),
                                        Text('${post['likesCount'] ?? 0}', style: TextStyle(color: Colors.grey[600], fontSize: 13)),
                                        const SizedBox(width: 16),
                                        Icon(Icons.chat_bubble_outline, size: 16, color: Colors.grey[600]),
                                        const SizedBox(width: 4),
                                        Text('${post['commentsCount'] ?? 0}', style: TextStyle(color: Colors.grey[600], fontSize: 13)),
                                        if (post['isAchievement'] == true) ...[
                                          const SizedBox(width: 12),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: Colors.amber[50],
                                              borderRadius: BorderRadius.circular(6),
                                              border: Border.all(color: Colors.amber.shade200),
                                            ),
                                            child: const Text('🏆 Achievement', style: TextStyle(fontSize: 11)),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
      ),
    );
  }

  String _formatDate(dynamic date) {
    if (date == null) return '';
    try {
      final dt = DateTime.parse(date.toString());
      final now = DateTime.now();
      final diff = now.difference(dt);
      if (diff.inDays > 0) return '${diff.inDays}d ago';
      if (diff.inHours > 0) return '${diff.inHours}h ago';
      if (diff.inMinutes > 0) return '${diff.inMinutes}m ago';
      return 'Just now';
    } catch (_) {
      return '';
    }
  }
}
