import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/api_service.dart';
import '../../widgets/animated_screen.dart';
import 'dart:async';

/// Comprehensive Connections Management Screen for Admin
/// View and manage all user connections and network activity
class AdminConnectionsManagementScreen extends ConsumerStatefulWidget {
  const AdminConnectionsManagementScreen({super.key});

  @override
  ConsumerState<AdminConnectionsManagementScreen> createState() =>
      _AdminConnectionsManagementScreenState();
}

class _AdminConnectionsManagementScreenState
    extends ConsumerState<AdminConnectionsManagementScreen> {
  Map<String, dynamic> _stats = {};
  bool _isLoading = true;
  String? _error;
  Timer? _autoRefreshTimer;

  @override
  void initState() {
    super.initState();
    _loadStats();
    // Auto-refresh every 45 seconds
    _autoRefreshTimer = Timer.periodic(const Duration(seconds: 45), (_) {
      _loadStats(background: true);
    });
  }

  @override
  void dispose() {
    _autoRefreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadStats({bool background = false}) async {
    if (!mounted) return;
    if (!background) {
      setState(() {
        _isLoading = true;
        _error = null;
      });
    }

    try {
      final apiService = ref.read(apiServiceProvider);
      final response = await apiService.fetchAdminSocialStats();

      if (mounted) {
        setState(() {
          if (response is Map && response.containsKey('data')) {
            _stats = response['data'] as Map<String, dynamic>? ?? {};
          } else if (response is Map) {
            _stats = response as Map<String, dynamic>;
          } else {
            _stats = {};
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

  @override
  Widget build(BuildContext context) {
    return AnimatedScreen(
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Connections Management'),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _loadStats,
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
                          onPressed: _loadStats,
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: _loadStats,
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        _buildStatCard(
                          'Total Connections',
                          _stats['totalConnections']?.toString() ?? '0',
                          Icons.people,
                          Colors.blue,
                        ),
                        const SizedBox(height: 16),
                        _buildStatCard(
                          'Active Chat Rooms',
                          _stats['activeChatRooms']?.toString() ?? '0',
                          Icons.chat,
                          Colors.green,
                        ),
                        const SizedBox(height: 16),
                        _buildStatCard(
                          'Total Messages',
                          _stats['totalMessages']?.toString() ?? '0',
                          Icons.message,
                          Colors.orange,
                        ),
                        const SizedBox(height: 16),
                        _buildStatCard(
                          'Total Posts',
                          _stats['totalPosts']?.toString() ?? '0',
                          Icons.post_add,
                          Colors.purple,
                        ),
                      ],
                    ),
                  ),
      ),
    );
  }

  Widget _buildStatCard(
      String title, String value, IconData icon, Color color) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 32),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey[600],
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    value,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
