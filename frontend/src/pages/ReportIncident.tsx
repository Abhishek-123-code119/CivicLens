import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import {
  Camera,
  MapPin,
  Loader2,
  ShieldAlert,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Sparkles,
  RefreshCw,
  Trash2,
  ArrowRight
} from 'lucide-react';
import { reportIncident, verifyIncidentImage } from '../services/api';
import type { ImageVerificationResult } from '../services/api';
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [verification, setVerification] = useState<ImageVerificationResult | null>(null);

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

  const handleImageSelect = async (file: File) => {
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setSubmitError('');
    await runImageVerification(file, formData.category);
  };

  const runImageVerification = async (file: File, category: string) => {
    setIsAnalyzing(true);
    try {
      const res = await verifyIncidentImage(category, file);
      setVerification(res);
    } catch (err: unknown) {
      const errResponse = err as { response?: { data?: { detail?: string } } };
      setVerification({
        is_valid: false,
        category,
        detected_type: 'Verification Failed',
        confidence: 0,
        ai_severity: null,
        reason: errResponse?.response?.data?.detail || 'Failed to verify image with AI.',
        suggested_category: null
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCategoryChange = async (newCategory: string) => {
    setFormData({ ...formData, category: newCategory });
    if (image) {
      await runImageVerification(image, newCategory);
    }
  };

  const handleSwitchCategory = async (suggestedCat: string) => {
    setFormData({ ...formData, category: suggestedCat });
    if (image) {
      await runImageVerification(image, suggestedCat);
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    setVerification(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) return;

    // Enforce Image Recognition: Don't submit if image is rejected
    if (image && verification && !verification.is_valid) {
      setSubmitError(verification.reason || 'The uploaded image is not related to the selected problem category. Please upload a valid photo.');
      return;
    }
    
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

  const isSubmitDisabled = loading || isAnalyzing || (image !== null && verification !== null && !verification.is_valid);

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '640px', paddingBottom: '60px' }}>
      <h2 style={{ marginBottom: '8px', textAlign: 'center' }}>Report New Incident</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '28px', fontSize: '0.95rem' }}>
        Submit verified infrastructural issues directly to municipal authorities.
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
              <strong>Submission Blocked:</strong>
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
              onChange={(e) => handleCategoryChange(e.target.value)}
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

          {/* Photo Evidence with AI Recognition Verification */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ margin: 0 }}>
                Photo Evidence
              </label>
              <span style={{ fontSize: '0.75rem', color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={13} /> AI Image Recognition Active
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
                    AI verifies the photo matches the selected problem category
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

                {/* AI Recognition Live Feedback Bar */}
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', padding: '14px' }}>
                  {isAnalyzing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#93c5fd', fontSize: '0.85rem' }}>
                      <Loader2 size={18} className="animate-spin" />
                      <span><strong>AI Vision Analyzing:</strong> Inspecting photo for {formData.category.toLowerCase().replace('_', ' ')} characteristics...</span>
                    </div>
                  ) : verification ? (
                    verification.is_valid ? (
                      /* VALID IMAGE BADGE */
                      <div 
                        style={{ 
                          background: 'rgba(34, 197, 94, 0.12)', 
                          border: '1px solid rgba(34, 197, 94, 0.35)', 
                          borderRadius: '8px', 
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                        }}
                      >
                        <CheckCircle2 size={18} color="#86efac" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ fontSize: '0.85rem' }}>
                          <div style={{ color: '#86efac', fontWeight: 600 }}>
                            AI Verification Passed: {verification.detected_type}
                          </div>
                          <div style={{ color: '#dcfce7', marginTop: '2px', fontSize: '0.8rem' }}>
                            {verification.reason}
                          </div>
                          {verification.ai_severity && (
                            <div style={{ marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span 
                                style={{ 
                                  background: 'rgba(34, 197, 94, 0.25)', 
                                  color: '#bbf7d0', 
                                  padding: '2px 8px', 
                                  borderRadius: '12px', 
                                  fontSize: '0.75rem', 
                                  fontWeight: 600 
                                }}
                              >
                                AI Severity: {verification.ai_severity}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: '#86efac' }}>
                                Confidence: {Math.round(verification.confidence * 100)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* REJECTED IMAGE ALERT */
                      <div 
                        style={{ 
                          background: 'rgba(239, 68, 68, 0.15)', 
                          border: '1px solid rgba(239, 68, 68, 0.45)', 
                          borderRadius: '8px', 
                          padding: '12px 14px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <XCircle size={18} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <div style={{ fontSize: '0.85rem', flex: 1 }}>
                            <div style={{ color: '#fca5a5', fontWeight: 600 }}>
                              Image Rejected: Unrelated Photo ({verification.detected_type})
                            </div>
                            <div style={{ color: '#fecaca', marginTop: '4px', lineHeight: 1.4 }}>
                              {verification.reason}
                            </div>

                            {/* Category Switch Quick Action if AI recognized a different problem */}
                            {verification.suggested_category && (
                              <div style={{ marginTop: '10px' }}>
                                <button 
                                  type="button" 
                                  onClick={() => handleSwitchCategory(verification.suggested_category!)}
                                  className="btn-primary flex-center"
                                  style={{ 
                                    padding: '6px 12px', 
                                    fontSize: '0.78rem', 
                                    gap: '6px',
                                    background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
                                  }}
                                >
                                  <ArrowRight size={14} />
                                  Switch category to &quot;{verification.suggested_category}&quot; & re-verify
                                </button>
                              </div>
                            )}

                            <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#f87171', fontWeight: 500 }}>
                              ⚠ You must upload a photo depicting the actual infrastructure defect to submit this report.
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  ) : null}
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
            ) : isAnalyzing ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Verifying Image with AI...
              </>
            ) : image && verification && !verification.is_valid ? (
              "Cannot Submit: Image Rejected by AI"
            ) : (
              "Submit Verified Report"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
