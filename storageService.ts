
import { LeaveApplication, User } from '../types';
import { MOCK_STUDENTS, MOCK_TEACHER, MOCK_HOD, MOCK_JUNIOR_TEACHER } from '../constants';

const USERS_KEY = 'unievent_users';
const APPS_KEY = 'unievent_applications';

const initializeStorage = () => {
  if (!localStorage.getItem(USERS_KEY)) {
    const initialUsers = [
      ...MOCK_STUDENTS,
      MOCK_TEACHER,
      MOCK_HOD,
      MOCK_JUNIOR_TEACHER
    ].map(u => ({ ...u, id: u.id || `user_${Math.random().toString(36).substr(2, 9)}` }));
    localStorage.setItem(USERS_KEY, JSON.stringify(initialUsers));
  }
  if (!localStorage.getItem(APPS_KEY)) {
    localStorage.setItem(APPS_KEY, JSON.stringify([]));
  }
};

initializeStorage();

const getStoredUsers = (): User[] => JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
const setStoredUsers = (users: User[]) => localStorage.setItem(USERS_KEY, JSON.stringify(users));

const getStoredApps = (): LeaveApplication[] => JSON.parse(localStorage.getItem(APPS_KEY) || '[]');
const setStoredApps = (apps: LeaveApplication[]) => localStorage.setItem(APPS_KEY, JSON.stringify(apps));

export const storageService = {
  checkDatabaseConnection: async (): Promise<{ ok: boolean; error?: string; code?: string }> => {
    return { ok: true };
  },

  getUsers: async (): Promise<User[]> => {
    return getStoredUsers();
  },

  getFaculty: async (): Promise<User[]> => {
    return getStoredUsers().filter(u => u.role === 'TEACHER' || u.role === 'HOD');
  },

  login: async (identifier: string, password: string, targetRole: 'STUDENT' | 'FACULTY'): Promise<User | null> => {
    const searchId = identifier.trim().toLowerCase();
    if (!searchId) return null;

    const users = getStoredUsers();
    
    // Find user by name or usn
    const user = users.find(u => 
      (u.name.toLowerCase().includes(searchId) || (u.usn && u.usn.toLowerCase().includes(searchId))) && 
      u.password === password
    );

    if (user) {
      const isActuallyFaculty = user.role === 'TEACHER' || user.role === 'HOD';
      const wantsStudent = targetRole === 'STUDENT';
      
      if (wantsStudent && isActuallyFaculty) {
        throw new Error("This is a Faculty account. Please use the Faculty tab.");
      }
      if (!wantsStudent && !isActuallyFaculty) {
        throw new Error("This is a Student account. Please use the Student tab.");
      }
      return user;
    }

    return null;
  },

  registerStudent: async (name: string, usn: string, password: string): Promise<User> => {
    const users = getStoredUsers();
    if (users.some(u => u.role === 'STUDENT' && u.usn === usn)) {
      throw new Error("A student with this USN is already registered.");
    }

    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name,
      usn,
      password,
      role: 'STUDENT'
    };

    setStoredUsers([...users, newUser]);
    return newUser;
  },

  updateUser: async (updatedUser: User): Promise<void> => {
    const users = getStoredUsers();
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
      users[index] = { ...users[index], ...updatedUser };
      setStoredUsers(users);
    }
  },

  seedStudents: async (): Promise<void> => {
    // Already handled by initializeStorage
  },

  getApplications: async (): Promise<LeaveApplication[]> => {
    const apps = getStoredApps();
    return apps.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  saveApplication: async (app: LeaveApplication): Promise<void> => {
    const apps = getStoredApps();
    setStoredApps([app, ...apps]);
  },

  updateApplicationStatus: async (appId: string, status: 'APPROVED' | 'REJECTED' | 'PENDING'): Promise<void> => {
    const apps = getStoredApps();
    const index = apps.findIndex(a => a.id === appId);
    if (index !== -1) {
      apps[index] = { ...apps[index], status, reviewedAt: new Date().toISOString() };
      setStoredApps(apps);
    }
  },

  togglePriority: async (appId: string, isPriority: boolean): Promise<void> => {
    const apps = getStoredApps();
    const index = apps.findIndex(a => a.id === appId);
    if (index !== -1) {
      apps[index] = { ...apps[index], isPriority };
      setStoredApps(apps);
    }
  },

  assignApplication: async (appId: string, teacherId: string | null): Promise<void> => {
    const apps = getStoredApps();
    const index = apps.findIndex(a => a.id === appId);
    if (index !== -1) {
      apps[index] = { ...apps[index], assignedTeacherId: teacherId };
      setStoredApps(apps);
    }
  },

  updateFacultyPermission: async (userId: string, canApprove: boolean): Promise<void> => {
    const users = getStoredUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      users[index] = { ...users[index], canApprove };
      setStoredUsers(users);
    }
  }
};
