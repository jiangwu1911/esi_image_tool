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
    splinePoints,
    freehandPoints,
    isDrawingFreehand,
    isDrawingSpline,
    
    // Handlers
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
    handleMouseLeave,
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
      selectedTool,
      splinePoints,
      freehandPoints
    );
  };

  // 当标注变化时重绘
  useEffect(() => {
    if (!drawing && !isDrawingFreehand && !isDrawingSpline) {
      drawAll();
    }
  }, [annotations, selectedAnnotation, imageLoaded, drawing, isDrawingFreehand, isDrawingSpline]);

  // 当绘制状态变化时重绘
  useEffect(() => {
    if ((drawing && startPoint && currentPoint) || isDrawingFreehand || isDrawingSpline) {
      drawAll();
    }
  }, [drawing, startPoint, currentPoint, isDrawingFreehand, isDrawingSpline, splinePoints, freehandPoints]);

  // 当变换变化时重绘
  useEffect(() => {
    drawAll();
  }, [transform]);

  return (
    <div 
      ref={containerRef}
      className="image-viewer"
      onWheel={handleWheel}
      style={{
        cursor: isPanning ? 'grabbing' : (
          selectedTool === 'select' 
            ? (dragging ? 'grabbing' : 'grab') 
            : selectedTool === 'spline' || selectedTool === 'freehand' 
            ? 'crosshair' 
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
      
      {selectedTool === 'spline' && splinePoints.length > 0 && (
        <div className="spline-info" style={{
          position: 'absolute',
          top: '60px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(35, 49, 67, 0.9)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '14px',
          border: '1px solid #2c3e50',
          zIndex: 1001,
          backdropFilter: 'blur(5px)'
        }}>
          {language === 'zh' 
            ? `已添加 ${splinePoints.length} 个点 (双击完成，ESC取消)`
            : `Added ${splinePoints.length} points (Double-click to finish, ESC to cancel)`
          }
        </div>
      )}
      
      {selectedTool === 'freehand' && isDrawingFreehand && freehandPoints.length > 0 && (
        <div className="freehand-info" style={{
          position: 'absolute',
          top: '60px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(35, 49, 67, 0.9)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '14px',
          border: '1px solid #2c3e50',
          zIndex: 1001,
          backdropFilter: 'blur(5px)'
        }}>
          {language === 'zh' 
            ? `正在绘制自由手绘 (松开鼠标完成，ESC取消)`
            : `Drawing freehand (Release mouse to finish, ESC to cancel)`
          }
        </div>
      )}
      
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
        handleDoubleClick={handleDoubleClick}
        handleMouseLeave={handleMouseLeave}
        selectedTool={selectedTool}
        dragging={dragging}
        isPanning={isPanning}
      />
    </div>
  );
};

export default ImageViewer;
