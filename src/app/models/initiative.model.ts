import { Department } from './department.model';

export interface Initiative {
  id: string;
  name: string;
  description?: string;
  departmentId: string;
  department?: Department;
  sharepointFolderLink?: string;
  createdAt: string;
  updatedAt: string;
}
