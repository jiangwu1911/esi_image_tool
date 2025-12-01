import React, { useState, useEffect } from 'react';
import TreeView from './components/TreeView';
import ImageViewer from './components/ImageViewer';
import AnnotationControls from './components/AnnotationControls';
import FileUpload from './components/FileUpload';
import LanguageSelector from './components/LanguageSelector';
import { getAnnotations, createAnnotation, deleteAnnotation, updateAnnotation } from './services/api';
import { useTranslation } from './hooks/useTranslation';
import './App.css';

function App() {
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [selectedTool, setSelectedTool] = useState('select');
  const [lineWidth, setLineWidth] = useState(2);
  const [color, setColor] = useState('red');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { t, language, setLanguage } = useTranslation();

  const handleInstanceSelect = async (instance) => {
    setSelectedInstance(instance);
    try {
      const response = await getAnnotations(instance.id);
      setAnnotations(response.data);
    } catch (error) {
      console.error('Error loading annotations:', error);
      setAnnotations([]);
    }
  };

  const handleAnnotationCreate = async (annotationData) => {
    if (!selectedInstance) return;
    
    try {
      const response = await createAnnotation(selectedInstance.id, annotationData);
      const newAnnotation = { ...annotationData, id: response.data.id };
      setAnnotations([...annotations, newAnnotation]);
    } catch (error) {
      console.error('Error creating annotation:', error);
    }
  };

  const handleAnnotationUpdate = async (annotationId, updateData) => {
    try {
      await updateAnnotation(annotationId, updateData);
      // 更新本地状态
      setAnnotations(annotations.map(ann => 
        ann.id === annotationId ? { ...ann, ...updateData } : ann
      ));
    } catch (error) {
      console.error('Error updating annotation:', error);
    }
  };

  const handleAnnotationDelete = async (annotationId) => {
    try {
      await deleteAnnotation(annotationId);
      setAnnotations(annotations.filter(ann => ann.id !== annotationId));
    } catch (error) {
      console.error('Error deleting annotation:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>{t('app.title')}</h1>
        <div className="header-controls">
          <LanguageSelector currentLanguage={language} onLanguageChange={setLanguage} />
        </div>
      </header>
      
      <div className="app-content">
        {/* 左侧栏 - 文件管理和树状视图 */}
        <div className="left-sidebar">
          <FileUpload 
            onUploadSuccess={handleRefresh}
            onInstanceSelect={handleInstanceSelect}
            language={language}
          />
          <TreeView 
            onInstanceSelect={handleInstanceSelect}
            onRefresh={handleRefresh}
            key={refreshTrigger}
            language={language}
          />
        </div>
        
        {/* 中间区域 - 图像显示 */}
        <div className="main-viewer">
          {selectedInstance ? (
            <div className="viewer-container">
              <ImageViewer
                imageUrl={selectedInstance.image_url}
                annotations={annotations}
                onAnnotationCreate={handleAnnotationCreate}
                onAnnotationUpdate={handleAnnotationUpdate}
                onAnnotationDelete={handleAnnotationDelete}
                selectedTool={selectedTool}
                lineWidth={lineWidth}
                color={color}
                language={language}
              />
            </div>
          ) : (
            <div className="welcome-message">
              <h2>{t('app.welcome.title')}</h2>
              <p>{t('app.welcome.message')}</p>
            </div>
          )}
        </div>
        
        {/* 右侧栏 - 标注工具 */}
        <div className="right-sidebar">
          <AnnotationControls
            selectedTool={selectedTool}
            onToolSelect={setSelectedTool}
            lineWidth={lineWidth}
            onLineWidthChange={setLineWidth}
            color={color}
            onColorChange={setColor}
            language={language}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
