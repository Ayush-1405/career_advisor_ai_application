import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../services/api_service.dart';
import '../../utils/theme.dart';
import '../../widgets/animated_screen.dart';

class JobsScreen extends ConsumerStatefulWidget {
  const JobsScreen({super.key});

  @override
  ConsumerState<JobsScreen> createState() => _JobsScreenState();
}

class _JobsScreenState extends ConsumerState<JobsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<dynamic> _allPaths = [];
  List<dynamic> _recommended = [];
  List<dynamic> _myApplications = [];
  List<dynamic> _saved = [];
  bool _isLoading = true;
  String _searchQuery = '';
  String _selectedCategory = 'All';
  final _searchController = TextEditingController();

  static const _categories = ['All', 'Technology', 'Analytics', 'Design', 'Management', 'Finance'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final api = ref.read(apiServiceProvider);
      final results = await Future.wait([
        api.fetchCareerPaths(),
        api.fetchCareerRecommendations().catchError((_) => []),
        api.fetchMyApplications().catchError((_) => []),
        api.fetchMySavedCareers().catchError((_) => []),
      ]);
      setState(() {
        _allPaths = results[0] is List ? results[0] as List : [];
        _recommended = results[1] is List ? results[1] as List : [];
        _myApplications = results[2] is List ? results[2] as List : [];
        _saved = results[3] is List ? results[3] as List : [];
        _isLoading = false;
      });
    } catch (_) {
      setState(() => _isLoading = false);
    }
  }

  List<dynamic> get _filteredPaths {
    return _allPaths.where((p) {
      final title = (p['title'] ?? '').toString().toLowerCase();
      final category = (p['category'] ?? '').toString();
      final matchSearch = _searchQuery.isEmpty || title.contains(_searchQuery.toLowerCase());
      final matchCat = _selectedCategory == 'All' || category == _selectedCategory;
      return matchSearch && matchCat;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return AnimatedScreen(
      child: Scaffold(
        backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
        body: NestedScrollView(
          headerSliverBuilder: (context, innerBoxIsScrolled) => [
            SliverAppBar(
              automaticallyImplyLeading: false,
              floating: true,
              snap: true,
              backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
              elevation: 0,
              title: Text(
                'Career Paths',
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 22,
                  color: isDark ? Colors.white : const Color(0xFF0F172A),
                  letterSpacing: -0.5,
                ),
              ),
              actions: [
                IconButton(
                  icon: Icon(Icons.bookmark_outline,
                      color: isDark ? Colors.white70 : AppTheme.gray600),
                  onPressed: () => context.push('/user/saved-careers'),
                  tooltip: 'Saved',
                ),
                IconButton(
                  icon: Icon(Icons.assignment_outlined,
                      color: isDark ? Colors.white70 : AppTheme.gray600),
                  onPressed: () => context.push('/my-applications'),
                  tooltip: 'My Applications',
                ),
              ],
              bottom: PreferredSize(
                preferredSize: const Size.fromHeight(110),
                child: Column(
                  children: [
                    // Search bar
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                      child: Container(
                        height: 42,
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isDark ? Colors.white12 : const Color(0xFFE2E8F0),
                          ),
                        ),
                        child: TextField(
                          controller: _searchController,
                          onChanged: (v) => setState(() => _searchQuery = v),
                          style: TextStyle(
                            color: isDark ? Colors.white : const Color(0xFF0F172A),
                            fontSize: 14,
                          ),
                          decoration: InputDecoration(
                            hintText: 'Search career paths...',
                            hintStyle: TextStyle(
                              color: isDark ? Colors.white38 : const Color(0xFF94A3B8),
                              fontSize: 14,
                            ),
                            prefixIcon: Icon(Icons.search,
                                size: 18,
                                color: isDark ? Colors.white38 : const Color(0xFF94A3B8)),
                            border: InputBorder.none,
                            contentPadding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),
                    ),
                    // Tab bar
                    TabBar(
                      controller: _tabController,
                      labelColor: AppTheme.userPrimaryBlue,
                      unselectedLabelColor: isDark ? Colors.white54 : AppTheme.gray500,
                      indicatorColor: AppTheme.userPrimaryBlue,
                      indicatorWeight: 2.5,
                      labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                      tabs: [
                        Tab(text: 'Explore (${_filteredPaths.length})'),
                        Tab(text: 'For You (${_recommended.length})'),
                        Tab(text: 'Applied (${_myApplications.length})'),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
          body: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildExploreTab(isDark),
                    _buildRecommendedTab(isDark),
                    _buildAppliedTab(isDark),
                  ],
                ),
        ),
      ),
    );
  }

  // ── EXPLORE TAB ──────────────────────────────────────────────────────────────

  Widget _buildExploreTab(bool isDark) {
    return RefreshIndicator(
      onRefresh: _loadData,
      child: CustomScrollView(
        slivers: [
          // Category chips
          SliverToBoxAdapter(
            child: SizedBox(
              height: 48,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                itemCount: _categories.length,
                itemBuilder: (context, i) {
                  final cat = _categories[i];
                  final selected = _selectedCategory == cat;
                  return GestureDetector(
                    onTap: () => setState(() => _selectedCategory = cat),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: selected
                            ? AppTheme.userPrimaryBlue
                            : (isDark ? Colors.white10 : Colors.white),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: selected
                              ? AppTheme.userPrimaryBlue
                              : (isDark ? Colors.white12 : const Color(0xFFE2E8F0)),
                        ),
                      ),
                      child: Text(
                        cat,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: selected
                              ? Colors.white
                              : (isDark ? Colors.white70 : AppTheme.gray600),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),

          if (_filteredPaths.isEmpty)
            const SliverFillRemaining(
              child: Center(child: Text('No career paths found')),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, i) => _buildCareerCard(_filteredPaths[i], isDark),
                  childCount: _filteredPaths.length,
                ),
              ),
            ),
        ],
      ),
    );
  }

  // ── RECOMMENDED TAB ──────────────────────────────────────────────────────────

  Widget _buildRecommendedTab(bool isDark) {
    if (_recommended.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.auto_awesome_outlined, size: 56, color: AppTheme.gray400),
            const SizedBox(height: 16),
            Text('Upload your resume to get\npersonalized recommendations',
                textAlign: TextAlign.center,
                style: TextStyle(color: isDark ? Colors.white54 : AppTheme.gray500, fontSize: 15)),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: () => context.push('/analyze'),
              icon: const Icon(Icons.upload_file),
              label: const Text('Upload Resume'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.userPrimaryBlue,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              ),
            ),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _recommended.length,
        itemBuilder: (context, i) {
          final path = _recommended[i];
          final matchScore = (path['matchScore'] as num?)?.toInt();
          return _buildCareerCard(path, isDark, matchScore: matchScore, isRecommended: true);
        },
      ),
    );
  }

  // ── APPLIED TAB ──────────────────────────────────────────────────────────────

  Widget _buildAppliedTab(bool isDark) {
    if (_myApplications.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.send_outlined, size: 56, color: AppTheme.gray400),
            const SizedBox(height: 16),
            Text('No applications yet',
                style: TextStyle(color: isDark ? Colors.white54 : AppTheme.gray500, fontSize: 16)),
            const SizedBox(height: 8),
            Text('Explore career paths and apply',
                style: TextStyle(color: isDark ? Colors.white38 : AppTheme.gray400, fontSize: 13)),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _myApplications.length,
        itemBuilder: (context, i) {
          final app = _myApplications[i];
          final cp = app['careerPath'] is Map ? app['careerPath'] as Map : {};
          final status = (app['status'] ?? 'APPLIED').toString().toUpperCase();
          final statusColor = status == 'APPROVED'
              ? Colors.green
              : status == 'REJECTED'
                  ? Colors.red
                  : status == 'IN_PROGRESS'
                      ? Colors.orange
                      : AppTheme.userPrimaryBlue;

          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: isDark ? Colors.white10 : const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                Container(
                  width: 44, height: 44,
                  decoration: BoxDecoration(
                    color: AppTheme.userPrimaryBlue.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.work_outline, color: AppTheme.userPrimaryBlue, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(cp['title'] ?? 'Career Path',
                          style: TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 15,
                              color: isDark ? Colors.white : const Color(0xFF0F172A))),
                      const SizedBox(height: 3),
                      Text(cp['category'] ?? '',
                          style: TextStyle(fontSize: 12, color: isDark ? Colors.white54 : AppTheme.gray500)),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: statusColor.withOpacity(0.3)),
                  ),
                  child: Text(status,
                      style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  // ── CAREER CARD ──────────────────────────────────────────────────────────────

  Widget _buildCareerCard(dynamic path, bool isDark, {int? matchScore, bool isRecommended = false}) {
    final id = path['id']?.toString() ?? '';
    final title = path['title'] ?? 'Career Path';
    final description = path['description'] ?? '';
    final category = path['category'] ?? '';
    final level = path['level'] ?? '';
    final salary = path['averageSalary'] ?? '';
    final growth = path['growth'] ?? '';
    final popularity = (path['popularity'] as num?)?.toInt() ?? 0;
    final image = path['image'] as String?;
    final skills = (path['requiredSkills'] as List?)?.take(4).toList() ?? [];

    final isApplied = _myApplications.any((a) {
      final cp = a['careerPath'] is Map ? a['careerPath'] as Map : {};
      return cp['id']?.toString() == id || a['careerPathId']?.toString() == id;
    });
    final isSaved = _saved.any((s) => s['careerPathId']?.toString() == id);

    return GestureDetector(
      onTap: () => context.push('/career-paths/$id'),
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E293B) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isDark ? Colors.white10 : const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(isDark ? 0.15 : 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image header
            if (image != null && image.isNotEmpty)
              ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                child: Stack(
                  children: [
                    CachedNetworkImage(
                      imageUrl: image,
                      height: 130,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorWidget: (_, __, ___) => Container(
                        height: 130,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [AppTheme.userPrimaryBlue, AppTheme.userPrimaryPurple],
                          ),
                        ),
                        child: const Center(child: Icon(Icons.work_outline, color: Colors.white, size: 40)),
                      ),
                    ),
                    // Match score badge
                    if (matchScore != null)
                      Positioned(
                        top: 10, right: 10,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.65),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.auto_awesome, size: 12, color: Colors.amber),
                              const SizedBox(width: 4),
                              Text('$matchScore% Match',
                                  style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                      ),
                    // Category badge
                    Positioned(
                      top: 10, left: 10,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.55),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(category,
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
                      ),
                    ),
                  ],
                ),
              ),

            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title + level
                  Row(
                    children: [
                      Expanded(
                        child: Text(title,
                            style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: isDark ? Colors.white : const Color(0xFF0F172A))),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppTheme.userPrimaryBlue.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(level,
                            style: const TextStyle(
                                color: AppTheme.userPrimaryBlue, fontSize: 11, fontWeight: FontWeight.w600)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 13, color: isDark ? Colors.white54 : AppTheme.gray500, height: 1.4)),
                  const SizedBox(height: 10),

                  // Salary + growth
                  Row(
                    children: [
                      _statChip(Icons.attach_money, salary, Colors.green, isDark),
                      const SizedBox(width: 8),
                      _statChip(Icons.trending_up, '$growth growth', Colors.orange, isDark),
                      const SizedBox(width: 8),
                      _statChip(Icons.star, '$popularity%', Colors.purple, isDark),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Skills
                  if (skills.isNotEmpty)
                    Wrap(
                      spacing: 6, runSpacing: 6,
                      children: skills.map((s) => Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: isDark ? Colors.white10 : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(s.toString(),
                            style: TextStyle(
                                fontSize: 11,
                                color: isDark ? Colors.white70 : AppTheme.gray600,
                                fontWeight: FontWeight.w500)),
                      )).toList(),
                    ),
                  const SizedBox(height: 12),

                  // Action buttons
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton(
                          onPressed: isApplied ? null : () => context.push('/career-paths/$id'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isApplied ? Colors.grey[300] : AppTheme.userPrimaryBlue,
                            foregroundColor: isApplied ? Colors.grey[600] : Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            padding: const EdgeInsets.symmetric(vertical: 10),
                          ),
                          child: Text(isApplied ? '✓ Applied' : 'View & Apply',
                              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                        ),
                      ),
                      const SizedBox(width: 8),
                      GestureDetector(
                        onTap: () async {
                          try {
                            final api = ref.read(apiServiceProvider);
                            if (isSaved) {
                              await api.unsaveCareerPath(id);
                            } else {
                              await api.saveCareerPath(id);
                            }
                            await _loadData();
                          } catch (_) {}
                        },
                        child: Container(
                          width: 40, height: 40,
                          decoration: BoxDecoration(
                            color: isSaved
                                ? AppTheme.userPrimaryBlue.withOpacity(0.1)
                                : (isDark ? Colors.white10 : const Color(0xFFF1F5F9)),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: isSaved
                                  ? AppTheme.userPrimaryBlue.withOpacity(0.3)
                                  : (isDark ? Colors.white12 : const Color(0xFFE2E8F0)),
                            ),
                          ),
                          child: Icon(
                            isSaved ? Icons.bookmark : Icons.bookmark_outline,
                            size: 18,
                            color: isSaved ? AppTheme.userPrimaryBlue : (isDark ? Colors.white54 : AppTheme.gray500),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _statChip(IconData icon, String label, Color color, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: color),
          const SizedBox(width: 3),
          Text(label, style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
