export interface Course {
  course: string;
  credits: string;
  grade: string;
  code?: string; // Optional, only available in the grade card view
  monthYear?: string; // Optional, only available in the grade card view
}

export interface GradesBySemester {
  semester: string;
  sgpa: string;
  totalCredits?: string; // Optional, only available in the grade card view
  earnedCredits?: string; // Optional, only available in the grade card view
  courses: Course[];
}

export interface SemesterData {
  sgpa: string;
  courses: Course[];
}

export interface StudentProfile {
  nameAndId: string;
  dob: string;
}
