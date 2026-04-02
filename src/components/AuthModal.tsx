import React, { useState } from 'react';
import { Mail, Lock, X, KeyRound, ShieldCheck, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      if (showOtpInput) {
        // Verify OTP code
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: 'magiclink',
        });
        
        if (verifyError) throw verifyError;
        
        setMessage('התחברת בהצלחה!');
        setTimeout(() => onClose(), 1500);
      } else if (isLogin) {
        // Regular Login
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (signInError) throw signInError;
        
        setMessage('התחברת בהצלחה!');
        setTimeout(() => onClose(), 1500);
      } else {
        // Sign Up
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          }
        });
        
        if (signUpError) throw signUpError;
        
        setMessage('נשלח מייל אימות. אנא בדוק את תיבת הדואר שלך ולחץ על הקישור.');
      }
    } catch (err: any) {
      setError(err.message || 'אירעה שגיאה. ודא שהגדרת את Supabase ב-.env');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError('אנא הזן כתובת אימייל לשליחת קוד התחברות');
      return;
    }
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true, // Allows new users to sign up via magic link
          emailRedirectTo: window.location.origin,
        }
      });
      
      if (magicLinkError) throw magicLinkError;
      
      setMessage('קוד התחברות נשלח למייל שלך! הזן אותו למטה.');
      setShowOtpInput(true);
    } catch (err: any) {
      setError(err.message || 'אירעה שגיאה בשליחת הקוד. ודא שהגדרת את Supabase ב-.env');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 left-4 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center mb-6 mx-auto">
            <ShieldCheck className="w-6 h-6 text-orange-500" />
          </div>
          
          <h2 className="text-2xl font-bold text-center text-white mb-2">
            {showOtpInput ? 'הזן קוד אימות' : (isLogin ? 'התחברות למערכת' : 'הרשמה למערכת')}
          </h2>
          <p className="text-center text-zinc-400 text-sm mb-8">
            {showOtpInput ? 'הזן את הקוד שנשלח לכתובת המייל שלך' : (isLogin ? 'הזן את פרטיך כדי להמשיך' : 'צור חשבון חדש כדי לשמור את הפרויקטים שלך')}
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-6 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {message && (
            <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-3 rounded-lg text-sm mb-6 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{message}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!showOtpInput && (
              <>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">אימייל</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 px-4 pr-10 text-white focus:outline-none focus:border-orange-500 transition-colors"
                      placeholder="name@example.com"
                      required
                      dir="ltr"
                    />
                    <Mail className="w-4 h-4 text-zinc-500 absolute top-1/2 -translate-y-1/2 right-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">סיסמה</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 px-4 pr-10 text-white focus:outline-none focus:border-orange-500 transition-colors"
                      placeholder="••••••••"
                      required
                      minLength={6}
                      dir="ltr"
                    />
                    <Lock className="w-4 h-4 text-zinc-500 absolute top-1/2 -translate-y-1/2 right-3" />
                  </div>
                </div>
              </>
            )}

            {showOtpInput && (
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">קוד אימות (6 ספרות)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 px-4 pr-10 text-white focus:outline-none focus:border-orange-500 transition-colors tracking-[0.5em] text-center font-mono text-lg"
                    placeholder="123456"
                    required
                    maxLength={6}
                    dir="ltr"
                  />
                  <KeyRound className="w-4 h-4 text-zinc-500 absolute top-1/2 -translate-y-1/2 right-3" />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? 'טוען...' : (showOtpInput ? 'אמת קוד' : (isLogin ? 'התחבר' : 'הרשם'))}
            </button>
          </form>

          {!showOtpInput && (
            <>
              <div className="mt-6 relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-zinc-900 text-zinc-500">או</span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={handleMagicLink}
                  disabled={isLoading}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 border border-zinc-700 disabled:opacity-50"
                >
                  <KeyRound className="w-4 h-4" />
                  שלח קוד התחברות למייל (ללא סיסמה)
                </button>
              </div>

              <p className="text-center text-zinc-500 text-sm mt-8">
                {isLogin ? 'אין לך חשבון? ' : 'כבר יש לך חשבון? '}
                <button 
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                    setMessage('');
                  }}
                  className="text-orange-500 hover:text-orange-400 font-medium"
                >
                  {isLogin ? 'הרשם עכשיו' : 'התחבר'}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
