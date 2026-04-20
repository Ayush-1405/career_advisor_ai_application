import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/api_service.dart';
import '../../widgets/animated_screen.dart';

class AdminResumesScreen extends ConsumerStatefulWidget {
  const AdminResumesScreen({super.key});

  @override
  ConsumerState<AdminResumesScreen> createState() => _AdminResumesScreenState();
}

class _AdminResumesScreenState extends ConsumerState<AdminResumesScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = true;
  String? _error;

  // Resumes tab
  List<dynamic> _resumes = [];
  List<dynamic> _filteredResumes = [];
  String _resumeSearch = '';

  // Analyses tab
  List<dynamic> _analyses = [];
  List<dynamic> _filteredAnalyses = [];
  String _analysisSearch = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() { _isLoading = true; _error = null; });
    try {
      final api = ref.read(apiServiceProvider);
      final results = await Future.wait([
        api.fetchAdminResumes(),
        api.fetchAdminAnalyses(),
      ]);

      final resumeList = results[0] is List ? results[0] as List : [];
      final analysisData = results[1];
      List analysisList = [];
      if (analysisData is Map && analysisData['content'] is List) {
        analysisList = analysisData['content'] as List;
      } else if (analysisData is List) {
        analysisList = analysisData;
      }

      setState(() {
        _resumes = resumeList;
        _analyses = analysisList;
        _filteredResumes = resumeList;
        _filteredAnalyses = analysisList;
        _isLoading = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _isLoading = false; });
    }
  }

  void _filterResumes(String q) {
    final query = q.toLowerCase();
    setState(() {
      _resumeSearch = q;
      _filteredResumes = _resumes.where((r) {
        final user = r['user'] ?? {};
        return (user['name'] ?? '').toString().toLowerCase().contains(query) ||
            (user['email'] ?? '').toString().toLowerCase().contains(query) ||
            (r['fileName'] ?? r['originalFileName'] ?? '').toString().toLowerCase().contains(query);
      }).toList();
    });
  }

  void _filterAnalyses(String q) {
    final query = q.toLowerCase();
    setState(() {
      _analysisSearch = q;
      _filteredAnalyses = _analyses.where((a) {
        return (a['userName'] ?? '').toString().toLowerCase().contains(query) ||
            (a['userEmail'] ?? '').toString().toLowerCase().contains(query) ||
            (a['fileName'] ?? '').toString().toLowerCase().contains(query) ||
            (a['careerPath'] ?? '').toString().toLowerCase().contains(query);
      }).toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedScreen(
      child: Scaffold(
        backgroundColor: Colors.grey[50],
        appBar: AppBar(
          automaticallyImplyLeading: false,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.canPop() ? context.pop() : context.go('/dashboard'),
          ),
          title: const Text('Resumes & Analyses',
              style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w700, fontSize: 20)),
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.transparent,
          elevation: 0,
          iconTheme: const IconThemeData(color: Color(0xFF64748B)),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _loadData,
              tooltip: 'Refresh',
            ),
          ],
          bottom: TabBar(
            controller: _tabController,
            labelColor: const Color(0xFFEF4444),
            unselectedLabelColor: const Color(0xFF64748B),
            indicatorColor: const Color(0xFFEF4444),
            tabs: [
              Tab(text: 'Resumes (${_resumes.length})'),
              Tab(text: 'Analyses (${_analyses.length})'),
            ],
          ),
        ),
        body: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 48, color: Colors.red),
                        const SizedBox(height: 16),
                        Text(_error!, style: const TextStyle(color: Colors.red)),
                        const SizedBox(height: 16),
                        ElevatedButton(onPressed: _loadData, child: const Text('Retry')),
                      ],
                    ),
                  )
                : TabBarView(
                    controller: _tabController,
                    children: [
                      _buildResumesTab(),
                      _buildAnalysesTab(),
                    ],
                  ),
      ),
    );
  }

  // ── RESUMES TAB ──────────────────────────────────────────────────────────────

  Widget _buildResumesTab() {
    return Column(
      children: [
        _buildSearchBar('Search by user, email, filename...', _resumeSearch, _filterResumes),
        Expanded(
          child: _filteredResumes.isEmpty
              ? _buildEmpty('No resumes found', Icons.description_outlined)
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _filteredResumes.length,
                    itemBuilder: (context, i) => _buildResumeCard(_filteredResumes[i]),
                  ),
                ),
        ),
      ],
    );
  }

  Widget _buildResumeCard(Map<String, dynamic> resume) {
    final user = resume['user'] is Map ? resume['user'] as Map : {};
    final name = user['name'] ?? 'Unknown';
    final email = user['email'] ?? '';
    final avatar = user['profilePictureUrl'] as String?;
    final fileName = resume['originalFileName'] ?? resume['fileName'] ?? 'Unknown';
    final fileSize = resume['fileSize'];
    final uploadedAt = _formatDate(resume['uploadedAt'] ?? resume['createdAt']);
    final fileUrl = resume['fileUrl'] ?? resume['filePath'];

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              radius: 24,
              backgroundColor: Colors.red[100],
              backgroundImage: avatar != null && avatar.isNotEmpty
                  ? NetworkImage(avatar) : null,
              child: (avatar == null || avatar.isEmpty)
                  ? Text(name.isNotEmpty ? name[0].toUpperCase() : '?',
                      style: TextStyle(color: Colors.red[800], fontWeight: FontWeight.bold))
                  : null,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                  Text(email, style: const TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.insert_drive_file, size: 14, color: Color(0xFF64748B)),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(fileName,
                            style: const TextStyle(fontSize: 13, color: Color(0xFF374151)),
                            maxLines: 1, overflow: TextOverflow.ellipsis),
                      ),
                    ],
                  ),
                  if (fileSize != null)
                    Text('${(fileSize / 1024).toStringAsFixed(1)} KB',
                        style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                  Text('Uploaded: $uploadedAt',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                ],
              ),
            ),
            Column(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.green[50],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text('PROCESSED',
                      style: TextStyle(color: Colors.green[700], fontSize: 10, fontWeight: FontWeight.bold)),
                ),
                if (fileUrl != null && fileUrl.toString().isNotEmpty) ...[
                  const SizedBox(height: 8),
                  IconButton(
                    icon: const Icon(Icons.download_outlined, size: 20),
                    color: const Color(0xFF3B82F6),
                    tooltip: 'Download Resume',
                    onPressed: () async {
                      final uri = Uri.tryParse(fileUrl.toString());
                      if (uri != null) await launchUrl(uri, mode: LaunchMode.externalApplication);
                    },
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ── ANALYSES TAB ─────────────────────────────────────────────────────────────

  Widget _buildAnalysesTab() {
    return Column(
      children: [
        _buildSearchBar('Search by user, email, career path...', _analysisSearch, _filterAnalyses),
        Expanded(
          child: _filteredAnalyses.isEmpty
              ? _buildEmpty('No analyses found', Icons.analytics_outlined)
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _filteredAnalyses.length,
                    itemBuilder: (context, i) => _buildAnalysisCard(_filteredAnalyses[i]),
                  ),
                ),
        ),
      ],
    );
  }

  Widget _buildAnalysisCard(Map<String, dynamic> analysis) {
    final name = analysis['userName'] ?? 'Unknown';
    final email = analysis['userEmail'] ?? '';
    final avatar = analysis['userAvatar'] as String?;
    final fileName = analysis['fileName'] ?? 'Unknown';
    final score = (analysis['overallScore'] as num?)?.toInt() ?? 0;
    final careerPath = analysis['careerPath'] ?? '';
    final strengths = analysis['strengths'] ?? '';
    final improvements = analysis['improvements'] ?? '';
    final feedback = analysis['feedback'] ?? '';
    final analyzedAt = _formatDate(analysis['analyzedAt']);
    final fileUrl = analysis['fileUrl'];

    final scoreColor = score >= 75 ? Colors.green : (score >= 50 ? Colors.orange : Colors.red);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => _showAnalysisDetail(analysis),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: Colors.purple[100],
                    backgroundImage: avatar != null && avatar.isNotEmpty
                        ? NetworkImage(avatar) : null,
                    child: (avatar == null || avatar.isEmpty)
                        ? Text(name.isNotEmpty ? name[0].toUpperCase() : '?',
                            style: TextStyle(color: Colors.purple[800], fontWeight: FontWeight.bold))
                        : null,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                        Text(email, style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                      ],
                    ),
                  ),
                  // Score badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: scoreColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: scoreColor.withOpacity(0.3)),
                    ),
                    child: Text('$score/100',
                        style: TextStyle(color: scoreColor, fontWeight: FontWeight.bold, fontSize: 14)),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              // File name
              Row(
                children: [
                  const Icon(Icons.description_outlined, size: 14, color: Color(0xFF64748B)),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(fileName,
                        style: const TextStyle(fontSize: 13, color: Color(0xFF374151)),
                        maxLines: 1, overflow: TextOverflow.ellipsis),
                  ),
                  if (fileUrl != null && fileUrl.toString().isNotEmpty)
                    GestureDetector(
                      onTap: () async {
                        final uri = Uri.tryParse(fileUrl.toString());
                        if (uri != null) await launchUrl(uri, mode: LaunchMode.externalApplication);
                      },
                      child: const Icon(Icons.download_outlined, size: 16, color: Color(0xFF3B82F6)),
                    ),
                ],
              ),
              if (careerPath.isNotEmpty) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.explore_outlined, size: 14, color: Color(0xFF8B5CF6)),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text('Suggested: $careerPath',
                          style: const TextStyle(fontSize: 13, color: Color(0xFF8B5CF6), fontWeight: FontWeight.w500),
                          maxLines: 1, overflow: TextOverflow.ellipsis),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 8),
              // Score bar
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: score / 100,
                  backgroundColor: Colors.grey[200],
                  valueColor: AlwaysStoppedAnimation<Color>(scoreColor),
                  minHeight: 6,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Analyzed: $analyzedAt',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                  const Text('Tap for details →',
                      style: TextStyle(fontSize: 11, color: Color(0xFF3B82F6))),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showAnalysisDetail(Map<String, dynamic> analysis) {
    final name = analysis['userName'] ?? 'Unknown';
    final email = analysis['userEmail'] ?? '';
    final fileName = analysis['fileName'] ?? 'Unknown';
    final score = (analysis['overallScore'] as num?)?.toInt() ?? 0;
    final careerPath = analysis['careerPath'] ?? 'Not specified';
    final strengths = analysis['strengths'] ?? 'No data';
    final improvements = analysis['improvements'] ?? 'No data';
    final feedback = analysis['feedback'] ?? 'No feedback';
    final fileUrl = analysis['fileUrl'];
    final scoreColor = score >= 75 ? Colors.green : (score >= 50 ? Colors.orange : Colors.red);

    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 600, maxHeight: 700),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Resume Analysis', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                    IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
                  ],
                ),
                const Divider(),
                Expanded(
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _detailRow(Icons.person, 'User', '$name ($email)'),
                        _detailRow(Icons.insert_drive_file, 'File', fileName),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            const Text('Overall Score: ', style: TextStyle(fontWeight: FontWeight.w600)),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                              decoration: BoxDecoration(
                                color: scoreColor.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text('$score / 100',
                                  style: TextStyle(color: scoreColor, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: score / 100,
                            backgroundColor: Colors.grey[200],
                            valueColor: AlwaysStoppedAnimation<Color>(scoreColor),
                            minHeight: 8,
                          ),
                        ),
                        const SizedBox(height: 16),
                        _detailRow(Icons.explore_outlined, 'Suggested Career Path', careerPath),
                        const SizedBox(height: 12),
                        _sectionCard('✅ Strengths', strengths, Colors.green),
                        const SizedBox(height: 12),
                        _sectionCard('🔧 Areas for Improvement', improvements, Colors.orange),
                        const SizedBox(height: 12),
                        _sectionCard('💬 AI Feedback', feedback, Colors.blue),
                        if (fileUrl != null && fileUrl.toString().isNotEmpty) ...[
                          const SizedBox(height: 16),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              onPressed: () async {
                                final uri = Uri.tryParse(fileUrl.toString());
                                if (uri != null) await launchUrl(uri, mode: LaunchMode.externalApplication);
                              },
                              icon: const Icon(Icons.download),
                              label: const Text('Download Resume'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF3B82F6),
                                foregroundColor: Colors.white,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _detailRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: const Color(0xFF64748B)),
          const SizedBox(width: 8),
          Text('$label: ', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          Expanded(child: Text(value, style: const TextStyle(fontSize: 13))),
        ],
      ),
    );
  }

  Widget _sectionCard(String title, String content, Color color) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(fontWeight: FontWeight.bold, color: color, fontSize: 13)),
          const SizedBox(height: 6),
          Text(content, style: const TextStyle(fontSize: 13, height: 1.5)),
        ],
      ),
    );
  }

  // ── HELPERS ──────────────────────────────────────────────────────────────────

  Widget _buildSearchBar(String hint, String value, Function(String) onChanged) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(16),
      child: TextField(
        onChanged: onChanged,
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
          prefixIcon: const Icon(Icons.search, color: Color(0xFF64748B)),
          filled: true,
          fillColor: const Color(0xFFF8FAFC),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
      ),
    );
  }

  Widget _buildEmpty(String message, IconData icon) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text(message, style: TextStyle(color: Colors.grey[500], fontSize: 16)),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: _loadData, child: const Text('Refresh')),
        ],
      ),
    );
  }

  String _formatDate(dynamic dateStr) {
    if (dateStr == null) return 'N/A';
    try {
      final date = DateTime.parse(dateStr.toString());
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return '${months[date.month - 1]} ${date.day}, ${date.year}';
    } catch (_) {
      return dateStr.toString();
    }
  }
}
