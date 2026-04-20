import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/api_service.dart';
import '../../services/token_service.dart';
import '../../widgets/animated_screen.dart';

class AdminApplicationsScreen extends ConsumerStatefulWidget {
  const AdminApplicationsScreen({super.key});

  @override
  ConsumerState<AdminApplicationsScreen> createState() =>
      _AdminApplicationsScreenState();
}

class _AdminApplicationsScreenState
    extends ConsumerState<AdminApplicationsScreen> {
  List<Map<String, dynamic>> _applications = [];
  bool _isLoading = true;
  String? _error;
  bool _autoRefresh = false;
  final Duration _refreshInterval = const Duration(seconds: 12);
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => _loadApplications());
    _setupAutoRefresh();
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  void _setupAutoRefresh() {
    _refreshTimer?.cancel();
    if (_autoRefresh) {
      _refreshTimer = Timer.periodic(_refreshInterval, (_) {
        if (!mounted) return;
        if (_isLoading) return;
        _loadApplications();
      });
    }
  }

  Future<void> _loadApplications() async {
    if (!mounted) return;
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      final adminToken = await ref
          .read(tokenServiceProvider.notifier)
          .getAdminToken();
      if (adminToken == null) {
        if (mounted) {
          setState(() {
            _error = 'Admin session required';
            _isLoading = false;
          });
          // Navigate to admin login
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (!mounted) return;
            context.push('/login');
          });
        }
        return;
      }

      final apiService = ref.read(apiServiceProvider);
      final response = await apiService.fetchAllApplications();

      if (mounted) {
        setState(() {
          _applications = (response as List)
              .whereType<Map>()
              .map((e) => Map<String, dynamic>.from(e))
              .toList();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _updateStatus(String id, String status) async {
    final idx = _applications.indexWhere((a) => a['id']?.toString() == id);
    if (idx == -1) return;
    final previous = Map<String, dynamic>.from(_applications[idx]);
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _applications[idx] = {..._applications[idx], 'status': status});
    try {
      await ref.read(apiServiceProvider).updateApplicationStatus(id, status);
      messenger.showSnackBar(SnackBar(content: Text('Status updated to $status')));
    } catch (e) {
      setState(() => _applications[idx] = previous);
      messenger.showSnackBar(SnackBar(content: Text('Failed: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedScreen(
      child: Scaffold(
        backgroundColor: const Color(0xFFF8FAFC), // Slate 50
        appBar: AppBar(
          automaticallyImplyLeading: false,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () {
              if (context.canPop()) {
                context.pop();
              } else {
                context.go('/dashboard');
              }
            },
          ),
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.transparent,
          elevation: 0,
          title: const Text(
            'Career Path Applications',
            style: TextStyle(
              color: Color(0xFF0F172A), // Slate 900
              fontWeight: FontWeight.w700,
              fontSize: 20,
              letterSpacing: -0.5,
            ),
          ),
          iconTheme: const IconThemeData(color: Color(0xFF64748B)),
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(1),
            child: Container(color: const Color(0xFFE2E8F0), height: 1), 
          ),
          actions: [
            const SizedBox(width: 8),
            Container(
              margin: const EdgeInsets.only(right: 16, top: 8, bottom: 8),
              decoration: BoxDecoration(
                border: Border.all(
                  color: _autoRefresh ? const Color(0xFF93C5FD) : const Color(0xFFE2E8F0),
                ),
                color: _autoRefresh ? const Color(0xFFEFF6FF) : Colors.transparent,
                borderRadius: BorderRadius.circular(8),
              ),
              child: IconButton(
                icon: Icon(
                  _autoRefresh ? Icons.sync_rounded : Icons.sync_disabled_rounded,
                  color: _autoRefresh ? const Color(0xFF2563EB) : const Color(0xFF64748B),
                  size: 20,
                ),
                tooltip: _autoRefresh ? 'Auto-refresh: ON' : 'Auto-refresh: OFF',
                onPressed: () {
                  setState(() {
                    _autoRefresh = !_autoRefresh;
                  });
                  _setupAutoRefresh();
                },
              ),
            ),
          ],
        ),
        body: _isLoading
            ? const Center(child: CircularProgressIndicator(color: Color(0xFFEF4444)))
            : _error != null
            ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline_rounded, size: 48, color: Color(0xFFEF4444)),
                    const SizedBox(height: 16),
                    Text('Error: $_error', style: const TextStyle(color: Color(0xFFEF4444))),
                  ],
                ),
              )
            : _applications.isEmpty
            ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.description_outlined, size: 48, color: Color(0xFF94A3B8)),
                    const SizedBox(height: 16),
                    const Text('No applications found', style: TextStyle(color: Color(0xFF64748B), fontSize: 16)),
                    const SizedBox(height: 24),
                    TextButton.icon(
                      onPressed: () async {
                        try {
                          final api = ref.read(apiServiceProvider);
                          await api.adminSeedApplications();
                          await _loadApplications();
                        } catch (e) {
                          if (!context.mounted) return;
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Seed failed: $e'), backgroundColor: Colors.red),
                          );
                        }
                      },
                      icon: const Icon(Icons.bolt_rounded, color: Color(0xFF2563EB)),
                      label: const Text('Seed Demo Applications', style: TextStyle(color: Color(0xFF2563EB))),
                      style: TextButton.styleFrom(
                        backgroundColor: const Color(0xFFEFF6FF),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ],
                ),
              )
            : RefreshIndicator(
                onRefresh: _loadApplications,
                color: const Color(0xFFEF4444), // Admin Primary Red
                child: ListView.builder(
                  padding: const EdgeInsets.all(24),
                  physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                  itemCount: _applications.length,
                  itemBuilder: (context, index) {
                    final app = _applications[index];
                    return _buildApplicationCard(app);
                  },
                ),
              ),
      ),
    );
  }

  Widget _buildApplicationCard(Map<String, dynamic> app) {
    final id = app['id']?.toString() ?? '';
    final rawStatus = (app['status'] ?? 'APPLIED').toString().toUpperCase();
    final cp = app['careerPath'] is Map ? app['careerPath'] as Map : {};
    final user = app['user'] is Map ? app['user'] as Map : {};
    final latestAnalysis = app['latestAnalysis'] is Map
        ? Map<String, dynamic>.from(app['latestAnalysis'] as Map)
        : null;
    final resumes = app['resumes'] is List ? app['resumes'] as List : [];
    final appliedAt = app['appliedAt'] != null
        ? DateTime.tryParse(app['appliedAt'].toString()) ?? DateTime.now()
        : DateTime.now();

    Color statusColor;
    Color statusBgColor;
    switch (rawStatus) {
      case 'APPROVED':
        statusColor = const Color(0xFF059669); statusBgColor = const Color(0xFFD1FAE5); break;
      case 'REJECTED':
        statusColor = const Color(0xFFDC2626); statusBgColor = const Color(0xFFFEE2E2); break;
      case 'IN_PROGRESS':
        statusColor = const Color(0xFFD97706); statusBgColor = const Color(0xFFFEF3C7); break;
      default:
        statusColor = const Color(0xFF2563EB); statusBgColor = const Color(0xFFDBEAFE);
    }

    final score = (latestAnalysis?['overallScore'] as num?)?.toInt();
    final scoreColor = score == null
        ? Colors.grey
        : (score >= 75 ? Colors.green : (score >= 50 ? Colors.orange : Colors.red));

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [BoxShadow(color: const Color(0xFF0F172A).withOpacity(0.02), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Career path title + status
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(cp['title']?.toString() ?? 'Unknown Path',
                      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: statusBgColor,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: statusColor.withOpacity(0.2)),
                  ),
                  child: Text(rawStatus, style: TextStyle(color: statusColor, fontSize: 12, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // User info
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('👤 User Details', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF64748B))),
                  const SizedBox(height: 8),
                  _infoRow(Icons.person_outline, user['name']?.toString() ?? 'Unknown'),
                  _infoRow(Icons.email_outlined, user['email']?.toString() ?? ''),
                  if ((user['phoneNumber'] ?? '').toString().isNotEmpty)
                    _infoRow(Icons.phone_outlined, user['phoneNumber'].toString()),
                  if ((user['location'] ?? '').toString().isNotEmpty)
                    _infoRow(Icons.location_on_outlined, user['location'].toString()),
                ],
              ),
            ),

            // Resume analysis
            if (latestAnalysis != null) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: scoreColor.withOpacity(0.04),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: scoreColor.withOpacity(0.2)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Text('📊 Resume Analysis', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF64748B))),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                          decoration: BoxDecoration(color: scoreColor.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
                          child: Text('$score/100', style: TextStyle(color: scoreColor, fontWeight: FontWeight.bold, fontSize: 13)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: (score ?? 0) / 100,
                        backgroundColor: Colors.grey[200],
                        valueColor: AlwaysStoppedAnimation<Color>(scoreColor),
                        minHeight: 5,
                      ),
                    ),
                    if ((latestAnalysis['careerPath'] ?? '').toString().isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text('Suggested: ${latestAnalysis['careerPath']}',
                          style: const TextStyle(fontSize: 12, color: Color(0xFF8B5CF6), fontWeight: FontWeight.w500)),
                    ],
                    if ((latestAnalysis['strengths'] ?? '').toString().isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text('Strengths: ${latestAnalysis['strengths']}',
                          style: const TextStyle(fontSize: 12, color: Color(0xFF059669)),
                          maxLines: 2, overflow: TextOverflow.ellipsis),
                    ],
                  ],
                ),
              ),
            ],

            // Resumes
            if (resumes.isNotEmpty) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0F9FF),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFBAE6FD)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('📄 Resumes', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF64748B))),
                    const SizedBox(height: 6),
                    ...resumes.take(3).map((r) {
                      final rMap = r is Map ? r : {};
                      final name = rMap['fileName']?.toString() ?? 'Resume';
                      final url = rMap['fileUrl']?.toString() ?? '';
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Row(
                          children: [
                            const Icon(Icons.description_outlined, size: 14, color: Color(0xFF0284C7)),
                            const SizedBox(width: 6),
                            Expanded(child: Text(name, style: const TextStyle(fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis)),
                            if (url.isNotEmpty)
                              GestureDetector(
                                onTap: () async {
                                  final uri = Uri.tryParse(url);
                                  if (uri != null) {
                                    try { await launchUrl(uri, mode: LaunchMode.externalApplication); } catch (_) {}
                                  }
                                },
                                child: const Icon(Icons.download_outlined, size: 16, color: Color(0xFF0284C7)),
                              ),
                          ],
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.calendar_today_rounded, size: 13, color: Color(0xFF94A3B8)),
                const SizedBox(width: 5),
                Text('Applied: ${DateFormat.yMMMd().format(appliedAt)}',
                    style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
              ],
            ),
            const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Divider(height: 1, color: Color(0xFFE2E8F0))),

            Wrap(
              spacing: 10, runSpacing: 8, alignment: WrapAlignment.end,
              children: [
                if (rawStatus != 'REJECTED')
                  _actionBtn('Reject', Icons.cancel_rounded, const Color(0xFFDC2626), const Color(0xFFFEF2F2), () => _updateStatus(id, 'REJECTED')),
                if (rawStatus != 'IN_PROGRESS')
                  _actionBtn('In Progress', Icons.hourglass_empty_rounded, const Color(0xFFD97706), const Color(0xFFFFFBEB), () => _updateStatus(id, 'IN_PROGRESS')),
                if (rawStatus != 'APPROVED')
                  _actionBtn('Approve', Icons.check_circle_rounded, const Color(0xFF059669), const Color(0xFFECFDF5), () => _updateStatus(id, 'APPROVED')),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          Icon(icon, size: 14, color: const Color(0xFF64748B)),
          const SizedBox(width: 6),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 13, color: Color(0xFF374151)), maxLines: 1, overflow: TextOverflow.ellipsis)),
        ],
      ),
    );
  }

  Widget _actionBtn(String label, IconData icon, Color color, Color bg, VoidCallback onTap) {
    return TextButton.icon(
      onPressed: onTap,
      icon: Icon(icon, size: 16),
      label: Text(label),
      style: TextButton.styleFrom(
        foregroundColor: color,
        backgroundColor: bg,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }
}
