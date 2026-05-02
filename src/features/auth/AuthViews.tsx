import React, { useState } from 'react';
import toast from 'react-hot-toast';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background overflow-hidden">
      {/* Dynamic Background elements */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-accent/20 rounded-full blur-[120px] animate-pulse" />

      <form
        onSubmit={handleSubmit}
        className="glass w-full max-w-md p-10 rounded-3xl border border-white/10 shadow-2xl relative z-10"
      >
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl glow-primary flex items-center justify-center rotate-3 scale-110">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center mb-2">AutoReels AI</h1>
        <p className="text-muted text-center mb-10">{t('auth.loginTitle')}</p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-muted mb-2 ml-1">{t('auth.username')}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-primary/50 transition-colors"
              placeholder={t('auth.username').toLowerCase()}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-2 ml-1">{t('auth.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-primary/50 transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-2xl shadow-lg glow-primary transition-all disabled:opacity-50 mt-4"
          >
            {loading ? t('common.loading') : t('auth.loginBtn')}
          </button>
        </div>

        <div className="mt-8 text-center text-xs text-muted/50 font-mono italic">
          v1.0.4 - Protected by Antigravity AI
        </div>
      </form>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background overflow-hidden">
      <div className="absolute inset-0 bg-primary/5 blur-[100px]" />

      <form
        onSubmit={handleSubmit}
        className="glass w-full max-w-md p-10 rounded-3xl border border-white/10 shadow-2xl relative z-10"
      >
        <div className="bg-primary/10 text-primary border border-primary/20 px-4 py-3 rounded-2xl mb-8 text-sm flex gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <p>{t('vi') === 'vi' ? 'Đây là lần đăng nhập đầu tiên. Bạn cần thay đổi mật khẩu để kích hoạt hệ thống.' : 'First login. You need to change your password to activate the system.'}</p>
        </div>

        <h1 className="text-2xl font-bold mb-8">{t('auth.changePassword')}</h1>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-muted mb-2 ml-1">{t('auth.newPassword')}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-primary/50"
              placeholder={t('vi') === 'vi' ? 'Ít nhất 6 ký tự' : 'At least 6 characters'}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-2 ml-1">{t('auth.confirmPassword') || 'Confirm Password'}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-primary/50"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-2xl shadow-lg glow-primary transition-all disabled:opacity-50 mt-4"
          >
            {loading ? t('common.loading') : (t('vi') === 'vi' ? 'Cập Nhật & Tiếp Tục' : 'Update & Continue')}
          </button>
        </div>
      </form>
    </div>
  );
};
