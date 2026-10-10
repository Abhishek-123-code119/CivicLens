import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, UserCheck, Lock, Mail, User, AlertCircle, ArrowRight } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();

  // Tab: 'citizen' | 'admin'
  const [activeTab, setActiveTab] = useState<'citizen' | 'admin'>('citizen');
  // Citizen mode: 'login' | 'register'
  const [isRegistering, setIsRegistering] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectPath = (location.state as { from?: string })?.from || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (isRegistering && activeTab === 'citizen' && !fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    setLoading(true);
    try {
      if (activeTab === 'citizen' && isRegistering) {
        await register(email, password, fullName);
      } else {
        await login(email, password);
      }
      navigate(redirectPath, { replace: true });
    } catch (err: unknown) {
      const errResponse = err as { response?: { data?: { detail?: string } } };
      const msg = errResponse?.response?.data?.detail || 'Authentication failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: 'citizen' | 'admin') => {
    setActiveTab(tab);
    setError('');
    setEmail('');
    setPassword('');
    setFullName('');
    setIsRegistering(false);
  };

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '520px', padding: '60px 20px' }}>
      <div className="glass-panel" style={{ padding: '36px 32px' }}>
        {/* Header Icon & Title */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background:
                activeTab === 'admin'
                  ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(168, 85, 247, 0.2))'
                  : 'linear-gradient(135deg, rgba(79, 70, 229, 0.2), rgba(59, 130, 246, 0.2))',
              border: `1px solid ${activeTab === 'admin' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(99, 102, 241, 0.4)'}`,
            }}
          >
            {activeTab === 'admin' ? (
              <ShieldCheck size={32} color="#f87171" />
            ) : (
              <UserCheck size={32} color="#818cf8" />
            )}
          </div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>
            {activeTab === 'admin'
              ? 'Administrator Portal'
              : isRegistering
              ? 'Create Citizen Account'
              : 'Citizen Sign In'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            {activeTab === 'admin'
              ? 'Authorized municipal personnel & oversight staff'
              : isRegistering
              ? 'Join CivicLens to report and track municipal issues'
              : 'Access your reported issues and community updates'}
          </p>
        </div>

        {/* Tab Selection */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '10px',
            padding: '4px',
            marginBottom: '28px',
            border: '1px solid var(--glass-border)',
          }}
        >
          <button
            type="button"
            onClick={() => handleTabChange('citizen')}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === 'citizen' ? 'var(--primary-color)' : 'transparent',
              color: activeTab === 'citizen' ? '#fff' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <UserCheck size={16} />
            General User
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('admin')}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === 'admin' ? 'linear-gradient(135deg, #dc2626, #9333ea)' : 'transparent',
              color: activeTab === 'admin' ? '#fff' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <ShieldCheck size={16} />
            Administrator
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '0.9rem',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {activeTab === 'citizen' && isRegistering && (
            <div className="form-group">
              <label className="form-label" htmlFor="fullName">
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <User size={18} />
                </span>
                <input
                  id="fullName"
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '40px' }}
                  placeholder="e.g. Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              >
                <Mail size={18} />
              </span>
              <input
                id="email"
                type="email"
                className="form-input"
                style={{ paddingLeft: '40px' }}
                placeholder={activeTab === 'admin' ? 'admin@organization.gov' : 'you@example.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              >
                <Lock size={18} />
              </span>
              <input
                id="password"
                type="password"
                className="form-input"
                style={{ paddingLeft: '40px' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '14px',
              background:
                activeTab === 'admin'
                  ? 'linear-gradient(135deg, #ef4444, #7c3aed)'
                  : 'var(--primary-color)',
            }}
            disabled={loading}
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>
                  {activeTab === 'admin'
                    ? 'Authenticate Admin'
                    : isRegistering
                    ? 'Complete Registration'
                    : 'Sign In'}
                </span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Citizen Toggle between Sign In / Register */}
        {activeTab === 'citizen' && (
          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem' }}>
            {isRegistering ? (
              <span style={{ color: 'var(--text-muted)' }}>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(false);
                    setError('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#a5b4fc',
                    cursor: 'pointer',
                    fontWeight: 600,
                    textDecoration: 'underline',
                  }}
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(true);
                    setError('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#a5b4fc',
                    cursor: 'pointer',
                    fontWeight: 600,
                    textDecoration: 'underline',
                  }}
                >
                  Create one now
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
