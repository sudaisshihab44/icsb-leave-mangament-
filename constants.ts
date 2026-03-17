import { User } from './types';

export const APP_NAME = "UniEvent Manager";

// Mock Initial Data

// 1. HOD - Full Access
export const MOCK_HOD: User = {
  id: 'h1',
  name: 'Dr. Strange',
  role: 'HOD',
  password: 'password',
  canApprove: true
};

// 2. Senior Teacher - Can Approve
export const MOCK_TEACHER: User = {
  id: 't1',
  name: 'Prof. Albus',
  role: 'TEACHER',
  password: 'password',
  canApprove: true
};

// 3. Junior Teacher - View Only
export const MOCK_JUNIOR_TEACHER: User = {
  id: 't2',
  name: 'Prof. Snape',
  role: 'TEACHER',
  password: 'password',
  canApprove: false
};

// Generate students 001 to 053 with password 'pace2024'
export const MOCK_STUDENTS: User[] = Array.from({ length: 53 }, (_, i) => {
  const num = (i + 1).toString().padStart(3, '0');
  return {
    id: `s${num}`,
    name: `Student ${num}`,
    usn: `4PA24IC${num}`,
    role: 'STUDENT',
    password: 'pace2024'
  };
});