import { api } from './api'

export interface SignUpData {
  email: string
  password: string
  username?: string
}

export interface LoginData {
  email: string
  password: string
}

// The shape of the response from the server after a successful authentication
interface AuthResponse {
  status: number;   // HTTP status code
  message: string;  // Success message
  token: string;
  id: string; 
  email: string; 
  username: string;
}

export async function signUp(data: SignUpData): Promise<AuthResponse> {
  const { data: user } = await api.post<AuthResponse>('/signup', data);
  return user;
}

export async function login(data: LoginData): Promise<AuthResponse> {
  const { data: user } = await api.post<AuthResponse>('/login', data);
  return user;
}