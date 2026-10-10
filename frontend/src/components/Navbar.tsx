import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Camera, LayoutDashboard, Home, ShieldAlert, LogIn, LogOut, Shield, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();

  const navLinks = [
    { name: 'Home', path: '/', icon: <Home size={18} /> },
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="glass-nav">
      <Link to="/" className="flex-center" style={{ gap: '8px' }}>
        <ShieldAlert size={28} color="#a5b4fc" />
        <h1
          style={{
            margin: 0,
            fontSize: '1.5rem',
            background: 'linear-gradient(to right, #a5b4fc, #e0e7ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          CivicLens
        </h1>
      </Link>

      <div className="flex-center" style={{ gap: '20px' }}>
        {navLinks.map((link) => (
          <Link
            key={link.name}
            to={link.path}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 500,
              color: location.pathname === link.path ? '#fff' : 'var(--text-muted)',
            }}
          >
            {link.icon}
            {link.name}
          </Link>
        ))}

        {/* Admins are not permitted to report incidents - only citizens or guests */}
        {!isAdmin && (
          <Link to="/report" className="btn-primary flex-center" style={{ gap: '8px', padding: '10px 18px', fontSize: '0.9rem' }}>
            <Camera size={18} />
            Report Incident
          </Link>
        )}

        {user ? (
          <div className="flex-center" style={{ gap: '12px' }}>
            {/* User pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '20px',
                background: isAdmin ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                border: `1px solid ${isAdmin ? 'rgba(239, 68, 68, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
              }}
            >
              {isAdmin ? (
                <Shield size={16} color="#f87171" />
              ) : (
                <UserIcon size={16} color="#818cf8" />
              )}
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f3f4f6' }}>
                {user.full_name || user.email.split('@')[0]}
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  background: isAdmin ? '#dc2626' : '#4f46e5',
                  color: '#fff',
                }}
              >
                {isAdmin ? 'Admin' : 'Citizen'}
              </span>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="btn-secondary flex-center"
              title="Sign Out"
              style={{
                padding: '8px 14px',
                fontSize: '0.85rem',
                gap: '6px',
                color: '#f87171',
                borderColor: 'rgba(239, 68, 68, 0.3)',
              }}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="btn-secondary flex-center"
            style={{
              padding: '10px 18px',
              fontSize: '0.9rem',
              gap: '6px',
            }}
          >
            <LogIn size={18} />
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
