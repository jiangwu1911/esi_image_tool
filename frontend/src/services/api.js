import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const uploadDicom = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const getStudies = () => api.get('/studies');
export const getSeries = (studyId) => api.get(`/series/${studyId}`);
export const getInstances = (seriesId) => api.get(`/instances/${seriesId}`);
export const getAnnotations = (instanceId) => api.get(`/annotations/${instanceId}`);
export const createAnnotation = (instanceId, annotation) => api.post(`/annotations/${instanceId}`, annotation);
export const deleteAnnotation = (annotationId) => api.delete(`/annotations/${annotationId}`);

export const getTree = () => api.get('/tree');
export const deleteStudy = (studyId) => api.delete(`/study/${studyId}`);
export const deleteSeries = (seriesId) => api.delete(`/series/${seriesId}`);
export const deleteInstance = (instanceId) => api.delete(`/instance/${instanceId}`);

export const updateAnnotation = (annotationId, annotationData) => 
  api.put(`/annotations/${annotationId}`, annotationData);
