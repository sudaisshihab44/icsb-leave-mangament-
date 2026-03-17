export type Role = 'STUDENT' | 'TEACHER' | 'HOD';

export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  name: string;
  usn?: string; // University Seat Number for students
  role: Role;
  password?: string; // Mock password
  profilePic?: string; // Base64 string of profile picture
  canApprove?: boolean; // Determines if the user can approve applications
}

export interface LeaveApplication {
  id: string;
  studentId: string;
  studentName: string;
  studentUSN: string;
  studentProfilePic?: string; // Snapshot of profile pic at time of application
  eventName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: ApplicationStatus;
  timestamp: string; // ISO string
  reviewedAt?: string;
  imageUrl?: string; // URL or Base64 string of the event image
  isPriority?: boolean; // Marked by teachers for HOD attention
  assignedTeacherId?: string | null; // Teacher assigned to review this application
}

export interface TeacherViewMode {
  mode: 'TRADITIONAL' | 'SWIPE' | 'HISTORY';
}