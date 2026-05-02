import { Department } from './department.model';
import { User } from './user.model';

export interface InitiativeInclusion {
  id: string;
  initiativeId: string;
  userId: string;
  user?: User;
}

export interface Initiative {
  id: string;
  name: string;
  description?: string;
  departmentId: string;
  department?: Department;
  sharepointFolderLink?: string;
  inclusions?: InitiativeInclusion[];
  createdAt: string;
  updatedAt: string;
}
