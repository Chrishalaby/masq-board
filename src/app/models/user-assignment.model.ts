import { User } from './user.model';

export interface UserAssignment {
  id: string;
  userId: string;
  canAssignToUserId: string;
  departmentId: string;
  user?: User;
  canAssignToUser?: User;
  createdAt: string;
}
