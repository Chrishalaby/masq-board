import { User } from './user.model';

export interface Note {
  id: string;
  title: string;
  content: string;
  isPublic: boolean;
  color?: string;
  authorId: string;
  author?: User;
  taggedUsers?: User[];
  createdAt: string;
  updatedAt: string;
}

export const NOTE_COLORS: { value: string; label: string }[] = [
  { value: '#FEF3C7', label: 'Yellow' },
  { value: '#DBEAFE', label: 'Blue' },
  { value: '#D1FAE5', label: 'Green' },
  { value: '#FCE7F3', label: 'Pink' },
  { value: '#EDE9FE', label: 'Purple' },
  { value: '#FEE2E2', label: 'Red' },
  { value: '#F3F4F6', label: 'Gray' },
];
