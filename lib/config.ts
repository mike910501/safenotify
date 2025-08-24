// Configuración centralizada de la API
export const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3005'

export const getApiUrl = (endpoint: string) => {
  return `${API_URL}${endpoint}`
}