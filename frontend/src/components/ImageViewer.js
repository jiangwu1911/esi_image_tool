// ImageViewer.js
import React, { useEffect } from 'react';
import Toolbar from './Toolbar';
import TransformInfo from './TransformInfo';
import SelectionInfo from './SelectionInfo';
import CanvasContainer from './CanvasContainer';
import LoadingOverlay from './LoadingOverlay';
import { useImageViewer } from '../hooks/useImageViewer';
import { CanvasRenderer } from '../renderers/CanvasRenderer';

const ImageViewer = ({ 
  imageUrl, 
  annotations, 
  onAnnotationCreate, 
  onAnnotationUpdate,
  onAnnotationDelete,
  selectedTool,
  lineWidth,
  color,
  language = 'en'
}) => {
  const {
    // Refs
    canvasRef,
    containerRef,
    canvasContainerRef,
    
    // State
    drawing,
    startPoint,
    currentPoint,
    selectedAnnotation,
    dragging,
    imageLoaded,
    imageObj,
    transform,
    isPanning,
    canvasSize,
    
    // Handlers
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleZoomIn,
    handleZoomOut,
    handleRotate,
    handlePanStart,
    handlePanEnd,
    handleReset,
  } = useImageViewer({
    imageUrl,
    annotations,
    onAnnotationCreate,
    onAnnotationUpdate,
    onAnnotationDelete,
    selectedTool,
    lineWidth,
    color,
  });

  // 绘制函数
  const drawAll = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded || !imageObj) return;
    
    const ctx = canvas.getContext('2d');
    CanvasRenderer.drawAll(
      ctx, 
      canvas, 
      imageObj, 
      annotations, 
      selectedAnnotation,
      lineWidth,
      color,
      drawing ? startPoint : null,
      drawing ? currentPoint : null,
      selectedTool
    );
  };

  // 处理鼠标离开事件
  const handleMouseLeave = () => {
    if (dragging || drawing) {
      // 状态会在useImageViewer中重置
    }
  };

  // 当标注变化时重绘
  useEffect(() => {
    if (!drawing) {
      drawAll();
    }
  }, [annotations, selectedAnnotation, imageLoaded, drawing]);

  // 当绘制状态变化时重绘
  useEffect(() => {
    if (drawing && startPoint && currentPoint) {
      drawAll();
    }
  }, [drawing, startPoint, currentPoint]);

  return (
    <div 
      ref={containerRef}
      className="image-viewer"
      onWheel={handleWheel}
      style={{
        cursor: isPanning ? 'grabbing' : (
          selectedTool === 'select' 
            ? (dragging ? 'grabbing' : 'grab') 
            : 'crosshair'
        )
      }}
    >
      <Toolbar
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onRotate={handleRotate}
        onPan={isPanning ? handlePanEnd : handlePanStart}
        onReset={handleReset}
        language={language}
        isPanning={isPanning}
      />
      
      <TransformInfo
        transform={transform}
        isPanning={isPanning}
        language={language}
      />
 
      <SelectionInfo
        selectedAnnotation={selectedAnnotation}
        language={language}
      />
      
      <LoadingOverlay
        show={!imageLoaded && imageUrl}
        language={language}
      />
      
      <CanvasContainer
        canvasRef={canvasRef}
        canvasContainerRef={canvasContainerRef}
        canvasSize={canvasSize}
        transform={transform}
        imageLoaded={imageLoaded}
        handleMouseDown={handleMouseDown}
        handleMouseMove={handleMouseMove}
        handleMouseUp={handleMouseUp}
        handleMouseLeave={handleMouseLeave}
        selectedTool={selectedTool}
        dragging={dragging}
        isPanning={isPanning}
      />
    </div>
  );
};

export default ImageViewer;
