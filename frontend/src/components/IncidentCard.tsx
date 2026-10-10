import { useState } from 'react';
import { MapPin, Clock, AlertTriangle, ShieldCheck, Check, Loader2 } from 'lucide-react';
import type { Incident } from '../services/api';
import { updateIncidentStatus } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Props {
  incident: Incident;
  onStatusUpdated?: (incidentId: number, newStatus: string) => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  REPORTED: { bg: 'rgba(234, 179, 8, 0.15)', text: '#fde047', border: 'rgba(234, 179, 8, 0.4)' },
  AI_PROCESSING: { bg: 'rgba(168, 85, 247, 0.15)', text: '#d8b4fe', border: 'rgba(168, 85, 247, 0.4)' },
  NEEDS_REVIEW: { bg: 'rgba(249, 115, 22, 0.15)', text: '#fdba74', border: 'rgba(249, 115, 22, 0.4)' },
  VERIFIED: { bg: 'rgba(99, 102, 241, 0.15)', text: '#a5b4fc', border: 'rgba(99, 102, 241, 0.4)' },
  ASSIGNED: { bg: 'rgba(56, 189, 248, 0.15)', text: '#7dd3fc', border: 'rgba(56, 189, 248, 0.4)' },
  IN_PROGRESS: { bg: 'rgba(59, 130, 246, 0.15)', text: '#93c5fd', border: 'rgba(59, 130, 246, 0.4)' },
  RESOLUTION_SUBMITTED: { bg: 'rgba(20, 184, 166, 0.15)', text: '#5eead4', border: 'rgba(20, 184, 166, 0.4)' },
  RESOLVED: { bg: 'rgba(34, 197, 94, 0.15)', text: '#86efac', border: 'rgba(34, 197, 94, 0.4)' },
  REJECTED: { bg: 'rgba(239, 68, 68, 0.15)', text: '#fca5a5', border: 'rgba(239, 68, 68, 0.4)' },
};

const ALL_STATUSES = [
  'REPORTED',
  'VERIFIED',
  'ASSIGNED',
  'IN_PROGRESS',
  'NEEDS_REVIEW',
  'RESOLUTION_SUBMITTED',
  'RESOLVED',
  'REJECTED',
];

export default function IncidentCard({ incident, onStatusUpdated }: Props) {
  const { isAdmin } = useAuth();
  const [currentStatus, setCurrentStatus] = useState<string>(incident.status);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateSuccess, setUpdateSuccess] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string>('');

  const statusStyle = STATUS_COLORS[currentStatus] || {
    bg: 'rgba(148, 163, 184, 0.15)',
    text: '#cbd5e1',
    border: 'rgba(148, 163, 184, 0.4)',
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    if (newStatus === currentStatus) return;

    setIsUpdating(true);
    setUpdateError('');
    setUpdateSuccess(false);

    try {
      await updateIncidentStatus(incident.id, newStatus);
      setCurrentStatus(newStatus);
      setUpdateSuccess(true);
      if (onStatusUpdated) {
        onStatusUpdated(incident.id, newStatus);
      }
      setTimeout(() => setUpdateSuccess(false), 2500);
    } catch (err: unknown) {
      const errResponse = err as { response?: { data?: { detail?: string } } };
      setUpdateError(errResponse?.response?.data?.detail || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      className="glass-panel animate-fade-in"
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'transform 0.2s ease, border-color 0.2s ease',
      }}
    >
      <div>
        <div className="flex-between" style={{ marginBottom: '14px', alignItems: 'center' }}>
          <span
            style={{
              background: 'rgba(79, 70, 229, 0.2)',
              color: '#a5b4fc',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {incident.category}
          </span>
          <span
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Clock size={14} />
            {new Date(incident.created_at).toLocaleDateString()}
          </span>
        </div>

        <h3 style={{ margin: '8px 0 10px', fontSize: '1.25rem', color: '#fff', lineHeight: 1.3 }}>
          {incident.title}
        </h3>
        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.95rem',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            marginBottom: '16px',
          }}
        >
          {incident.description}
        </p>

        {incident.latitude && incident.longitude && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              color: '#94a3b8',
              marginBottom: '16px',
            }}
          >
            <MapPin size={14} color="#f87171" />
            <span>
              {incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)}
            </span>
          </div>
        )}
      </div>

      <div
        style={{
          paddingTop: '16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {isAdmin ? (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#f87171',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <ShieldCheck size={14} />
                Admin Status Control
              </span>
              {isUpdating && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: '#93c5fd',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Loader2 size={12} className="animate-spin" /> Saving...
                </span>
              )}
              {updateSuccess && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: '#86efac',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Check size={12} /> Updated!
                </span>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <select
                value={currentStatus}
                onChange={handleStatusChange}
                disabled={isUpdating}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  backgroundColor: statusStyle.bg,
                  color: statusStyle.text,
                  border: `1px solid ${statusStyle.border}`,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                  outline: 'none',
                  appearance: 'auto',
                }}
              >
                {ALL_STATUSES.map((status) => (
                  <option
                    key={status}
                    value={status}
                    style={{
                      backgroundColor: '#1e1b4b',
                      color: '#ffffff',
                    }}
                  >
                    {status.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            {updateError && (
              <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '4px' }}>
                {updateError}
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status:</span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '16px',
                fontSize: '0.8rem',
                fontWeight: 600,
                backgroundColor: statusStyle.bg,
                color: statusStyle.text,
                border: `1px solid ${statusStyle.border}`,
              }}
            >
              <AlertTriangle size={12} />
              {currentStatus.replace(/_/g, ' ')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
