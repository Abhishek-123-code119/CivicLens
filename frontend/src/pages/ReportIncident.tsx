import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { Camera, MapPin, Loader2, ShieldAlert, AlertCircle, ArrowLeft } from 'lucide-react';
import { reportIncident } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ReportIncident() {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'POTHOLE',
    latitude: '',
    longitude: ''
  });
  const [image, setImage] = useState<File | null>(null);

  // If loading auth state, show a subtle loading spinner
  if (isLoading) {
    return (
      <div className="flex-center" style={{ minHeight: '60vh' }}>
        <Loader2 className="animate-spin" size={32} color="var(--primary-color)" />
      </div>
    );
  }

  // Without signing in, redirect to login page
  if (!user) {
    return <Navigate to="/login" state={{ from: '/report' }} replace />;
  }

  // Admins are not permitted to report incidents
  if (isAdmin) {
    return (
      <div className="container animate-fade-in" style={{ maxWidth: '600px', padding: '60px 20px', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '40px 32px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              margin: '0 auto 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
            }}
          >
            <ShieldAlert size={32} color="#f87171" />
          </div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '12px' }}>Admin Restriction</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '28px' }}>
            Administrators are not permitted to report incidents. Incident reporting is strictly reserved for general citizens. As an administrator, you can review and manage existing incident statuses on the dashboard.
          </p>
          <Link to="/dashboard" className="btn-primary flex-center" style={{ display: 'inline-flex', gap: '8px' }}>
            <ArrowLeft size={18} />
            Return to Admin Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const handleLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString()
          });
        },
        () => {
          alert("Could not get location. Please allow location access.");
        }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) return;
    
    setLoading(true);
    setSubmitError('');

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('category', formData.category);
      if (formData.latitude && formData.longitude) {
        data.append('latitude', formData.latitude);
        data.append('longitude', formData.longitude);
      }
      if (image) {
        data.append('file', image);
      }

      await reportIncident(data);
      navigate('/dashboard');
    } catch (err: unknown) {
      const errResponse = err as { response?: { data?: { detail?: string } } };
      setSubmitError(errResponse?.response?.data?.detail || 'Failed to submit report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '600px' }}>
      <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>Report New Incident</h2>
      
      <div className="glass-panel">
        {submitError && (
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
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input 
              type="text" 
              className="form-input" 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="E.g. Large pothole on Main St"
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea 
              className="form-input" 
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describe the issue in detail..."
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <select 
              className="form-input" 
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
            >
              <option value="POTHOLE">Pothole</option>
              <option value="CRACK">Road Crack</option>
              <option value="WATER_LOGGING">Water Logging</option>
              <option value="GARBAGE">Garbage Dump</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Photo Evidence</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <label className="btn-secondary flex-center" style={{ gap: '8px', cursor: 'pointer', flex: 1 }}>
                <Camera size={18} />
                {image ? image.name : "Upload Photo"}
                <input 
                  type="file" 
                  accept="image/*" 
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setImage(e.target.files[0]);
                    }
                  }}
                />
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Location</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input 
                type="text" 
                className="form-input" 
                value={formData.latitude ? `${formData.latitude}, ${formData.longitude}` : ''}
                readOnly
                placeholder="GPS Coordinates"
                style={{ flex: 1 }}
              />
              <button type="button" onClick={handleLocation} className="btn-secondary flex-center" style={{ gap: '8px', padding: '12px' }}>
                <MapPin size={18} />
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary flex-center" style={{ width: '100%', marginTop: '32px', gap: '8px' }} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : "Submit Report"}
          </button>
        </form>
      </div>
    </div>
  );
}
