import { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { fetchIncidents, fetchIncidentStats } from '../services/api';
import type { Incident, IncidentStats } from '../services/api';
import IncidentCard from '../components/IncidentCard';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Filter,
  CheckCircle2,
  AlertOctagon,
  Clock,
  ClipboardList,
  Loader2,
  RefreshCw,
  UserCheck
} from 'lucide-react';

export default function Dashboard() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<IncidentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [incidentData, statsData] = await Promise.all([
        fetchIncidents(),
        fetchIncidentStats(),
      ]);
      setIncidents(incidentData);
      setStats(statsData);
    } catch (err) {
      setError('Failed to load incidents. Please verify that your backend server is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  // 1. Redirect to Login if unauthenticated
  if (authLoading) {
    return (
      <div className="flex-center" style={{ minHeight: '60vh' }}>
        <Loader2 className="animate-spin" size={36} color="var(--primary-color)" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: '/dashboard' }} replace />;
  }

  const handleStatusUpdated = (incidentId: number, newStatus: string) => {
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === incidentId ? { ...inc, status: newStatus } : inc))
    );
    // Refresh stats when admin changes status
    fetchIncidentStats()
      .then((updatedStats) => setStats(updatedStats))
      .catch((err) => console.error('Failed to update stats', err));
  };

  const filteredIncidents =
    selectedStatus === 'ALL'
      ? incidents
      : incidents.filter((inc) => inc.status.toUpperCase() === selectedStatus);

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '60px' }}>
      {/* Admin Mode Badge */}
      {isAdmin ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.15), rgba(147, 51, 234, 0.15))',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '12px',
            padding: '12px 20px',
            marginBottom: '28px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={22} color="#f87171" />
            <span style={{ fontSize: '0.95rem', color: '#fecaca', fontWeight: 500 }}>
              <strong>Admin Oversight Active:</strong> Viewing all civic reports across all citizens. You can directly update the status of each incident.
            </span>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(79, 70, 229, 0.15), rgba(59, 130, 246, 0.15))',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '12px',
            padding: '12px 20px',
            marginBottom: '28px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserCheck size={20} color="#a5b4fc" />
            <span style={{ fontSize: '0.92rem', color: '#e0e7ff', fontWeight: 500 }}>
              <strong>Citizen View:</strong> Displaying only incidents submitted by your account (<strong>{user.email}</strong>).
            </span>
          </div>
        </div>
      )}

      {/* KPI Statistics Section */}
      <div style={{ marginBottom: '36px' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Incident Performance Metrics</span>
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '20px',
          }}
        >
          {/* Card 1: Total Reported */}
          <div
            className="glass-panel"
            style={{
              padding: '20px',
              borderLeft: '4px solid #6366f1',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Reported
              </span>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.2)' }}>
                <ClipboardList size={20} color="#a5b4fc" />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
              {stats ? stats.total_reported : '—'}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>
              {isAdmin ? 'Total civic complaints in system' : 'Complaints submitted by you'}
            </p>
          </div>

          {/* Card 2: Complaints Solved */}
          <div
            className="glass-panel"
            style={{
              padding: '20px',
              borderLeft: '4px solid #22c55e',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Solved & Resolved
              </span>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.2)' }}>
                <CheckCircle2 size={20} color="#86efac" />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#86efac', marginBottom: '4px' }}>
              {stats ? stats.total_resolved : '—'}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>
              {stats && stats.total_reported > 0
                ? `${Math.round((stats.total_resolved / stats.total_reported) * 100)}% resolution success rate`
                : 'Verified and repaired'}
            </p>
          </div>

          {/* Card 3: Turned Out To Be Fake */}
          <div
            className="glass-panel"
            style={{
              padding: '20px',
              borderLeft: '4px solid #ef4444',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Turned Out Fake
              </span>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.2)' }}>
                <AlertOctagon size={20} color="#fca5a5" />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#fca5a5', marginBottom: '4px' }}>
              {stats ? stats.total_fake : '—'}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>
              Flagged as fraudulent or rejected
            </p>
          </div>

          {/* Card 4: Avg Resolution Time */}
          <div
            className="glass-panel"
            style={{
              padding: '20px',
              borderLeft: '4px solid #38bdf8',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Avg Resolution Time
              </span>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.2)' }}>
                <Clock size={20} color="#7dd3fc" />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#7dd3fc', marginBottom: '4px' }}>
              {stats ? stats.avg_resolution_formatted : '—'}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>
              Time taken on average to resolve
            </p>
          </div>
        </div>
      </div>

      {/* Incidents Header & Filter Toolbar */}
      <div className="flex-between" style={{ marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.75rem' }}>
            {isAdmin ? 'All Municipal Reports' : 'My Reported Incidents'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '4px 0 0' }}>
            {isAdmin
              ? `Tracking ${incidents.length} total infrastructural issues reported across the city`
              : `You have submitted ${incidents.length} incident reports`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} color="var(--text-muted)" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="form-input"
              style={{
                padding: '8px 12px',
                fontSize: '0.85rem',
                width: 'auto',
                minWidth: '160px',
              }}
            >
              <option value="ALL" style={{ background: '#1e1b4b' }}>
                All Statuses ({incidents.length})
              </option>
              <option value="REPORTED" style={{ background: '#1e1b4b' }}>Reported</option>
              <option value="VERIFIED" style={{ background: '#1e1b4b' }}>Verified</option>
              <option value="ASSIGNED" style={{ background: '#1e1b4b' }}>Assigned</option>
              <option value="IN_PROGRESS" style={{ background: '#1e1b4b' }}>In Progress</option>
              <option value="RESOLVED" style={{ background: '#1e1b4b' }}>Resolved</option>
              <option value="REJECTED" style={{ background: '#1e1b4b' }}>Rejected (Fake)</option>
            </select>
          </div>
          <button className="btn-secondary flex-center" style={{ gap: '6px' }} onClick={loadData}>
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div
          className="glass-panel"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            borderColor: 'rgba(239, 68, 68, 0.5)',
            marginBottom: '24px',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex-center" style={{ padding: '64px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid rgba(255,255,255,0.1)',
              borderTopColor: 'var(--primary-color)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div className="grid-cols-3">
          {filteredIncidents.length === 0 ? (
            <div
              className="glass-panel"
              style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '56px 24px' }}
            >
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '12px' }}>
                {selectedStatus === 'ALL'
                  ? isAdmin
                    ? 'No incidents have been reported yet.'
                    : "You haven't reported any incidents yet."
                  : `No incidents matching status "${selectedStatus}".`}
              </p>
              {!isAdmin && (
                <a href="/report" className="btn-primary" style={{ display: 'inline-block', marginTop: '8px' }}>
                  Report an Incident Now
                </a>
              )}
            </div>
          ) : (
            filteredIncidents.map((incident) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                onStatusUpdated={handleStatusUpdated}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
