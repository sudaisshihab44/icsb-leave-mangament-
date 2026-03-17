
import React, { useState } from 'react';
import { storageService } from '../services/storageService';
import { User, Role } from '../types';
import { Button } from '../components/Button';
import { GraduationCap, Briefcase, Loader2, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<'STUDENT' | 'FACULTY'>('STUDENT');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regUsn, setRegUsn] = useState('');
  const [regPass, setRegPass] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const inputClasses = "w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400 shadow-sm font-medium";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    
    try {
      // Pass activeTab as targetRole to ensure we only find relevant users
      const user = await storageService.login(identifier.trim(), password, activeTab);
      
      if (user) {
        onLogin(user);
      } else {
        setError(`Invalid ${activeTab === 'STUDENT' ? 'USN/Password' : 'Faculty credentials'}. Please try again.`);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (regName && regUsn && regPass) {
      setLoading(true);
      try {
        const newUser = await storageService.registerStudent(regName.trim(), regUsn.trim(), regPass);
        onLogin(newUser);
      } catch (err: any) {
        setError(err.message || 'Registration failed.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className={`absolute top-0 left-0 w-full h-[60%] bg-gradient-to-br ${activeTab === 'STUDENT' ? 'from-orange-500 to-orange-700' : 'from-blue-600 to-blue-800'} -z-10 rounded-b-[60px] shadow-2xl transition-all duration-700`}></div>
      
      <div className="bg-white/95 backdrop-blur-md rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden z-10 border border-white/20 flex flex-col">
        
        {/* Navigation Tabs */}
        <div className="flex bg-gray-100/50 p-2 rounded-t-[32px] m-4 mb-0">
          <button
            onClick={() => { setActiveTab('STUDENT'); setIsRegistering(false); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-3.5 text-sm font-bold flex items-center justify-center gap-2 rounded-2xl transition-all ${
              activeTab === 'STUDENT' ? 'bg-white text-orange-600 shadow-lg' : 'text-gray-500 hover:bg-gray-100/80'
            }`}
          >
            <GraduationCap className="w-4 h-4" /> Student
          </button>
          <button
            onClick={() => { setActiveTab('FACULTY'); setIsRegistering(false); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-3.5 text-sm font-bold flex items-center justify-center gap-2 rounded-2xl transition-all ${
              activeTab === 'FACULTY' ? 'bg-white text-blue-600 shadow-lg' : 'text-gray-500 hover:bg-gray-100/80'
            }`}
          >
            <Briefcase className="w-4 h-4" /> Faculty
          </button>
        </div>

        <div className="p-8 pt-6">
          <div className="mb-8 text-center sm:text-left">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {activeTab === 'STUDENT' ? (isRegistering ? 'Join UniEvent' : 'Welcome back') : 'Staff Portal'}
            </h1>
            <p className="text-gray-500 text-sm mt-1.5 font-medium">
              {activeTab === 'STUDENT' 
                ? (isRegistering ? 'Fill in your details to get started' : 'Sign in to your student dashboard') 
                : 'Enter your credentials to manage applications'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-4 rounded-2xl mb-6 border border-red-100 animate-fade-in flex flex-col gap-3">
              <div className="flex items-center gap-2 font-bold">
                <ShieldAlert className="w-4 h-4" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="bg-green-50 text-green-700 text-sm p-4 rounded-2xl mb-6 border border-green-100 animate-fade-in font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {successMsg}
            </div>
          )}

          {activeTab === 'STUDENT' && isRegistering ? (
            <form onSubmit={handleRegister} className="space-y-4">
               <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  className={inputClasses}
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">University USN</label>
                <input
                  type="text"
                  required
                  placeholder="4PA24IC000"
                  className={inputClasses}
                  value={regUsn}
                  onChange={(e) => setRegUsn(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className={inputClasses}
                  value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button type="submit" fullWidth disabled={loading} size="lg" className="rounded-2xl py-4 shadow-xl shadow-orange-100 mt-2">
                 {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
              </Button>
              <div className="text-center mt-6">
                <button type="button" onClick={() => setIsRegistering(false)} className="text-sm text-gray-500 font-semibold hover:text-orange-600 transition-colors" disabled={loading}>
                  Have an account? <span className="text-orange-600 underline underline-offset-4 font-bold">Sign In</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">
                  {activeTab === 'STUDENT' ? 'USN / Student Name' : 'Faculty Name / ID'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={activeTab === 'STUDENT' ? 'USN or Name' : 'Enter Faculty Name'}
                  className={inputClasses}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className={inputClasses}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              
              <Button 
                type="submit" 
                fullWidth 
                disabled={loading} 
                size="lg" 
                className={`rounded-2xl py-4 shadow-xl mt-2 transition-all ${activeTab === 'STUDENT' ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-100' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'}`}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
              </Button>

              {activeTab === 'STUDENT' && (
                <div className="text-center mt-6">
                  <button type="button" onClick={() => setIsRegistering(true)} className="text-sm text-gray-500 font-semibold hover:text-orange-600 transition-colors inline-flex items-center gap-1.5" disabled={loading}>
                    Not registered yet? <span className="text-orange-600 underline underline-offset-4 font-bold">Join now</span>
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
      
      {/* Version Tag */}
      <div className="absolute bottom-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        UniEvent Secure Portal
      </div>
    </div>
  );
};
