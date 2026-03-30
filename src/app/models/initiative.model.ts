import { Department } from './department.model';

export interface Initiative {
  id: string;
  name: string;
  description?: string;
  departmentId: string;
  department?: Department;
  createdAt: string;
  updatedAt: string;
}
