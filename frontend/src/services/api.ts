import axios, { AxiosError, AxiosResponse } from 'axios'

// Creates an axios instance with a base URL and default headers.
export const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL ?? 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true    // Include HttpOnly cookies in requests
})

// Global response interceptor to normalize errors
// Handles network and server errors in one place to avoid accidental exposure of unhandled errors
api.interceptors.response.use(
  (res: AxiosResponse) => res,    // Pass through successful responses (like normally)
  (err: AxiosError) => {          // err is the raw error object from axios
    // Grab the server's 'error' field from the response body if it's present
    const serverMsg = err.response?.data && (err.response.data as any).error
    // Extract specific { error: string } or fallback to default err.message
    return Promise.reject(new Error(serverMsg || err.message))
  }
)