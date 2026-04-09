import { Department } from './department.model';
import { User } from './user.model';

export interface InitiativeExclusion {
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
  exclusions?: InitiativeExclusion[];
  createdAt: string;
  updatedAt: string;
}
