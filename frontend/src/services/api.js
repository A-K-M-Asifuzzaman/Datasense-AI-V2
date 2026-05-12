import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 120000, // 2 minutes for heavy ML operations
})

// Request interceptor
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
)

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred'
    return Promise.reject(new Error(message))
  }
)

// ── Upload ──────────────────────────────────────────────────────────────
export const uploadCSV = (file, onProgress) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
  })
}

// ── Quality ─────────────────────────────────────────────────────────────
export const getQuality = (sessionId) =>
  api.get(`/quality/${sessionId}`)

export const getSuggestions = (sessionId) =>
  api.get(`/quality/${sessionId}/suggestions`)

// ── Cleaning ─────────────────────────────────────────────────────────────
export const cleanData = (payload) =>
  api.post('/clean', payload)

// ── EDA ──────────────────────────────────────────────────────────────────
export const getEDA = (sessionId, useCleaned = true) =>
  api.get(`/eda/${sessionId}`, { params: { use_cleaned: useCleaned } })

// ── Insights ─────────────────────────────────────────────────────────────
export const getInsights = (sessionId, useCleaned = true) =>
  api.get(`/insights/${sessionId}`, { params: { use_cleaned: useCleaned } })

// ── ML ────────────────────────────────────────────────────────────────────
export const trainModel = (payload) =>
  api.post('/train', payload)

// ── XAI ──────────────────────────────────────────────────────────────────
export const getXAI = (sessionId) =>
  api.get(`/xai/${sessionId}`)

// ── Download ─────────────────────────────────────────────────────────────
export const downloadCSV = async (sessionId) => {
  const response = await axios.get(`${BASE_URL}/api/download/${sessionId}/csv`, {
    responseType: 'blob',
    timeout: 60000,
  })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', 'cleaned_data.csv')
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export const downloadReport = async (sessionId) => {
  const response = await axios.get(`${BASE_URL}/api/download/${sessionId}/report`, {
    responseType: 'blob',
    timeout: 60000,
  })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', 'datasense_report.json')
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export default api

// ── AutoML ────────────────────────────────────────────────────────────────
export const runAutoML = (payload) => api.post('/automl/train', payload)
export const getAutoMLResult = (sessionId) => api.get(`/automl/result/${sessionId}`)

// ── Anomaly ───────────────────────────────────────────────────────────────
export const getAnomaly = (sessionId, useCleaned = true) =>
  api.get(`/anomaly/${sessionId}`, { params: { use_cleaned: useCleaned } })

// ── Profiling ─────────────────────────────────────────────────────────────
export const getProfile = (sessionId, useCleaned = true) =>
  api.get(`/profile/${sessionId}`, { params: { use_cleaned: useCleaned } })

// ── Feature Engineering ───────────────────────────────────────────────────
export const getFeatures = (sessionId, useCleaned = true) =>
  api.get(`/features/${sessionId}`, { params: { use_cleaned: useCleaned } })

// ── PDF Download ──────────────────────────────────────────────────────────
export const downloadPDF = async (sessionId) => {
  const response = await axios.get(`${BASE_URL}/api/download/${sessionId}/pdf`, {
    responseType: 'blob',
    timeout: 60000,
  })
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `datasense_report_${sessionId.slice(0,8)}.pdf`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
