export interface User {
  id: string;
  teamsId: string;
  displayName: string;
  email: string;
  jobTitle?: string;
  avatarUrl?: string;
  isActive: boolean;
  isAdmin: boolean;
  isGeneralSupervisor: boolean;
  canAccessExecDashboard: boolean;
  canUseAttendance: boolean;
  canViewAttendanceReports: boolean;
  departmentId?: string;
  createdAt: string;
  updatedAt: string;
}
