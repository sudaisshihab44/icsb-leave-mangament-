
import React, { useState, useEffect, useRef } from 'react';
import { User, LeaveApplication, ApplicationStatus } from '../types';
import { storageService } from '../services/storageService';
import { generateLeaveReason } from '../services/geminiService';
import { Button } from '../components/Button';
import { Calendar, Clock, CheckCircle, XCircle, Sparkles, LogOut, ArrowRight, Upload, Image as ImageIcon, BarChart3, Hourglass, CalendarDays, Camera, X, ZoomIn, ZoomOut, Move, Loader2 } from 'lucide-react';
import { format, differenceInDays, isFuture } from 'date-fns';

interface StudentDashboardProps {
  user: User;
  onLogout: () => void;
}

// Simple internal Modal Component for Cropper
const ProfileCropperModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (base64Image: string) => void;
}> = ({ isOpen, onClose, onSave }) => {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const imageRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setImageSrc(reader.result as string);
                setZoom(1);
                setOffset({ x: 0, y: 0 });
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        setIsDragging(true);
        dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        setOffset({
            x: e.clientX - dragStart.current.x,
            y: e.clientY - dragStart.current.y
        });
    };

    const handlePointerUp = () => setIsDragging(false);

    const handleSave = () => {
        if (!imageRef.current || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = 450;
        canvas.height = 600;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const img = imageRef.current;
        const scaleFactor = 1.5; 
        
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(offset.x * scaleFactor, offset.y * scaleFactor);
        
        const aspect = img.naturalWidth / img.naturalHeight;
        let drawWidth = canvas.width;
        let drawHeight = canvas.width / aspect;

        if (drawHeight < canvas.height) {
            drawHeight = canvas.height;
            drawWidth = canvas.height * aspect;
        }

        ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        ctx.restore();

        onSave(canvas.toDataURL('image/jpeg', 0.9));
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Update Profile Photo</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                
                <div className="p-6 flex-1 overflow-y-auto">
                    {!imageSrc ? (
                        <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 h-64 flex flex-col items-center justify-center gap-4 hover:bg-gray-100 transition-colors relative">
                             <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                             <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center">
                                 <Camera className="w-8 h-8" />
                             </div>
                             <p className="text-gray-500 text-sm font-medium">Click to upload photo</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-6">
                            <div className="relative w-[300px] h-[400px] bg-gray-900 overflow-hidden rounded-lg shadow-inner ring-4 ring-orange-100">
                                <img 
                                    ref={imageRef}
                                    src={imageSrc} 
                                    alt="Upload" 
                                    className="absolute max-w-none origin-center select-none"
                                    style={{
                                        transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                                        left: '50%',
                                        top: '50%',
                                        cursor: isDragging ? 'grabbing' : 'grab'
                                    }}
                                    onPointerDown={handlePointerDown}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={handlePointerUp}
                                    onPointerLeave={handlePointerUp}
                                    draggable={false}
                                />
                                <div className="absolute inset-0 pointer-events-none border border-white/20">
                                    <div className="w-full h-1/3 border-b border-white/20"></div>
                                    <div className="w-full h-1/3 border-b border-white/20 top-1/3 absolute"></div>
                                    <div className="h-full w-1/3 border-r border-white/20 left-0 absolute top-0"></div>
                                    <div className="h-full w-1/3 border-r border-white/20 right-1/3 absolute top-0"></div>
                                </div>
                            </div>

                            <div className="w-full px-4 space-y-2">
                                <div className="flex justify-between text-xs text-gray-500 font-medium">
                                    <span>Zoom</span>
                                    <span>{Math.round(zoom * 100)}%</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <ZoomOut className="w-4 h-4 text-gray-400" />
                                    <input 
                                        type="range" 
                                        min="0.5" 
                                        max="3" 
                                        step="0.1" 
                                        value={zoom} 
                                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                                        className="w-full accent-orange-600 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <ZoomIn className="w-4 h-4 text-gray-400" />
                                </div>
                                <p className="text-xs text-center text-gray-400 mt-2 flex items-center justify-center gap-1">
                                    <Move className="w-3 h-3" /> Drag image to position
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 flex gap-3">
                    {imageSrc && (
                         <Button variant="ghost" onClick={() => setImageSrc(null)} className="flex-1">Change Image</Button>
                    )}
                    <Button variant="primary" onClick={handleSave} disabled={!imageSrc} className="flex-1">Save Profile Photo</Button>
                </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
};


export const StudentDashboard: React.FC<StudentDashboardProps> = ({ user: initialUser, onLogout }) => {
  const [user, setUser] = useState(initialUser);
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  
  const [eventName, setEventName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | ApplicationStatus>('ALL');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    loadApplications();
  }, [user.id]);

  const loadApplications = async () => {
    try {
      const myApps = await storageService.getApplications();
      setApplications(myApps.filter(a => a.studentId === user.id));
    } catch (error) {
      console.error("Failed to load applications", error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2000000) {
        alert("File size too large. Please upload an image under 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAiDraft = async () => {
    if (!eventName || !startDate || !endDate) {
      alert("Please enter Event Name and Date Range first.");
      return;
    }
    setIsGenerating(true);
    const draft = await generateLeaveReason(eventName, startDate, endDate, user.name);
    setReason(draft);
    setIsGenerating(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName || !startDate || !endDate || !reason) return;

    if (new Date(startDate) > new Date(endDate)) {
        alert("End date cannot be before start date");
        return;
    }
    
    setIsSubmitting(true);

    const newApp: LeaveApplication = {
      id: `app_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      studentId: user.id,
      studentName: user.name,
      studentUSN: user.usn || '',
      studentProfilePic: user.profilePic || null,
      eventName,
      startDate,
      endDate,
      reason,
      status: 'PENDING',
      timestamp: new Date().toISOString(),
      imageUrl: selectedImage || null,
      isPriority: false,
      assignedTeacherId: null
    };

    try {
        await storageService.saveApplication(newApp);
        setEventName('');
        setStartDate('');
        setEndDate('');
        setReason('');
        setSelectedImage(null);
        await loadApplications();
        alert("Application submitted successfully!");
    } catch (error: any) {
        console.error("Submission failed:", error);
        alert(`Failed to submit application: ${error.message || 'Unknown error'}`);
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleProfileSave = async (base64Image: string) => {
      const updatedUser = { ...user, profilePic: base64Image };
      try {
        await storageService.updateUser(updatedUser);
        setUser(updatedUser);
        localStorage.setItem('unievent_session', JSON.stringify(updatedUser));
      } catch (error) {
        console.error("Failed to update profile", error);
        alert("Failed to update profile picture");
      }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200"><CheckCircle className="w-3 h-3 mr-1"/> Approved</span>;
      case 'REJECTED': return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200"><XCircle className="w-3 h-3 mr-1"/> Rejected</span>;
      default: return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200"><Clock className="w-3 h-3 mr-1"/> Pending</span>;
    }
  };

  const getDuration = () => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) return null;
    const days = differenceInDays(end, start) + 1;
    return `${days} day${days > 1 ? 's' : ''}`;
  };

  const filteredApplications = applications.filter(app => 
    filterStatus === 'ALL' || app.status === filterStatus
  );

  const stats = {
    total: applications.length,
    approved: applications.filter(a => a.status === 'APPROVED').length,
    pending: applications.filter(a => a.status === 'PENDING').length,
    rejected: applications.filter(a => a.status === 'REJECTED').length,
    upcoming: applications.filter(a => a.status === 'APPROVED' && isFuture(new Date(a.startDate))).length
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <ProfileCropperModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} onSave={handleProfileSave} />

      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-tr from-orange-500 to-orange-600 text-white rounded-lg flex items-center justify-center shadow-sm">
              <span className="font-bold text-lg">E</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-800">UniEvent<span className="text-orange-600">Student</span></h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-3">
                 <div className="hidden sm:flex flex-col text-right">
                    <span className="text-sm font-semibold text-gray-900 leading-tight">{user.name}</span>
                    <span className="text-xs text-gray-500">{user.usn}</span>
                 </div>
                 <button onClick={() => setIsProfileModalOpen(true)} className="relative w-10 h-10 rounded-full bg-gray-200 overflow-hidden border-2 border-transparent hover:border-orange-500 transition-all shadow-sm group">
                     {user.profilePic ? <img src={user.profilePic} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">{user.name.charAt(0)}</div>}
                     <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="w-4 h-4 text-white" /></div>
                 </button>
             </div>
            <div className="h-6 w-px bg-gray-200 mx-1"></div>
            <button onClick={onLogout} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8 space-y-8">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><BarChart3 className="w-6 h-6" /></div>
              <div><p className="text-sm text-gray-500 font-medium">Total Applications</p><p className="text-2xl font-bold text-gray-900">{stats.total}</p></div>
           </div>
           <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center"><Hourglass className="w-6 h-6" /></div>
              <div><p className="text-sm text-gray-500 font-medium">Pending Review</p><p className="text-2xl font-bold text-gray-900">{stats.pending}</p></div>
           </div>
           <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center"><CalendarDays className="w-6 h-6" /></div>
              <div><p className="text-sm text-gray-500 font-medium">Upcoming Approved</p><p className="text-2xl font-bold text-gray-900">{stats.upcoming}</p></div>
           </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <section className="lg:col-span-4 xl:col-span-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
                <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 pb-4 border-b border-gray-50"><Calendar className="w-5 h-5 text-orange-600" /> New Application</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Event Details</label>
                    <input type="text" placeholder="Event Name (e.g. Hackathon 2024)" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all" value={eventName} onChange={(e) => setEventName(e.target.value)} required disabled={isSubmitting} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Starts</label>
                        <input type="date" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm transition-all" value={startDate} onChange={(e) => setStartDate(e.target.value)} required disabled={isSubmitting} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Ends</label>
                        <input type="date" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm transition-all" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} required disabled={isSubmitting} />
                    </div>
                </div>
                {getDuration() && <div className="text-xs text-orange-700 font-medium bg-orange-50 px-3 py-2 rounded-lg flex items-center justify-center gap-2 border border-orange-100"><Clock className="w-3.5 h-3.5" /> Total Duration: {getDuration()}</div>}
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Event Image (Optional)</label>
                    <div className="relative group">
                        <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" disabled={isSubmitting} />
                        <div className={`w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition-all ${selectedImage ? 'border-orange-500 bg-orange-50' : 'border-gray-300 bg-gray-50 group-hover:border-orange-400 group-hover:bg-orange-50/50'}`}>
                             {selectedImage ? <img src={selectedImage} alt="Preview" className="h-full w-full object-cover rounded-xl opacity-80" /> : <><Upload className="w-6 h-6 text-gray-400 group-hover:text-orange-500" /><span className="text-xs text-gray-500 group-hover:text-orange-600">Click to upload image</span></>}
                        </div>
                    </div>
                </div>
                <div>
                    <div className="flex justify-between items-center mb-1.5"><label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Statement of Purpose</label><button type="button" onClick={handleAiDraft} disabled={isGenerating || isSubmitting} className="text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-2 py-1 rounded transition-colors flex items-center gap-1 font-medium disabled:opacity-50"><Sparkles className="w-3 h-3" /> {isGenerating ? 'Writing...' : 'AI Write'}</button></div>
                    <textarea rows={4} placeholder="Why do you want to attend this event?" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none resize-none transition-all" value={reason} onChange={(e) => setReason(e.target.value)} required disabled={isSubmitting} />
                </div>
                <Button fullWidth type="submit" disabled={isGenerating || isSubmitting} size="lg" className="shadow-lg shadow-orange-200">{isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Submit Request'}</Button>
                </form>
            </div>
            </section>

            <section className="lg:col-span-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-gray-800">Application History</h2>
                <div className="flex items-center bg-white p-1 rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
                <button onClick={() => setFilterStatus('ALL')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap flex items-center gap-2 ${filterStatus === 'ALL' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>All <span className={`px-1.5 py-0.5 rounded-full text-[10px] leading-none ${filterStatus === 'ALL' ? 'bg-gray-600' : 'bg-gray-100'}`}>{stats.total}</span></button>
                <div className="w-px h-4 bg-gray-200 mx-1"></div>
                <button onClick={() => setFilterStatus('PENDING')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap flex items-center gap-2 ${filterStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>Pending <span className={`px-1.5 py-0.5 rounded-full text-[10px] leading-none ${filterStatus === 'PENDING' ? 'bg-yellow-200/50' : 'bg-gray-100'}`}>{stats.pending}</span></button>
                <button onClick={() => setFilterStatus('APPROVED')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap flex items-center gap-2 ${filterStatus === 'APPROVED' ? 'bg-green-100 text-green-800' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>Approved <span className={`px-1.5 py-0.5 rounded-full text-[10px] leading-none ${filterStatus === 'APPROVED' ? 'bg-green-200/50' : 'bg-gray-100'}`}>{stats.approved}</span></button>
                <button onClick={() => setFilterStatus('REJECTED')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap flex items-center gap-2 ${filterStatus === 'REJECTED' ? 'bg-red-100 text-red-800' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>Rejected <span className={`px-1.5 py-0.5 rounded-full text-[10px] leading-none ${filterStatus === 'REJECTED' ? 'bg-red-200/50' : 'bg-gray-100'}`}>{stats.rejected}</span></button>
                </div>
            </div>

            <div className="space-y-4">
                {filteredApplications.length === 0 && (<div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200 text-center"><div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4"><Calendar className="w-6 h-6 text-gray-400" /></div><h3 className="text-lg font-medium text-gray-900">No applications found</h3><p className="text-gray-500 text-sm max-w-xs mx-auto mt-1">{filterStatus === 'ALL' ? "You haven't filed any leave requests yet." : `You have no ${filterStatus.toLowerCase()} requests.`}</p></div>)}
                {filteredApplications.map((app) => (
                <div key={app.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group"><div className="flex flex-col sm:flex-row"><div className="sm:w-48 h-32 sm:h-auto bg-gray-100 relative shrink-0">{app.imageUrl ? <img src={app.imageUrl} alt={app.eventName} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300"><ImageIcon className="w-8 h-8" /></div>}<div className="absolute top-2 left-2 sm:hidden">{getStatusBadge(app.status)}</div></div><div className="flex-1 p-5 flex flex-col justify-between"><div><div className="flex justify-between items-start mb-2"><div><h3 className="font-bold text-lg text-gray-900 leading-tight">{app.eventName}</h3><div className="flex items-center gap-2 text-gray-500 text-xs mt-1"><Calendar className="w-3 h-3"/><span className="font-medium">{format(new Date(app.startDate), 'MMM d, yyyy')}</span><ArrowRight className="w-3 h-3" /><span className="font-medium">{format(new Date(app.endDate), 'MMM d, yyyy')}</span></div></div><div className="hidden sm:block">{getStatusBadge(app.status)}</div></div><p className="text-gray-600 text-sm line-clamp-2 mb-4 bg-gray-50 p-2 rounded border border-gray-100/50">{app.reason}</p></div><div className="flex items-center justify-between pt-3 border-t border-gray-50"><div className="text-xs text-gray-400">Applied {format(new Date(app.timestamp), 'MMM d')}</div>{app.status === 'APPROVED' && isFuture(new Date(app.startDate)) && <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded flex items-center gap-1"><Hourglass className="w-3 h-3" /> Upcoming</span>}</div></div></div></div>))}
            </div>
            </section>
        </div>
      </main>
    </div>
  );
};
