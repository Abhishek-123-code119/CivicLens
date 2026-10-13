import axios from 'axios';

const rawApiUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:8000/api/v1';
export const API_BASE_URL = rawApiUrl.replace(/\/+$/, '');
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically inject JWT token from localStorage if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('civiclens_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface User {
  id: number;
  email: string;
  full_name?: string | null;
  role: 'ADMIN' | 'CITIZEN' | 'MUNICIPAL_OFFICER' | 'FIELD_WORKER' | string;
  is_active: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Incident {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  ai_severity?: string | null;
  image_path?: string | null;
  created_at: string;
  updated_at?: string | null;
  user_id?: number | null;
}

export interface ImageVerificationResult {
  is_valid: boolean;
  category: string;
  detected_type: string;
  confidence: number;
  ai_severity: string | null;
  reason: string;
  suggested_category: string | null;
}

export interface IncidentStats {
  total_reported: int_or_number;
  total_resolved: number;
  total_fake: number;
  avg_resolution_hours: number;
  avg_resolution_formatted: string;
}

type int_or_number = number;

export const fetchIncidents = async (): Promise<Incident[]> => {
  const response = await api.get('/incidents/');
  return response.data;
};

export const fetchIncidentStats = async (): Promise<IncidentStats> => {
  const response = await api.get('/incidents/stats');
  return response.data;
};

export const reportIncident = async (formData: FormData): Promise<Incident> => {
  const response = await api.post('/incidents/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const verifyIncidentImage = async (
  category: string,
  file: File
): Promise<ImageVerificationResult> => {
  const formData = new FormData();
  formData.append('category', category);
  formData.append('file', file);
  const response = await api.post('/incidents/verify-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const updateIncidentStatus = async (
  incidentId: number,
  status: string
): Promise<Incident> => {
  const response = await api.patch(`/incidents/${incidentId}/status`, { status });
  return response.data;
};

export const loginApi = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const registerApi = async (
  email: string,
  password: string,
  fullName?: string
): Promise<AuthResponse> => {
  const response = await api.post('/auth/register', {
    email,
    password,
    full_name: fullName,
  });
  return response.data;
};

export const fetchMeApi = async (): Promise<User> => {
  const response = await api.get('/auth/me');
  return response.data;
};
