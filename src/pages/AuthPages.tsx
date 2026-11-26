import React, { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Mail, ShieldCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PublicNavbar } from '../components/PublicNavbar';
import {
  companyRegistrationSchema,
  studentRegistrationSchema,
} from '../schemas/validation';

function roleHome(role?: string): string {
  if (role === 'admin') return '/admin';
  if (role === 'company') return '/recruiter';
  return '/student';
}

function mapAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('auth/operation-not-allowed')) {
    return 'Email/Password sign-in is not yet enabled in Firebase Console. Use "Continue with Google" right now, or enable Email/Password under Firebase Console → Authentication → Sign-in method.';
  }
  if (
    msg.includes('auth/invalid-credential') ||
    msg.includes('auth/wrong-password') ||
    msg.includes('auth/user-not-found')
  ) {
    return 'Invalid email address or password. Please verify your credentials.';
  }
  if (msg.includes('auth/email-already-in-use')) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (msg.includes('auth/popup-closed-by-user')) {
    return 'Sign-in popup was closed before completion.';
  }
  return msg;
}

const inputCls =
  'w-full px-3.5 py-2.5 text-sm border border-[var(--border-color)] rounded-[10px] bg-[var(--bg-secondary)] text-[var(--text-primary)]';

export const LoginPage: React.FC = () => {
  const { signInWithGoogle, loginWithEmail, sendResetEmail, userRecord } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState('');

  if (userRecord) {
    return <Navigate to={roleHome(userRecord.role)} replace />;
  }

  const handleGoogle = async () => {
    setBusy(true);
    setErrorText('');
    try {
      const record = await signInWithGoogle();
      if (record) {
        toast.success(`Welcome back, ${record.fullName}`);
        navigate(roleHome(record.role));
      } else {
        navigate('/onboarding');
      }
    } catch (err) {
      setErrorText(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorText('');
    try {
      if (resetMode) {
        if (!email.trim()) {
          setErrorText('Enter your account email to receive a reset link.');
          return;
        }
        await sendResetEmail(email);
        toast.success('Password reset instructions sent if this account exists.');
        setResetMode(false);
        return;
      }
      const record = await loginWithEmail(email, password);
      if (record) {
        toast.success(`Signed in as ${record.fullName}`);
        navigate(roleHome(record.role));
      } else {
        navigate('/onboarding');
      }
    } catch (err) {
      setErrorText(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col">
      <PublicNavbar />
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full mono-card p-7 sm:p-8 udaan-fade-in">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              {resetMode ? 'Reset your password' : 'Sign in to Udaan'}
            </h1>
            <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
              {resetMode
                ? 'Enter your registered email to receive a password reset link.'
                : 'Access your student, recruiter, or university placement workspace.'}
            </p>
          </div>

          {!resetMode && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={handleGoogle}
                className="w-full py-2.5 px-4 mono-btn-secondary text-sm font-semibold flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                <span className="w-5 h-5 rounded-full bg-[var(--action-bg)] text-[var(--action-text)] text-xs font-bold flex items-center justify-center">
                  G
                </span>
                Continue with Google
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--border-color)]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[var(--bg-card)] px-3 text-[var(--text-muted)]">
                    or sign in with email
                  </span>
                </div>
              </div>
            </>
          )}

          {errorText && (
            <div className="mb-4 p-3 rounded-[10px] bg-[var(--bg-elevated)] border border-[var(--text-primary)] border-dashed text-xs text-[var(--text-primary)] leading-relaxed">
              {errorText}
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
              >
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu"
                className={inputCls}
              />
            </div>

            {!resetMode && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-medium text-[var(--text-secondary)]"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetMode(true);
                      setErrorText('');
                    }}
                    className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputCls}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 px-4 text-sm font-semibold mono-btn-primary disabled:opacity-50"
            >
              {busy ? 'Please wait...' : resetMode ? 'Send Reset Link' : 'Sign In'}
            </button>
          </form>

          {resetMode ? (
            <button
              type="button"
              onClick={() => setResetMode(false)}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Sign In
            </button>
          ) : (
            <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
              New to Udaan?{' '}
              <Link
                to="/register"
                className="font-semibold text-[var(--text-primary)] hover:underline"
              >
                Create an account
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export const RegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'company' ? 'company' : 'student';
  const [role, setRole] = useState<'student' | 'company'>(initialRole);
  const { signInWithGoogle, registerStudentWithEmail, registerCompanyWithEmail } = useAuth();
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState('');

  const [sForm, setSForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    college: '',
    degree: 'B.Tech',
    branch: 'Computer Science',
    semester: 6,
    graduationYear: 2027,
  });

  const [cForm, setCForm] = useState({
    companyName: '',
    officialEmail: '',
    password: '',
    contactPerson: '',
    phone: '',
    website: '',
    industry: '',
    companySize: '51-200 employees',
    headquarters: '',
    description: '',
  });

  const handleGoogleStart = async () => {
    setBusy(true);
    setErrorText('');
    try {
      const record = await signInWithGoogle();
      if (record) {
        navigate(roleHome(record.role));
      } else {
        navigate(`/onboarding?role=${role}`);
      }
    } catch (err) {
      setErrorText(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorText('');
    try {
      if (role === 'student') {
        const parsed = studentRegistrationSchema.safeParse(sForm);
        if (!parsed.success) {
          setErrorText(parsed.error.issues[0]?.message || 'Check all required fields.');
          return;
        }
        if (!sForm.password || sForm.password.length < 8) {
          setErrorText('Password must be at least 8 characters.');
          return;
        }
        await registerStudentWithEmail(sForm.email, sForm.password, parsed.data);
        toast.success('Account created! Please check your email to verify your address.');
        navigate('/onboarding');
      } else {
        const parsed = companyRegistrationSchema.safeParse(cForm);
        if (!parsed.success) {
          setErrorText(parsed.error.issues[0]?.message || 'Check all required fields.');
          return;
        }
        if (!cForm.password || cForm.password.length < 8) {
          setErrorText('Password must be at least 8 characters.');
          return;
        }
        await registerCompanyWithEmail(cForm.officialEmail, cForm.password, parsed.data);
        toast.success('Company account created! Please verify your email address.');
        navigate('/onboarding');
      }
    } catch (err) {
      setErrorText(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col">
      <PublicNavbar />
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="max-w-2xl w-full mono-card p-7 sm:p-9 udaan-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                Create your Udaan account
              </h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Administrator accounts are provisioned strictly by the institution.
              </p>
            </div>
            <div className="inline-flex p-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[10px] self-start">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-[8px] transition-colors ${
                  role === 'student'
                    ? 'bg-[var(--action-bg)] text-[var(--action-text)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setRole('company')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-[8px] transition-colors ${
                  role === 'company'
                    ? 'bg-[var(--action-bg)] text-[var(--action-text)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Company / Recruiter
              </button>
            </div>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={handleGoogleStart}
            className="w-full py-2.5 px-4 mono-btn-secondary text-sm font-semibold flex items-center justify-center gap-2.5"
          >
            <span className="w-5 h-5 rounded-full bg-[var(--action-bg)] text-[var(--action-text)] text-xs font-bold flex items-center justify-center">
              G
            </span>
            Continue with Google as {role === 'student' ? 'Student' : 'Company'} (Recommended)
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border-color)]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[var(--bg-card)] px-3 text-[var(--text-muted)]">
                or register with email & password
              </span>
            </div>
          </div>

          {errorText && (
            <div className="mb-5 p-3.5 rounded-[10px] bg-[var(--bg-elevated)] border border-[var(--text-primary)] border-dashed text-xs text-[var(--text-primary)] leading-relaxed">
              {errorText}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {role === 'student' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Full Name *
                  </label>
                  <input
                    required
                    value={sForm.fullName}
                    onChange={(e) => setSForm({ ...sForm, fullName: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={sForm.email}
                    onChange={(e) => setSForm({ ...sForm, email: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Password (min 8 chars) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={sForm.password}
                    onChange={(e) => setSForm({ ...sForm, password: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Phone
                  </label>
                  <input
                    value={sForm.phone}
                    onChange={(e) => setSForm({ ...sForm, phone: e.target.value })}
                    placeholder="+91 98XXX XXXXX"
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    College / University *
                  </label>
                  <input
                    required
                    value={sForm.college}
                    onChange={(e) => setSForm({ ...sForm, college: e.target.value })}
                    placeholder="Medicaps University, Indore"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Course / Degree *
                  </label>
                  <input
                    required
                    value={sForm.degree}
                    onChange={(e) => setSForm({ ...sForm, degree: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Branch *
                  </label>
                  <input
                    required
                    value={sForm.branch}
                    onChange={(e) => setSForm({ ...sForm, branch: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Current Semester *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={sForm.semester}
                    onChange={(e) => setSForm({ ...sForm, semester: Number(e.target.value) })}
                    className={`${inputCls} font-mono tabular-nums`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Graduation Year *
                  </label>
                  <input
                    type="number"
                    min={2020}
                    max={2035}
                    required
                    value={sForm.graduationYear}
                    onChange={(e) =>
                      setSForm({ ...sForm, graduationYear: Number(e.target.value) })
                    }
                    className={`${inputCls} font-mono tabular-nums`}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Company Name *
                  </label>
                  <input
                    required
                    value={cForm.companyName}
                    onChange={(e) => setCForm({ ...cForm, companyName: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Official Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={cForm.officialEmail}
                    onChange={(e) => setCForm({ ...cForm, officialEmail: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Password (min 8 chars) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={cForm.password}
                    onChange={(e) => setCForm({ ...cForm, password: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Contact Person *
                  </label>
                  <input
                    required
                    value={cForm.contactPerson}
                    onChange={(e) => setCForm({ ...cForm, contactPerson: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Phone
                  </label>
                  <input
                    value={cForm.phone}
                    onChange={(e) => setCForm({ ...cForm, phone: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Website (https://...)
                  </label>
                  <input
                    type="url"
                    value={cForm.website}
                    onChange={(e) => setCForm({ ...cForm, website: e.target.value })}
                    placeholder="https://company.com"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Industry *
                  </label>
                  <input
                    required
                    value={cForm.industry}
                    onChange={(e) => setCForm({ ...cForm, industry: e.target.value })}
                    placeholder="Software, FinTech, Robotics..."
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Headquarters
                  </label>
                  <input
                    value={cForm.headquarters}
                    onChange={(e) => setCForm({ ...cForm, headquarters: e.target.value })}
                    placeholder="Bengaluru, India"
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Company Description *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={cForm.description}
                    onChange={(e) => setCForm({ ...cForm, description: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 px-4 text-sm font-semibold mono-btn-primary disabled:opacity-50"
            >
              {busy
                ? 'Creating Account...'
                : role === 'student'
                ? 'Register Student Account'
                : 'Register Company Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
            Already registered?{' '}
            <Link
              to="/login"
              className="font-semibold text-[var(--text-primary)] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export const OnboardingPage: React.FC = () => {
  const {
    firebaseUser,
    userRecord,
    needsEmailVerification,
    completeStudentOnboarding,
    completeCompanyOnboarding,
    resendVerificationEmail,
    refreshVerificationState,
    logout,
  } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [role, setRole] = useState<'student' | 'company'>(
    searchParams.get('role') === 'company' ? 'company' : 'student'
  );
  const [busy, setBusy] = useState(false);

  const [sForm, setSForm] = useState({
    fullName: firebaseUser?.displayName || '',
    phone: '',
    college: 'Medicaps University, Indore',
    degree: 'B.Tech',
    branch: 'Computer Science',
    semester: 6,
    graduationYear: 2027,
    cgpa: 8.2,
  });

  const [cForm, setCForm] = useState({
    companyName: '',
    contactPerson: firebaseUser?.displayName || '',
    phone: '',
    website: '',
    industry: 'Software Engineering',
    companySize: '51-200 employees',
    headquarters: '',
    description: '',
  });

  if (!firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  if (userRecord) {
    return <Navigate to={roleHome(userRecord.role)} replace />;
  }

  if (needsEmailVerification) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col">
        <PublicNavbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full mono-card p-8 text-center udaan-fade-in">
            <Mail className="w-8 h-8 text-[var(--text-primary)] mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">
              Verify your email address
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
              We sent a verification link to{' '}
              <strong className="text-[var(--text-primary)]">{firebaseUser.email}</strong>. Verify
              your email to unlock secure Firestore access, then click below.
            </p>
            <div className="mt-6 space-y-3">
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const ok = await refreshVerificationState();
                    if (ok) {
                      toast.success('Email verified!');
                    } else {
                      toast.error(
                        'Email is not verified yet. Please click the link in your inbox.'
                      );
                    }
                  } finally {
                    setBusy(false);
                  }
                }}
                className="w-full py-2.5 px-4 text-sm font-semibold mono-btn-primary inline-flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                I&apos;ve Verified — Continue
              </button>
              <button
                type="button"
                onClick={async () => {
                  await resendVerificationEmail();
                  toast.success('Verification email resent.');
                }}
                className="w-full py-2 px-4 text-xs font-medium mono-btn-secondary"
              >
                Resend Verification Email
              </button>
              <button
                type="button"
                onClick={() => void logout()}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Sign out and switch account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (role === 'student') {
        const record = await completeStudentOnboarding(sForm);
        toast.success('Student profile created!');
        navigate(roleHome(record.role));
      } else {
        const record = await completeCompanyOnboarding(cForm);
        toast.success('Company registered! Verification request sent to administrator.');
        navigate(roleHome(record.role));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to complete profile setup.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col">
      <PublicNavbar />
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="max-w-2xl w-full mono-card p-7 sm:p-9 udaan-fade-in">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-medium mb-2">
            <ShieldCheck className="w-4 h-4 text-[var(--text-primary)]" />
            Verified account: {firebaseUser.email}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Complete your Udaan profile
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Select your account type to configure your workspace and Career Passport.
          </p>

          <div className="mt-5 inline-flex p-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[10px]">
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-[8px] transition-colors ${
                role === 'student'
                  ? 'bg-[var(--action-bg)] text-[var(--action-text)]'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              Student Portal
            </button>
            <button
              type="button"
              onClick={() => setRole('company')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-[8px] transition-colors ${
                role === 'company'
                  ? 'bg-[var(--action-bg)] text-[var(--action-text)]'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              Company / Recruiter Portal
            </button>
          </div>

          <form onSubmit={handleComplete} className="mt-6 space-y-4">
            {role === 'student' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Full Name *
                  </label>
                  <input
                    required
                    value={sForm.fullName}
                    onChange={(e) => setSForm({ ...sForm, fullName: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Phone
                  </label>
                  <input
                    value={sForm.phone}
                    onChange={(e) => setSForm({ ...sForm, phone: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    College / University *
                  </label>
                  <input
                    required
                    value={sForm.college}
                    onChange={(e) => setSForm({ ...sForm, college: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Degree *
                  </label>
                  <input
                    required
                    value={sForm.degree}
                    onChange={(e) => setSForm({ ...sForm, degree: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Branch *
                  </label>
                  <input
                    required
                    value={sForm.branch}
                    onChange={(e) => setSForm({ ...sForm, branch: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Semester *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={sForm.semester}
                    onChange={(e) => setSForm({ ...sForm, semester: Number(e.target.value) })}
                    className={`${inputCls} font-mono tabular-nums`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    CGPA (0–10)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    max={10}
                    value={sForm.cgpa}
                    onChange={(e) => setSForm({ ...sForm, cgpa: Number(e.target.value) })}
                    className={`${inputCls} font-mono tabular-nums`}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Company Name *
                  </label>
                  <input
                    required
                    value={cForm.companyName}
                    onChange={(e) => setCForm({ ...cForm, companyName: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Contact Person *
                  </label>
                  <input
                    required
                    value={cForm.contactPerson}
                    onChange={(e) => setCForm({ ...cForm, contactPerson: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Industry *
                  </label>
                  <input
                    required
                    value={cForm.industry}
                    onChange={(e) => setCForm({ ...cForm, industry: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Headquarters
                  </label>
                  <input
                    value={cForm.headquarters}
                    onChange={(e) => setCForm({ ...cForm, headquarters: e.target.value })}
                    placeholder="Bengaluru, India"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    value={cForm.website}
                    onChange={(e) => setCForm({ ...cForm, website: e.target.value })}
                    placeholder="https://company.com"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Phone
                  </label>
                  <input
                    value={cForm.phone}
                    onChange={(e) => setCForm({ ...cForm, phone: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Company Overview *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={cForm.description}
                    onChange={(e) => setCForm({ ...cForm, description: e.target.value })}
                    placeholder="Briefly describe your company and internship engineering culture."
                    className={inputCls}
                  />
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => void logout()}
                className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Cancel & Sign Out
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-6 py-2.5 text-sm font-semibold mono-btn-primary disabled:opacity-50"
              >
                {busy ? 'Setting up workspace...' : 'Complete Setup'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
