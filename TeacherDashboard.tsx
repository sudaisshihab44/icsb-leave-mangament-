
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, LeaveApplication } from '../types';
import { storageService } from '../services/storageService';
import { Button } from '../components/Button';
import { LogOut, List, Layers, History, Check, X, Undo2, Heart, Calendar, GraduationCap, ArrowRight, Search, Clock, Loader2, Star, Users, UserCog, ChevronDown, RefreshCcw } from 'lucide-react';
import { format } from 'date-fns';

interface TeacherDashboardProps {
  user: User;
  onLogout: () => void;
}

type ViewMode = 'TRADITIONAL' | 'SWIPE' | 'HISTORY' | 'STAFF';

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, onLogout }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('TRADITIONAL');
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [pendingApps, setPendingApps] = useState<LeaveApplication[]>([]);
  const [faculty, setFaculty] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [swipeIndex, setSwipeIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number, y: number } | null>(null);

  const canApproveGlobal = user.role === 'HOD' || user.canApprove === true;
  const isHOD = user.role === 'HOD';

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);
    
    try {
        const all = await storageService.getApplications();
        const sorted = all.sort((a, b) => {
            if (a.isPriority && !b.isPriority) return -1;
            if (!a.isPriority && b.isPriority) return 1;
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
        
        setApplications(sorted);
        // Resilient filtering (case-insensitive)
        const pending = sorted.filter(a => a.status?.toUpperCase() === 'PENDING');
        setPendingApps(pending);
        
        // Ensure swipe index doesn't go out of bounds after refresh
        if (swipeIndex >= pending.length) setSwipeIndex(0);

        const staff = await storageService.getFaculty();
        setFaculty(staff);

    } catch (error) {
        console.error("Failed to load data", error);
    } finally {
        setIsLoading(false);
        setIsRefreshing(false);
    }
  }, [swipeIndex]);

  useEffect(() => {
    loadData();
    
    // Set up auto-refresh every 10 seconds to catch new student submissions
    const intervalId = setInterval(() => {
        loadData(true);
    }, 10000);

    return () => clearInterval(intervalId);
  }, [loadData]);

  const handleDecision = async (appId: string, status: 'APPROVED' | 'REJECTED') => {
    const app = applications.find(a => a.id === appId);
    const isAssignedToMe = app?.assignedTeacherId === user.id;

    if (!canApproveGlobal && !isAssignedToMe) {
        alert("Permission denied.");
        return;
    }

    try {
        await storageService.updateApplicationStatus(appId, status);
        // Refresh data immediately
        loadData(true);
    } catch (err) {
        console.error("Decision failed", err);
    }
  };

  const handleTogglePriority = async (appId: string, currentPriority: boolean) => {
      try {
          await storageService.togglePriority(appId, !currentPriority);
          loadData(true);
      } catch (err) {
          console.error(err);
      }
  };

  const handleAssignTeacher = async (appId: string, teacherId: string) => {
      if (!isHOD) return;
      try {
          await storageService.assignApplication(appId, teacherId === 'unassigned' ? null : teacherId);
          loadData(true);
      } catch (err) {
          console.error(err);
      }
  };

  const handlePermissionToggle = async (staffId: string, currentVal: boolean) => {
      if (!isHOD) return;
      try {
          await storageService.updateFacultyPermission(staffId, !currentVal);
          setFaculty(prev => prev.map(u => u.id === staffId ? { ...u, canApprove: !currentVal } : u));
      } catch (err) {
          console.error(err);
      }
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    if (swipeIndex >= pendingApps.length) return;
    
    setSwipeDirection(direction);
    const app = pendingApps[swipeIndex];
    
    setTimeout(async () => {
        await handleDecision(app.id, direction === 'right' ? 'APPROVED' : 'REJECTED');
        setSwipeDirection(null);
        setDragOffset({ x: 0, y: 0 });
    }, 300);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (swipeDirection) return;
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    e.preventDefault();
    const x = e.clientX - dragStartRef.current.x;
    const y = e.clientY - dragStartRef.current.y;
    setDragOffset({ x, y });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragStartRef.current = null;

    const threshold = 100;
    if (dragOffset.x > threshold) handleSwipe('right');
    else if (dragOffset.x < -threshold) handleSwipe('left');
    else setDragOffset({ x: 0, y: 0 });
  };

  const handleRevoke = async (appId: string) => {
    await storageService.updateApplicationStatus(appId, 'PENDING');
    loadData(true);
  };

  const getFilteredHistory = () => {
    return applications.filter(app => {
        if (app.status?.toUpperCase() === 'PENDING') return false;
        if (!historySearchTerm) return true;
        const term = historySearchTerm.toLowerCase();
        return (
            app.studentName.toLowerCase().includes(term) ||
            app.studentUSN.toLowerCase().includes(term) ||
            app.eventName.toLowerCase().includes(term)
        );
    });
  };

  const isDatingMode = viewMode === 'SWIPE';
  const bgColor = isDatingMode ? 'bg-pink-50' : 'bg-gray-50';
  const navColor = isDatingMode ? 'bg-pink-600' : 'bg-orange-600';
  const historyApps = getFilteredHistory();

  const stats = {
    pending: pendingApps.length,
    approved: applications.filter(a => a.status === 'APPROVED').length,
    rejected: applications.filter(a => a.status === 'REJECTED').length
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${bgColor}`}>
      <header className={`${navColor} text-white shadow-lg sticky top-0 z-50 transition-colors duration-500`}>
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
          <div className="flex items-center gap-2">
             <div className="bg-white/20 p-2 rounded-lg">
                {isDatingMode ? <Heart className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
             </div>
             <div>
                 <h1 className="text-xl font-bold tracking-tight">
                    {isDatingMode ? 'Faculty Match' : isHOD ? 'HOD Portal' : 'Faculty Portal'}
                 </h1>
                 <p className="text-xs text-white/80">{user.name} {isHOD && '(Admin)'}</p>
             </div>
          </div>
          
          <div className="flex items-center justify-between w-full sm:w-auto gap-4">
            <div className="flex bg-black/10 rounded-lg p-1 mx-auto sm:mx-0 overflow-x-auto">
                <button 
                    onClick={() => setViewMode('TRADITIONAL')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-sm font-medium whitespace-nowrap ${viewMode === 'TRADITIONAL' ? 'bg-white text-gray-900 shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                >
                    <List className="w-4 h-4" />
                    <span className="hidden sm:inline">List</span>
                </button>
                {canApproveGlobal && (
                    <button 
                        onClick={() => setViewMode('SWIPE')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-sm font-medium whitespace-nowrap ${viewMode === 'SWIPE' ? 'bg-white text-pink-600 shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                    >
                        <Layers className="w-4 h-4" />
                        <span className="hidden sm:inline">Swipe</span>
                    </button>
                )}
                <button 
                    onClick={() => setViewMode('HISTORY')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-sm font-medium whitespace-nowrap ${viewMode === 'HISTORY' ? 'bg-white text-gray-900 shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                >
                    <History className="w-4 h-4" />
                    <span className="hidden sm:inline">History</span>
                </button>
                {isHOD && (
                    <button 
                        onClick={() => setViewMode('STAFF')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-sm font-medium whitespace-nowrap ${viewMode === 'STAFF' ? 'bg-white text-gray-900 shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                    >
                        <Users className="w-4 h-4" />
                        <span className="hidden sm:inline">Staff</span>
                    </button>
                )}
            </div>
            
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => loadData(true)} 
                    disabled={isRefreshing}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/90 hover:text-white disabled:opacity-50"
                    title="Refresh Data"
                >
                  <RefreshCcw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
                <button 
                    onClick={onLogout} 
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/90 hover:text-white"
                    title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {isLoading && viewMode !== 'SWIPE' ? (
             <div className="flex items-center justify-center h-64">
                 <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
             </div>
        ) : (
        <>
        {viewMode === 'TRADITIONAL' && (
          <div className="space-y-6 animate-fade-in min-h-[500px]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
                     <Clock className="w-6 h-6" />
                  </div>
                  <div>
                     <p className="text-sm text-gray-500 font-medium">Pending Review</p>
                     <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                  </div>
               </div>
               <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                     <Check className="w-6 h-6" />
                  </div>
                  <div>
                     <p className="text-sm text-gray-500 font-medium">Approved</p>
                     <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
                  </div>
               </div>
               <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                     <X className="w-6 h-6" />
                  </div>
                  <div>
                     <p className="text-sm text-gray-500 font-medium">Rejected</p>
                     <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
                  </div>
               </div>
            </div>

            <div className="flex items-center justify-between mb-2 pt-2">
                <h2 className="text-2xl font-bold text-gray-800">Pending Requests</h2>
                <div className="flex gap-2">
                    <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2.5 py-1 rounded-full">{pendingApps.length} New</span>
                    {!canApproveGlobal && (
                        <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full border border-gray-200">View Only</span>
                    )}
                </div>
            </div>
            
            {pendingApps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 shadow-sm">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <Check className="w-8 h-8 text-green-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
                    <p className="text-gray-500">No pending applications to review.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                {pendingApps.map(app => {
                    const isAssignedToMe = app.assignedTeacherId === user.id;
                    const canAction = canApproveGlobal || isAssignedToMe;
                    return (
                    <div key={app.id} className={`bg-white p-5 sm:p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow flex flex-col sm:flex-row justify-between gap-6 group relative ${app.isPriority ? 'border-orange-300 bg-orange-50/30' : 'border-gray-100'} ${isAssignedToMe ? 'ring-2 ring-orange-400 ring-offset-2' : ''}`}>
                        <button 
                            onClick={() => handleTogglePriority(app.id, !!app.isPriority)}
                            className="absolute top-4 right-4 text-gray-300 hover:text-orange-500 transition-colors z-10"
                            title={app.isPriority ? "Remove Priority" : "Mark as Priority"}
                        >
                            <Star className={`w-5 h-5 ${app.isPriority ? 'fill-orange-500 text-orange-500' : ''}`} />
                        </button>
                        {app.imageUrl ? (
                            <div className="hidden sm:block w-32 h-32 rounded-lg bg-gray-100 shrink-0 overflow-hidden border border-gray-100">
                                <img src={app.imageUrl} alt="Event" className="w-full h-full object-cover" />
                            </div>
                        ) : app.studentProfilePic ? (
                            <div className="hidden sm:block w-32 h-32 rounded-lg bg-gray-100 shrink-0 overflow-hidden border border-gray-100">
                                <img src={app.studentProfilePic} alt="Student" className="w-full h-full object-cover" />
                            </div>
                        ) : null}
                        <div className="flex-1 space-y-3">
                            <div className="flex flex-col gap-1">
                                {isAssignedToMe && (
                                     <div className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md border border-orange-100 w-fit">
                                        <UserCog className="w-3 h-3" />
                                        Assigned to You
                                    </div>
                                )}
                                <div className="flex items-start justify-between sm:justify-start sm:items-center gap-3 pr-8">
                                    <div className="flex items-center gap-3">
                                        {app.studentProfilePic && (
                                            <img src={app.studentProfilePic} alt="Profile" className="w-10 h-10 rounded-full object-cover border border-gray-200 sm:hidden" />
                                        )}
                                        <span className="font-bold text-lg text-gray-900">{app.studentName}</span>
                                    </div>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                        {app.studentUSN}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100/50">
                                <Calendar className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h4 className="font-semibold text-gray-900 text-sm">{app.eventName}</h4>
                                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                        <span>{format(new Date(app.startDate), 'MMM d')}</span>
                                        <ArrowRight className="w-3 h-3" />
                                        <span>{format(new Date(app.endDate), 'MMM d, yyyy')}</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h5 className="text-xs uppercase tracking-wide text-gray-500 font-bold mb-1">Reason</h5>
                                <p className="text-gray-600 text-sm leading-relaxed">"{app.reason}"</p>
                            </div>
                            {isHOD && (
                                <div className="flex items-center gap-2 mt-2 bg-gray-50 p-2 rounded-lg w-fit">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Assign To:</span>
                                    <div className="relative">
                                        <select 
                                            className="appearance-none bg-white border border-gray-300 text-gray-700 text-xs py-1 px-2 pr-6 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            value={app.assignedTeacherId || 'unassigned'}
                                            onChange={(e) => handleAssignTeacher(app.id, e.target.value)}
                                        >
                                            <option value="unassigned">Unassigned</option>
                                            {faculty.map(f => (
                                                <option key={f.id} value={f.id}>{f.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="w-3 h-3 text-gray-500 absolute right-1.5 top-1.5 pointer-events-none" />
                                    </div>
                                </div>
                            )}
                            {!isHOD && !isAssignedToMe && app.assignedTeacherId && (
                                <div className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                                    <UserCog className="w-3 h-3" />
                                    Assigned to {faculty.find(f => f.id === app.assignedTeacherId)?.name || 'Faculty'}
                                </div>
                            )}
                        </div>
                        <div className="flex sm:flex-col justify-end gap-3 min-w-[120px] sm:border-l sm:border-gray-100 sm:pl-6 pt-4 sm:pt-0 border-t border-gray-100 sm:border-t-0">
                            {canAction ? (
                                <>
                                    <button 
                                        onClick={() => handleDecision(app.id, 'APPROVED')}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm"
                                    >
                                        <Check className="w-4 h-4" /> Approve
                                    </button>
                                    <button 
                                        onClick={() => handleDecision(app.id, 'REJECTED')}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-red-50 hover:border-red-200 text-gray-700 hover:text-red-600 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                                    >
                                        <X className="w-4 h-4" /> Reject
                                    </button>
                                </>
                            ) : (
                                <div className="text-center sm:text-right">
                                    <p className="text-xs text-gray-400 mb-2">Read Only</p>
                                    <button 
                                        onClick={() => handleTogglePriority(app.id, !!app.isPriority)}
                                        className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${app.isPriority ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <Star className={`w-3 h-3 ${app.isPriority ? 'fill-current' : ''}`} />
                                        {app.isPriority ? 'Priority' : 'Mark Priority'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )})}
                </div>
            )}
          </div>
        )}
        {viewMode === 'SWIPE' && canApproveGlobal && (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] w-full overflow-hidden relative touch-none">
            {pendingApps.length === 0 ? (
                 <div className="text-center p-8 bg-white rounded-3xl shadow-xl border border-pink-100 max-w-sm mx-auto w-full mx-4 sm:mx-auto">
                    <div className="w-20 h-20 bg-pink-50 text-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                        <Heart className="w-10 h-10 fill-current" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">No more matches!</h2>
                    <p className="text-gray-500 mb-8">You've reviewed all pending applications.</p>
                    <div className="space-y-3">
                        <Button onClick={() => setViewMode('HISTORY')} variant="primary" fullWidth themeColor="pink" className="shadow-lg shadow-pink-200">
                            View Decision History
                        </Button>
                        <Button onClick={() => setViewMode('TRADITIONAL')} variant="ghost" fullWidth themeColor="pink">
                            Back to List
                        </Button>
                    </div>
                 </div>
            ) : (
                <div className="relative w-full max-w-md px-4 h-[75vh] max-h-[700px] flex items-center justify-center">
                    {pendingApps.length > 1 && (
                         <div className={`
                             absolute w-[calc(100%-48px)] h-[95%] bg-white rounded-3xl shadow-sm border border-pink-100 z-0
                             transition-all duration-500 ease-out
                             ${swipeDirection 
                                ? 'scale-100 opacity-100 translate-y-0' 
                                : 'scale-95 opacity-60 translate-y-4'
                             }
                         `}></div>
                    )}
                    <div 
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        style={{
                            transform: swipeDirection 
                                ? undefined 
                                : `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${dragOffset.x * 0.05}deg)`,
                            cursor: isDragging ? 'grabbing' : 'grab',
                            transition: isDragging ? 'none' : undefined 
                        }}
                        className={`
                            absolute w-[calc(100%-32px)] h-full bg-white rounded-3xl shadow-2xl border border-pink-100 z-10 flex flex-col overflow-hidden 
                            touch-none 
                            ${!isDragging && !swipeDirection ? 'transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1.2)]' : ''}
                            ${swipeDirection ? 'transition-all duration-300 ease-in' : ''}
                            ${swipeDirection === 'left' ? '-translate-x-[150%] -rotate-12 opacity-0' : ''}
                            ${swipeDirection === 'right' ? 'translate-x-[150%] rotate-12 opacity-0' : ''}
                        `}
                    >
                         <div className="relative h-[65%] w-full bg-gray-200 shrink-0">
                             {pendingApps[swipeIndex]?.studentProfilePic ? (
                                <img src={pendingApps[swipeIndex].studentProfilePic} alt="Student" className="w-full h-full object-cover pointer-events-none select-none" draggable={false} />
                             ) : pendingApps[swipeIndex]?.imageUrl ? (
                                <img src={pendingApps[swipeIndex].imageUrl} alt="Event" className="w-full h-full object-cover pointer-events-none select-none" draggable={false} />
                             ) : (
                                <div className="w-full h-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center flex-col gap-2 text-white">
                                    <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                        <span className="text-4xl font-bold">{pendingApps[swipeIndex]?.studentName.charAt(0)}</span>
                                    </div>
                                    <p className="text-sm font-medium opacity-80">No photo available</p>
                                </div>
                             )}
                             <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none"></div>
                             <div className="absolute bottom-0 left-0 right-0 p-6 text-white pointer-events-none z-20">
                                <h2 className="text-3xl font-bold tracking-tight drop-shadow-md truncate">{pendingApps[swipeIndex]?.studentName}</h2>
                                <div className="flex items-center gap-2 text-white/90 font-medium mt-1">
                                    <GraduationCap className="w-4 h-4" /> 
                                    <span>{pendingApps[swipeIndex]?.studentUSN}</span>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-3">
                                     <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-xs font-semibold shadow-sm truncate max-w-full">
                                        {pendingApps[swipeIndex]?.eventName}
                                     </span>
                                     <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-xs font-semibold shadow-sm flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {pendingApps[swipeIndex] && format(new Date(pendingApps[swipeIndex].startDate), 'MMM d')}
                                     </span>
                                </div>
                             </div>
                         </div>
                         <div className="flex-1 bg-white p-6 flex flex-col justify-between relative z-10">
                            <div className="relative">
                                <div className="absolute -left-3 top-0 bottom-0 w-1 bg-pink-200 rounded-full"></div>
                                <p className="text-gray-600 text-sm leading-relaxed italic pl-3 line-clamp-3 overflow-y-hidden">
                                    "{pendingApps[swipeIndex]?.reason}"
                                </p>
                            </div>
                            <div className="flex items-center justify-center gap-10 mt-2 pointer-events-auto pb-1">
                                <button onClick={() => handleSwipe('left')} onPointerDown={(e) => e.stopPropagation()} className="group flex flex-col items-center gap-1 focus:outline-none">
                                    <div className="w-14 h-14 rounded-full border-2 border-red-100 text-red-500 flex items-center justify-center transition-all duration-200 shadow-sm group-hover:scale-110 group-hover:bg-red-50 group-hover:border-red-200 bg-white">
                                        <X className="w-6 h-6" />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-red-300 group-hover:text-red-400">Reject</span>
                                </button>
                                <button onClick={() => handleSwipe('right')} onPointerDown={(e) => e.stopPropagation()} className="group flex flex-col items-center gap-1 focus:outline-none">
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-pink-500 to-rose-600 text-white flex items-center justify-center transition-all duration-200 shadow-lg shadow-pink-200 group-hover:scale-110 group-hover:shadow-pink-300">
                                        <Heart className="w-6 h-6 fill-white" />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-pink-300 group-hover:text-pink-500">Approve</span>
                                </button>
                            </div>
                         </div>
                    </div>
                </div>
            )}
          </div>
        )}
        {viewMode === 'HISTORY' && (
          <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-800">Decision History</h2>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search by student name, USN, or event..." 
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm text-sm"
                        value={historySearchTerm}
                        onChange={(e) => setHistorySearchTerm(e.target.value)}
                    />
                </div>
                <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[750px]">
                            <thead className="bg-gray-50/80 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Student</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Event Details</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {historyApps.map(app => (
                                    <tr key={app.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {app.studentProfilePic ? (
                                                    <img src={app.studentProfilePic} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
                                                ) : (
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                                        app.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                        {app.studentName.charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-medium text-gray-900">{app.studentName}</div>
                                                    <div className="text-xs text-gray-500">{app.studentUSN}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs">
                                            <div className="text-sm font-medium text-gray-900 truncate" title={app.eventName}>{app.eventName}</div>
                                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                <Calendar className="w-3 h-3" />
                                                <span>{format(new Date(app.startDate), 'MMM d')}</span>
                                                <ArrowRight className="w-3 h-3" />
                                                <span>{format(new Date(app.endDate), 'MMM d, yyyy')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {app.status === 'APPROVED' ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                                    <Check className="w-3 h-3 mr-1" /> Approved
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                                    <X className="w-3 h-3 mr-1" /> Rejected
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => handleRevoke(app.id)}
                                                className="text-gray-400 hover:text-orange-600 text-sm font-medium inline-flex items-center gap-1 transition-all px-3 py-1.5 rounded-lg hover:bg-orange-50 hover:scale-105 active:scale-95 active:bg-orange-100"
                                                title="Undo Decision"
                                            >
                                                <Undo2 className="w-4 h-4" /> 
                                                <span className="hidden sm:inline">Revoke</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
          </div>
        )}
        {viewMode === 'STAFF' && isHOD && (
             <div className="space-y-6 animate-fade-in">
                 <h2 className="text-2xl font-bold text-gray-800">Faculty Management</h2>
                 <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/80 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Faculty Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Role</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Approval Rights</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {faculty.map(f => (
                                <tr key={f.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{f.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{f.role}</td>
                                    <td className="px-6 py-4">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer" 
                                                checked={!!f.canApprove}
                                                onChange={() => handlePermissionToggle(f.id, !!f.canApprove)}
                                                disabled={f.role === 'HOD'}
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                                            <span className="ml-3 text-sm font-medium text-gray-700">{f.canApprove ? 'Granted' : 'Revoked'}</span>
                                        </label>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
             </div>
        )}
        </>
        )}
      </main>
    </div>
  );
};
