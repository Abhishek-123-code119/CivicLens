import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import {
  Camera,
  MapPin,
  Loader2,
  ShieldAlert,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
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
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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

  const handleImageSelect = (file: File) => {
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setSubmitError('');
  };

  const handleRemoveImage = () => {
    setImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
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

  const isSubmitDisabled = loading || !formData.title.trim() || !formData.description.trim();

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '640px', paddingBottom: '60px' }}>
      <h2 style={{ marginBottom: '8px', textAlign: 'center' }}>Report New Incident</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '28px', fontSize: '0.95rem' }}>
        Submit infrastructural issues directly to municipal authorities.
      </p>
      
      <div className="glass-panel" style={{ padding: '32px' }}>
        {submitError && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              padding: '14px 16px',
              borderRadius: '10px',
              marginBottom: '24px',
              fontSize: '0.9rem',
              lineHeight: 1.5,
            }}
          >
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Submission Error:</strong>
              <div style={{ marginTop: '2px' }}>{submitError}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select 
              className="form-input" 
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              style={{ fontWeight: 600 }}
            >
              <option value="POTHOLE" style={{ background: '#1e1b4b' }}>Pothole (Road/Tarmac Cavity)</option>
              <option value="CRACK" style={{ background: '#1e1b4b' }}>Road Crack (Fissure / Structural Fracture)</option>
              <option value="WATER_LOGGING" style={{ background: '#1e1b4b' }}>Water Logging (Puddles / Street Flood)</option>
              <option value="GARBAGE" style={{ background: '#1e1b4b' }}>Garbage Dump (Waste / Litter / Trash)</option>
              <option value="OTHER" style={{ background: '#1e1b4b' }}>Other Civic Infrastructure Issue</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Title</label>
            <input 
              type="text" 
              className="form-input" 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="E.g. Dangerous deep pothole near crossroad"
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea 
              className="form-input" 
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Provide specific details about the issue and any safety hazards..."
              required 
            />
          </div>

          {/* Photo Evidence */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ margin: 0 }}>
                Photo Evidence
              </label>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Optional • JPG, PNG, WEBP
              </span>
            </div>

            {!image ? (
              <label 
                className="btn-secondary flex-center" 
                style={{ 
                  gap: '10px', 
                  cursor: 'pointer', 
                  padding: '24px', 
                  border: '2px dashed rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'rgba(255, 255, 255, 0.02)',
                  transition: 'border-color 0.2s ease',
                }}
              >
                <div style={{ padding: '12px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.2)' }}>
                  <Camera size={24} color="#a5b4fc" />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontWeight: 600, color: '#e0e7ff', display: 'block' }}>
                    Click to Upload Incident Photo
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Add a clear photo to help field workers locate and repair the issue
                  </span>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleImageSelect(e.target.files[0]);
                    }
                  }}
                />
              </label>
            ) : (
              <div 
                style={{ 
                  borderRadius: '12px', 
                  overflow: 'hidden', 
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(0, 0, 0, 0.25)',
                }}
              >
                {/* Image Preview & Header */}
                <div style={{ display: 'flex', gap: '16px', padding: '14px', alignItems: 'center' }}>
                  {imagePreview && (
                    <img 
                      src={imagePreview} 
                      alt="Uploaded Incident" 
                      style={{ 
                        width: '84px', 
                        height: '84px', 
                        objectFit: 'cover', 
                        borderRadius: '8px', 
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        flexShrink: 0,
                      }} 
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {image.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {(image.size / (1024 * 1024)).toFixed(2)} MB • {formData.category}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <label 
                        className="btn-secondary flex-center" 
                        style={{ 
                          padding: '4px 10px', 
                          fontSize: '0.75rem', 
                          cursor: 'pointer', 
                          gap: '4px' 
                        }}
                      >
                        <RefreshCw size={12} /> Replace
                        <input 
                          type="file" 
                          accept="image/*" 
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              handleImageSelect(e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                      <button 
                        type="button" 
                        onClick={handleRemoveImage}
                        className="btn-secondary flex-center" 
                        style={{ 
                          padding: '4px 10px', 
                          fontSize: '0.75rem', 
                          color: '#f87171',
                          borderColor: 'rgba(239, 68, 68, 0.3)',
                          gap: '4px' 
                        }}
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  </div>
                </div>

                <div 
                  style={{ 
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)', 
                    padding: '8px 14px', 
                    fontSize: '0.8rem', 
                    color: '#86efac',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <CheckCircle2 size={14} color="#86efac" />
                  <span>Photo attached successfully</span>
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">GPS Location</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input 
                type="text" 
                className="form-input" 
                value={formData.latitude ? `${formData.latitude}, ${formData.longitude}` : ''}
                readOnly
                placeholder="GPS Coordinates"
                style={{ flex: 1 }}
              />
              <button 
                type="button" 
                onClick={handleLocation} 
                className="btn-secondary flex-center" 
                style={{ gap: '8px', padding: '12px' }}
                title="Detect GPS location"
              >
                <MapPin size={18} />
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary flex-center" 
            style={{ 
              width: '100%', 
              marginTop: '32px', 
              gap: '8px',
              opacity: isSubmitDisabled ? 0.6 : 1,
              cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
            }} 
            disabled={isSubmitDisabled}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Submitting Report...
              </>
            ) : (
              "Submit Incident Report"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
