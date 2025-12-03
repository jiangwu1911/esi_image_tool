// ImageViewer.js - 修复绘制
import React, { useEffect, useRef } from 'react';
import Toolbar from './Toolbar';
import TransformInfo from './TransformInfo';
import SelectionInfo from './SelectionInfo';
import CanvasContainer from './CanvasContainer';
import LoadingOverlay from './LoadingOverlay';
import { useImageViewer } from '../hooks/useImageViewer';

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
    selectedAnnotation,
    dragging,
    imageLoaded,
    imageObj,
    transform,
    isPanning,
    canvasSize,
    shouldDraw,
    
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
    
    // Tool manager
    toolManager,
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

  // 使用ref来避免重复渲染
  const drawRequestRef = useRef(null);
  
  // 绘制函数
  const drawAll = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded || !imageObj) return;
    
    const ctx = canvas.getContext('2d');
    
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制图像
    ctx.drawImage(imageObj, 0, 0, canvas.width, canvas.height);
    
    // 绘制所有已保存的标注
    annotations.forEach(ann => {
      toolManager.drawAnnotation(ctx, ann, ann.id === selectedAnnotation?.id);
    });
    
    // 如果正在绘制，绘制预览
    if (selectedTool && selectedTool !== 'select' && shouldDraw) {
      toolManager.drawPreview(ctx);
    }
  };

  // 当状态变化时重绘
  useEffect(() => {
    if (drawRequestRef.current) {
      cancelAnimationFrame(drawRequestRef.current);
    }
    
    drawRequestRef.current = requestAnimationFrame(() => {
      drawAll();
    });
    
    return () => {
      if (drawRequestRef.current) {
        cancelAnimationFrame(drawRequestRef.current);
      }
    };
  }, [annotations, selectedAnnotation, imageLoaded, shouldDraw, transform, selectedTool]);

  // 获取当前工具信息
  const getToolInfo = () => {
    if (!selectedTool || selectedTool === 'select') return null;
    
    const toolType = toolManager.getCurrentToolType();
    if (!toolType) return null;
    
    let info = {};
    
    switch (toolType) {
      case 'rectangle':
        info = {
          title: language === 'zh' ? '矩形工具' : 'Rectangle Tool',
          instruction: language === 'zh' ? '点击并拖动绘制矩形，ESC取消' : 'Click and drag to draw rectangle, ESC to cancel'
        };
        break;
      case 'circle':
        info = {
          title: language === 'zh' ? '圆形工具' : 'Circle Tool',
          instruction: language === 'zh' ? '点击并拖动绘制圆形，ESC取消' : 'Click and drag to draw circle, ESC to cancel'
        };
        break;
      case 'ellipse':
        info = {
          title: language === 'zh' ? '椭圆工具' : 'Ellipse Tool',
          instruction: language === 'zh' ? '点击并拖动绘制椭圆，ESC取消' : 'Click and drag to draw ellipse, ESC to cancel'
        };
        break;
      case 'spline':
        info = {
          title: language === 'zh' ? '样条曲线工具' : 'Spline Tool',
          instruction: language === 'zh' ? '点击添加控制点，双击或按Enter完成，ESC取消' : 'Click to add control points, double-click or press Enter to finish, ESC to cancel'
        };
        break;
      case 'freehand':
        info = {
          title: language === 'zh' ? '自由手绘工具' : 'Freehand Tool',
          instruction: language === 'zh' ? '点击并拖动绘制，松开完成，ESC取消' : 'Click and drag to draw, release to finish, ESC to cancel'
        };
        break;
      default:
        return null;
    }
    
    return info;
  };

  const toolInfo = getToolInfo();

  return (
    <div 
      ref={containerRef}
      className="image-viewer"
      onWheel={handleWheel}
      style={{
        cursor: isPanning ? 'grabbing' : (
          selectedTool === 'select' 
            ? (dragging ? 'grabbing' : 'grab') 
            : selectedTool && selectedTool !== 'select'
            ? 'crosshair' 
            : 'default'
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
      
      {toolInfo && (
        <div className="tool-info" style={{
          position: 'absolute',
          top: '60px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(35, 49, 67, 0.9)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '20px',
          fontSize: '14px',
          border: '1px solid #2c3e50',
          zIndex: 1001,
          backdropFilter: 'blur(5px)',
          textAlign: 'center',
          maxWidth: '80%'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            {toolInfo.title}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>
            {toolInfo.instruction}
          </div>
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
