import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:remixicon/remixicon.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/api_service.dart';
import '../../utils/theme.dart';
import '../../utils/image_helper.dart';
import '../../widgets/animated_screen.dart';
import '../../widgets/linkedin_post_card.dart';
import '../../providers/connections_provider.dart';
import '../../providers/chat_provider.dart';
import '../../models/post.dart';

class MemberProfileScreen extends ConsumerStatefulWidget {
  final String userId;
  const MemberProfileScreen({super.key, required this.userId});

  @override
  ConsumerState<MemberProfileScreen> createState() => _MemberProfileScreenState();
}

class _MemberProfileScreenState extends ConsumerState<MemberProfileScreen> {
  bool _isLoading = true;
  Map<String, dynamic>? _profile;
  Map<String, dynamic> _socialStats = {'connectionsCount': 0};
  List<Post> _userPosts = [];
  bool _isPrivateAndNotConnected = false;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    if (widget.userId.isEmpty) {
      if (mounted) setState(() => _isLoading = false);
      return;
    }
    if (mounted) setState(() => _isLoading = true);

    try {
      final results = await Future.wait([
        ref.read(apiServiceProvider).fetchUserProfile(widget.userId),
        ref.read(apiServiceProvider).fetchUserSocialStats(userId: widget.userId)
            .catchError((_) => <String, dynamic>{'connectionsCount': 0}),
        ref.read(apiServiceProvider).fetchUserPosts(widget.userId)
            .catchError((_) => <dynamic>[]),
      ]);

      if (mounted) {
        final profileData = results[0] is Map
            ? Map<String, dynamic>.from(results[0] as Map)
            : null;

        // Check if private and not connected
        final isPrivate = profileData?['isPrivate'] == true;
        final isConnectedInResponse = profileData?['isConnected'];
        final isPrivateAndNotConnected = isPrivate && isConnectedInResponse == false;

        final statsData = results[1] is Map
            ? Map<String, dynamic>.from(results[1] as Map)
            : <String, dynamic>{'connectionsCount': 0};

        List<Post> posts = [];
        final postsData = results[2];
        if (postsData is List && !isPrivateAndNotConnected) {
          posts = postsData
              .whereType<Map>()
              .map((json) => Post.fromJson(Map<String, dynamic>.from(json)))
              .toList();
        }

        setState(() {
          _profile = profileData;
          _socialStats = statsData;
          _userPosts = posts;
          _isPrivateAndNotConnected = isPrivateAndNotConnected;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (kDebugMode) debugPrint('MemberProfileScreen error: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    if (_isLoading) {
      return Scaffold(
        backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF3F2EF),
        appBar: AppBar(backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white, elevation: 0),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_profile == null) {
      return Scaffold(
        backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF3F2EF),
        appBar: AppBar(backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white, elevation: 0),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('User not found'),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: _fetchData, child: const Text('Retry')),
            ],
          ),
        ),
      );
    }

    final connectionsState = ref.watch(connectionsProvider);
    final isConnected = connectionsState.maybeWhen(
      data: (s) => s.network.any((u) => u.id == widget.userId),
      orElse: () => false,
    );
    final isPending = connectionsState.maybeWhen(
      data: (s) => s.sentRequests.any((u) => u.id == widget.userId),
      orElse: () => false,
    );

    // Re-check privacy after connections load
    final canSeePrivateContent = isConnected || !_isPrivateAndNotConnected;

    return AnimatedScreen(
      child: Scaffold(
        backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF3F2EF),
        appBar: AppBar(
          title: Text(_profile!['name'] ?? 'Profile'),
          backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
          foregroundColor: isDark ? Colors.white : AppTheme.gray900,
          elevation: 0.5,
        ),
        body: RefreshIndicator(
          onRefresh: _fetchData,
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(child: _buildHeader(isDark, isConnected, isPending)),
              const SliverToBoxAdapter(child: SizedBox(height: 8)),
              SliverToBoxAdapter(child: _buildAboutSection(isDark, canSeePrivateContent)),
              if (canSeePrivateContent) ...[
                const SliverToBoxAdapter(child: SizedBox(height: 8)),
                SliverToBoxAdapter(child: _buildContactSection(isDark)),
              ],
              const SliverToBoxAdapter(child: SizedBox(height: 8)),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Text('Activity',
                      style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : AppTheme.gray900)),
                ),
              ),
              if (!canSeePrivateContent)
                SliverToBoxAdapter(child: _buildPrivateBanner(isDark))
              else if (_userPosts.isEmpty)
                SliverToBoxAdapter(child: _buildEmptyActivity(isDark))
              else
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) => Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: LinkedInPostCard(
                        post: _userPosts[index],
                        isDark: isDark,
                        onFeedRefresh: _fetchData,
                      ),
                    ),
                    childCount: _userPosts.length,
                  ),
                ),
              const SliverToBoxAdapter(child: SizedBox(height: 48)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(bool isDark, bool isConnected, bool isPending) {
    final avatarUrl = _profile!['profilePictureUrl'] as String?;
    final name = _profile!['name'] ?? 'Unknown User';
    final bio = _profile!['bio'] as String? ?? '';
    final location = _profile!['location'] as String? ?? '';
    final connectionsCount = (_socialStats['connectionsCount'] as num?)?.toInt() ?? 0;

    return Container(
      color: isDark ? const Color(0xFF1E293B) : Colors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Banner + Avatar
          SizedBox(
            height: 180,
            child: Stack(
              alignment: Alignment.bottomLeft,
              clipBehavior: Clip.none,
              children: [
                Align(
                  alignment: Alignment.topCenter,
                  child: Container(
                    height: 120,
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [AppTheme.userPrimaryBlue, Color(0xFF7E9EC9)],
                      ),
                    ),
                  ),
                ),
                Positioned(
                  left: 24,
                  bottom: 0,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E293B) : Colors.white,
                      shape: BoxShape.circle,
                    ),
                    child: CircleAvatar(
                      radius: 56,
                      backgroundColor: isDark ? Colors.black26 : Colors.grey.shade200,
                      backgroundImage: avatarUrl != null && avatarUrl.isNotEmpty
                          ? CachedNetworkImageProvider(ImageHelper.getImageUrl(avatarUrl)!)
                          : null,
                      child: (avatarUrl == null || avatarUrl.isEmpty)
                          ? Text(name.isNotEmpty ? name[0].toUpperCase() : 'U',
                              style: TextStyle(
                                  fontSize: 40,
                                  fontWeight: FontWeight.bold,
                                  color: isDark ? Colors.white : AppTheme.userPrimaryBlue))
                          : null,
                    ),
                  ),
                ),
              ],
            ),
          ),

          Padding(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name,
                    style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: isDark ? Colors.white : AppTheme.gray900)),
                if (bio.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(bio,
                      style: TextStyle(
                          fontSize: 15,
                          color: isDark ? Colors.white70 : const Color(0xFF666666))),
                ],
                const SizedBox(height: 8),
                if (location.isNotEmpty)
                  Row(children: [
                    Icon(Remix.map_pin_line, size: 14, color: isDark ? Colors.white54 : AppTheme.gray500),
                    const SizedBox(width: 4),
                    Text(location,
                        style: TextStyle(
                            fontSize: 13,
                            color: isDark ? Colors.white54 : AppTheme.gray500)),
                  ]),
                const SizedBox(height: 8),
                Text('$connectionsCount connections',
                    style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.userPrimaryBlue)),
                const SizedBox(height: 20),

                // Action buttons
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () async {
                          try {
                            if (isConnected) {
                              await ref.read(connectionsProvider.notifier).unfollowUser(widget.userId);
                              if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Disconnected')));
                            } else if (!isPending) {
                              await ref.read(connectionsProvider.notifier).followUser(widget.userId);
                              if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Connection request sent!')));
                            }
                            _fetchData();
                          } catch (e) {
                            if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                          }
                        },
                        icon: Icon(
                          isConnected ? Icons.person_remove_outlined : (isPending ? Icons.hourglass_empty : Icons.person_add_outlined),
                          size: 18,
                        ),
                        label: Text(isConnected ? 'Disconnect' : (isPending ? 'Pending' : 'Connect')),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isConnected
                              ? Colors.redAccent
                              : (isPending ? Colors.blueGrey : AppTheme.userPrimaryBlue),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          elevation: 0,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    OutlinedButton.icon(
                      onPressed: () async {
                        try {
                          final apiService = ref.read(apiServiceProvider);
                          final roomResp = await apiService.getOrCreateChatRoom(widget.userId);
                          final roomId = roomResp ?? 'new';
                          if (mounted) {
                            context.push('/chat/$roomId', extra: {
                              'userId': widget.userId,
                              'userName': name,
                              'userAvatar': avatarUrl,
                            });
                          }
                        } catch (_) {
                          if (mounted) {
                            context.push('/chat/new', extra: {
                              'userId': widget.userId,
                              'userName': name,
                              'userAvatar': avatarUrl,
                            });
                          }
                        }
                      },
                      icon: const Icon(Icons.chat_outlined, size: 18),
                      label: const Text('Message'),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppTheme.userPrimaryBlue),
                        foregroundColor: AppTheme.userPrimaryBlue,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 20),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAboutSection(bool isDark, bool canSeePrivateContent) {
    final bio = _profile!['bio'] as String? ?? '';
    return Container(
      color: isDark ? const Color(0xFF1E293B) : Colors.white,
      padding: const EdgeInsets.all(24),
      width: double.infinity,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('About',
              style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : AppTheme.gray900)),
          const SizedBox(height: 8),
          if (!canSeePrivateContent)
            Row(children: [
              Icon(Icons.lock_outline, size: 16, color: isDark ? Colors.white38 : AppTheme.gray400),
              const SizedBox(width: 8),
              Text('Connect to see full profile',
                  style: TextStyle(color: isDark ? Colors.white38 : AppTheme.gray400, fontSize: 14)),
            ])
          else
            Text(
              bio.isNotEmpty ? bio : 'No bio available.',
              style: TextStyle(fontSize: 15, height: 1.5, color: isDark ? Colors.white70 : AppTheme.gray900),
            ),
        ],
      ),
    );
  }

  Widget _buildContactSection(bool isDark) {
    final email = _profile!['email'] as String? ?? '';
    final phone = _profile!['phoneNumber'] as String? ?? '';
    final linkedin = _profile!['linkedinUrl'] as String? ?? '';
    final github = _profile!['githubUrl'] as String? ?? '';
    final website = _profile!['websiteUrl'] as String? ?? '';

    final hasAny = email.isNotEmpty || phone.isNotEmpty ||
        linkedin.isNotEmpty || github.isNotEmpty || website.isNotEmpty;

    if (!hasAny) return const SizedBox.shrink();

    return Container(
      color: isDark ? const Color(0xFF1E293B) : Colors.white,
      padding: const EdgeInsets.all(24),
      width: double.infinity,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Contact Info',
              style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : AppTheme.gray900)),
          const SizedBox(height: 16),
          if (email.isNotEmpty) _contactRow(Icons.email_outlined, 'Email', email, isDark),
          if (phone.isNotEmpty) _contactRow(Icons.phone_outlined, 'Phone', phone, isDark),
          if (linkedin.isNotEmpty)
            _contactRow(Remix.linkedin_fill, 'LinkedIn', linkedin, isDark, url: linkedin),
          if (github.isNotEmpty)
            _contactRow(Remix.github_fill, 'GitHub', github, isDark, url: github),
          if (website.isNotEmpty)
            _contactRow(Remix.global_line, 'Website', website, isDark, url: website),
          // Social link chips
          if (linkedin.isNotEmpty || github.isNotEmpty || website.isNotEmpty) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 10,
              runSpacing: 8,
              children: [
                if (linkedin.isNotEmpty)
                  _socialChip(Remix.linkedin_fill, 'LinkedIn', linkedin, const Color(0xFF0A66C2), isDark),
                if (github.isNotEmpty)
                  _socialChip(Remix.github_fill, 'GitHub', github,
                      isDark ? Colors.white : Colors.black87, isDark),
                if (website.isNotEmpty)
                  _socialChip(Remix.global_line, 'Website', website, AppTheme.userPrimaryBlue, isDark),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _contactRow(IconData icon, String label, String value, bool isDark, {String? url}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: InkWell(
        onTap: url != null ? () => _launchUrl(url) : null,
        borderRadius: BorderRadius.circular(8),
        child: Row(
          children: [
            Icon(icon, size: 20, color: AppTheme.userPrimaryBlue),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: TextStyle(
                          fontSize: 12, color: isDark ? Colors.white54 : AppTheme.gray500)),
                  const SizedBox(height: 2),
                  Text(value,
                      style: TextStyle(
                          fontSize: 14,
                          color: url != null ? AppTheme.userPrimaryBlue : (isDark ? Colors.white : AppTheme.gray900),
                          fontWeight: FontWeight.w500,
                          decoration: url != null ? TextDecoration.underline : null),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
            if (url != null)
              Icon(Icons.open_in_new, size: 14, color: isDark ? Colors.white38 : AppTheme.gray400),
          ],
        ),
      ),
    );
  }

  Widget _socialChip(IconData icon, String label, String url, Color color, bool isDark) {
    return GestureDetector(
      onTap: () => _launchUrl(url),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          border: Border.all(color: color.withOpacity(0.4)),
          borderRadius: BorderRadius.circular(20),
          color: color.withOpacity(0.08),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 15, color: color),
            const SizedBox(width: 6),
            Text(label,
                style: TextStyle(fontSize: 12, color: color, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }

  Future<void> _launchUrl(String url) async {
    final uri = Uri.tryParse(url.startsWith('http') ? url : 'https://$url');
    if (uri != null) {
      try {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } catch (_) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Could not open link')),
          );
        }
      }
    }
  }

  Widget _buildPrivateBanner(bool isDark) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? Colors.white12 : AppTheme.gray200),
      ),
      child: Column(
        children: [
          Icon(Icons.lock_outline, size: 40, color: isDark ? Colors.white38 : AppTheme.gray400),
          const SizedBox(height: 12),
          Text('This account is private',
              style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white70 : AppTheme.gray700)),
          const SizedBox(height: 8),
          Text('Connect with this user to see their posts, contact info, and social links.',
              textAlign: TextAlign.center,
              style: TextStyle(
                  fontSize: 13, color: isDark ? Colors.white38 : AppTheme.gray500)),
        ],
      ),
    );
  }

  Widget _buildEmptyActivity(bool isDark) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Center(
        child: Text('No recent activity to show.',
            style: TextStyle(color: isDark ? Colors.white54 : AppTheme.gray500)),
      ),
    );
  }
}
