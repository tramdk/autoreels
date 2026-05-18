import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { Shield, Lock, User, Play, Sparkles, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface LoginViewProps {
  onLogin: (u: string, p: string) => void;
  loading: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, loading }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { t } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617] overflow-hidden">
      {/* Cinematic Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-20 pointer-events-none bg-[radial-gradient(#ffffff10_1px,transparent_1px)] [background-size:32px_32px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md px-6"
      >
        <div className="flex flex-col items-center mb-10">
          <motion.div 
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            className="w-20 h-20 bg-primary rounded-[28px] shadow-2xl glow-primary flex items-center justify-center mb-6 relative group"
          >
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity rounded-[28px]" />
            <Play size={40} className="text-white fill-current ml-1" />
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="absolute -top-2 -right-2"
            >
              <Sparkles className="text-yellow-400 w-6 h-6" />
            </motion.div>
          </motion.div>
          
          <h1 className="text-4xl font-black tracking-tighter text-white mb-2 uppercase">Auto<span className="text-primary">Reels</span> AI</h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">{t('auth.loginTitle')}</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass p-8 sm:p-10 rounded-[40px] border border-white/10 shadow-3xl relative overflow-hidden group"
        >
          {/* Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">
                <User size={12} className="text-primary" /> {t('auth.username')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white font-medium focus:outline-none focus:border-primary/50 focus:bg-white/[0.08] transition-all placeholder:text-slate-700"
                  placeholder={t('auth.username').toLowerCase()}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">
                <Lock size={12} className="text-primary" /> {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white font-medium focus:outline-none focus:border-primary/50 focus:bg-white/[0.08] transition-all placeholder:text-slate-700"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-[0.2em] text-xs py-5 rounded-2xl shadow-xl glow-primary transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {t('auth.loginBtn')} <ChevronRight size={16} />
                </>
              )}
            </button>
          </div>

          <div className="mt-10 flex items-center justify-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5 w-fit mx-auto">
            <Shield size={12} className="text-green-500" />
            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Enterprise Security Active</span>
          </div>
        </form>

        <p className="mt-8 text-center text-[10px] font-black uppercase text-slate-700 tracking-widest">
          v1.0.4 <span className="mx-2 text-slate-800">|</span> <span className="text-slate-600">Built for Creators</span>
        </p>
      </motion.div>
    </div>
  );
};

interface ChangePasswordViewProps {
  onChangePassword: (p: string) => void;
  loading: boolean;
}

export const ChangePasswordView: React.FC<ChangePasswordViewProps> = ({ onChangePassword, loading }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { t } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t('vi') === 'vi' ? 'Mật khẩu xác nhận không khớp!' : 'Passwords do not match!');
      return;
    }
    onChangePassword(newPassword);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617] overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-primary/10 blur-[150px] rounded-full"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md px-6"
      >
        <form
          onSubmit={handleSubmit}
          className="glass p-8 sm:p-10 rounded-[40px] border border-white/10 shadow-3xl relative overflow-hidden"
        >
          <div className="bg-primary/10 text-primary border border-primary/20 px-5 py-4 rounded-3xl mb-10 text-[11px] font-bold flex gap-4 leading-relaxed">
            <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{t('vi') === 'vi' ? 'Đây là lần đăng nhập đầu tiên. Bạn cần thay đổi mật khẩu để kích hoạt hệ thống.' : 'First login. You need to change your password to activate the system.'}</p>
          </div>

          <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-8">
            {t('auth.changePassword')}
          </h1>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">{t('auth.newPassword')}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white font-medium focus:outline-none focus:border-primary/50 transition-all placeholder:text-slate-700"
                placeholder={t('vi') === 'vi' ? 'Ít nhất 6 ký tự' : 'At least 6 characters'}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">{t('auth.confirmPassword') || 'Confirm Password'}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white font-medium focus:outline-none focus:border-primary/50 transition-all placeholder:text-slate-700"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-[0.2em] text-xs py-5 rounded-2xl shadow-xl glow-primary transition-all disabled:opacity-50 mt-4 active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
              ) : (
                t('vi') === 'vi' ? 'Cập Nhật & Tiếp Tục' : 'Update & Continue'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
