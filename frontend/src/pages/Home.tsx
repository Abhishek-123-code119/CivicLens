import { Link } from 'react-router-dom';
import { ShieldCheck, Zap, Activity, LayoutDashboard, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { isAdmin } = useAuth();

  return (
    <div className="container" style={{ padding: '80px 32px', textAlign: 'center' }}>
      <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '4rem', background: 'linear-gradient(to right, #a5b4fc, #fca5a5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '24px' }}>
          AI-Powered Urban Infrastructure Management
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '48px', lineHeight: 1.8 }}>
          CivicLens empowers citizens and municipal authorities to report, analyze, and resolve infrastructural damages using state-of-the-art computer vision and spatial clustering.
        </p>
        
        <div className="flex-center" style={{ gap: '24px', marginBottom: '80px' }}>
          {isAdmin ? (
            <Link to="/dashboard" className="btn-primary flex-center" style={{ padding: '16px 32px', fontSize: '1.1rem', gap: '8px' }}>
              <LayoutDashboard size={20} />
              Open Admin Dashboard
            </Link>
          ) : (
            <>
              <Link to="/report" className="btn-primary flex-center" style={{ padding: '16px 32px', fontSize: '1.1rem', gap: '8px' }}>
                <Camera size={20} />
                Report an Issue Now
              </Link>
              <Link to="/dashboard" className="btn-secondary flex-center" style={{ padding: '16px 32px', fontSize: '1.1rem', gap: '8px' }}>
                <LayoutDashboard size={20} />
                View Dashboard
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="grid-cols-3">
        {[
          { icon: <ShieldCheck size={32} color="#a5b4fc" />, title: "Photo Evidence Reporting", desc: "Upload photos of potholes, cracks, and road damage for instant municipal routing and tracking." },
          { icon: <Zap size={32} color="#fca5a5" />, title: "Real-time Processing", desc: "Incidents are processed immediately and classified by severity to help authorities prioritize critical repairs." },
          { icon: <Activity size={32} color="#86efac" />, title: "Spatial Clustering", desc: "Multiple reports of the same issue are automatically grouped together based on geographic coordinates to avoid duplicates." }
        ].map((feature, idx) => (
          <div key={idx} className="glass-panel animate-fade-in" style={{ animationDelay: `${idx * 0.1}s` }}>
            <div style={{ marginBottom: '16px' }}>{feature.icon}</div>
            <h3 style={{ marginBottom: '12px', fontSize: '1.3rem' }}>{feature.title}</h3>
            <p style={{ color: 'var(--text-muted)' }}>{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
