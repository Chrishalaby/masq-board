import { User } from './user.model';

export interface Department {
  id: string;
  name: string;
  description?: string;
  headOfDepartmentId?: string;
  headOfDepartment?: User;
  sharepointFolderLink?: string;
  createdAt: string;
  updatedAt: string;
}
