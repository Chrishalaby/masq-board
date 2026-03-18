export interface User {
  id: string;
  teamsId: string;
  displayName: string;
  email: string;
  jobTitle?: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
