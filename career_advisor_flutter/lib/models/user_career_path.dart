import 'package:career_advisor_flutter/models/user.dart';
import 'package:career_advisor_flutter/models/career_path.dart';

class UserCareerPath {
  final String id;
  final User? user;
  final CareerPath? careerPath;
  final String? userId;
  final String? careerPathId;
  final String status;
  final DateTime appliedAt;
  final DateTime? updatedAt;

  UserCareerPath({
    required this.id,
    this.user,
    this.careerPath,
    this.userId,
    this.careerPathId,
    required this.status,
    required this.appliedAt,
    this.updatedAt,
  });

  factory UserCareerPath.fromJson(Map<String, dynamic> json) {
    String rawStatus =
        (json['status'] ??
                json['applicationStatus'] ??
                json['currentStatus'] ??
                'APPLIED')
            .toString();
    String norm = rawStatus.trim().toUpperCase().replaceAll(' ', '_');
    if (norm == 'PENDING' || norm == 'PROCESSING') {
      norm = 'IN_PROGRESS';
    }

    // careerPath may be a populated Map or a raw string ID
    CareerPath? parsedCareerPath;
    final cp = json['careerPath'];
    if (cp is Map<String, dynamic>) {
      parsedCareerPath = CareerPath.fromJson(cp);
    } else if (cp is Map) {
      parsedCareerPath = CareerPath.fromJson(Map<String, dynamic>.from(cp));
    } else if (cp is String && cp.isNotEmpty) {
      // Raw ID — create a placeholder
      parsedCareerPath = CareerPath(
        id: cp, title: 'Career Path', description: '', level: '',
        category: '', image: '', averageSalary: '', growth: '',
        popularity: 0, requiredSkills: [], careerProgression: [],
      );
    }

    return UserCareerPath(
      id: json['id']?.toString() ?? '',
      user: json['user'] is Map ? User.fromJson(Map<String, dynamic>.from(json['user'] as Map)) : null,
      careerPath: parsedCareerPath,
      userId: json['userId']?.toString(),
      careerPathId: json['careerPathId']?.toString(),
      status: norm,
      appliedAt: json['appliedAt'] != null
          ? DateTime.parse(json['appliedAt'])
          : DateTime.now(),
      updatedAt:
          (json['updatedAt'] is String &&
              (json['updatedAt'] as String).isNotEmpty)
          ? DateTime.parse(json['updatedAt'])
          : json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'].toString())
          : null,
    );
  }
}
