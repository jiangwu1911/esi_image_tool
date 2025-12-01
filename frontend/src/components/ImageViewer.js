import React, { useRef, useEffect, useState } from 'react';
import Toolbar from './Toolbar';

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
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const canvasContainerRef = useRef(null);
  
  // 状态
  const [drawing, setDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [currentPoint, setCurrentPoint] = useState(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageObj, setImageObj] = useState(null);
  const [transform, setTransform] = useState({
    scale: 1,
    rotation: 0,
    translateX: 0,
    translateY: 0
  });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // 工具函数定义在组件内部但不是作为useCallback
  const isPointInAnnotation = (point, annotation) => {
    const coords = annotation.coordinates;
    
    switch (annotation.shape_type) {
      case 'rectangle':
        return point.x >= coords.x && 
               point.x <= coords.x + coords.width && 
               point.y >= coords.y && 
               point.y <= coords.y + coords.height;
      case 'circle':
        const distance = Math.sqrt(
          Math.pow(point.x - coords.x, 2) + Math.pow(point.y - coords.y, 2)
        );
        return distance <= coords.radius;
      case 'ellipse':
        const normalizedX = (point.x - coords.x) / coords.radiusX;
        const normalizedY = (point.y - coords.y) / coords.radiusY;
        return (normalizedX * normalizedX + normalizedY * normalizedY) <= 1;
      default:
        return false;
    }
  };

  const getAnnotationAtPoint = (x, y) => {
    const point = { x, y };
    // 从后往前检查，这样最后绘制的标注（在顶部）先被选中
    for (let i = annotations.length - 1; i >= 0; i--) {
      if (isPointInAnnotation(point, annotations[i])) {
        return annotations[i];
      }
    }
    return null;
  };

  const isAnnotationValid = (shapeType, coordinates) => {
    if (!coordinates) return false;
    
    const MIN_SIZE = 5;
    
    switch (shapeType) {
      case 'rectangle':
        return coordinates.width > MIN_SIZE && coordinates.height > MIN_SIZE;
      case 'circle':
        return coordinates.radius > MIN_SIZE;
      case 'ellipse':
        return coordinates.radiusX > MIN_SIZE && coordinates.radiusY > MIN_SIZE;
      default:
        return false;
    }
  };

  const calculateCoordinates = (shapeType, startX, startY, endX, endY) => {
    switch (shapeType) {
      case 'rectangle':
        return {
          x: Math.min(startX, endX),
          y: Math.min(startY, endY),
          width: Math.abs(endX - startX),
          height: Math.abs(endY - startY)
        };
      case 'circle':
        const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        return { x: startX, y: startY, radius: radius };
      case 'ellipse':
        const radiusX = Math.abs(endX - startX);
        const radiusY = Math.abs(endY - startY);
        return { x: startX, y: startY, radiusX: radiusX, radiusY: radiusY };
      default:
        return null;
    }
  };

  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    // 获取相对于画布容器的坐标
    const container = canvasContainerRef.current;
    const rect = container.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    
    // 减去容器内边距和偏移
    const containerRect = container.getBoundingClientRect();
    x -= (containerRect.width - canvas.width * transform.scale) / 2;
    y -= (containerRect.height - canvas.height * transform.scale) / 2;
    
    // 应用缩放
    x /= transform.scale;
    y /= transform.scale;
    
    // 应用旋转
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    const rad = transform.rotation * Math.PI / 180;
    const cos = Math.cos(-rad);
    const sin = Math.sin(-rad);
    
    const rotatedX = cos * (x - centerX) - sin * (y - centerY) + centerX;
    const rotatedY = sin * (x - centerX) + cos * (y - centerY) + centerY;
    
    return { x: rotatedX, y: rotatedY };
  };

  // 变换功能
  const handleZoomIn = () => {
    setTransform(prev => ({
      ...prev,
      scale: Math.min(prev.scale * 1.2, 5)
    }));
  };

  const handleZoomOut = () => {
    setTransform(prev => ({
      ...prev,
      scale: Math.max(prev.scale / 1.2, 0.2)
    }));
  };

  const handleRotate = () => {
    setTransform(prev => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360
    }));
  };

  const handlePanStart = () => {
    setIsPanning(true);
  };

  const handlePanEnd = () => {
    setIsPanning(false);
    setPanStart({ x: 0, y: 0 });
  };

  const handleReset = () => {
    setTransform({
      scale: 1,
      rotation: 0,
      translateX: 0,
      translateY: 0
    });
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // 获取鼠标相对于canvas容器的位置
    const container = canvasContainerRef.current;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const oldScale = transform.scale;
    const newScale = Math.max(0.2, Math.min(5, oldScale * (1 + delta)));
    
    // 更新缩放
    setTransform(prev => ({
      ...prev,
      scale: newScale
    }));
  };

  // 绘制函数
  const drawAll = (start = null, end = null) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded || !imageObj) return;
    
    const ctx = canvas.getContext('2d');
    
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 保存当前画布状态
    ctx.save();
    
    // 应用变换（这里只应用旋转，缩放通过CSS实现）
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(transform.rotation * Math.PI / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    
    // 绘制图像
    ctx.drawImage(imageObj, 0, 0, canvas.width, canvas.height);
    
    // 绘制所有已保存的标注
    annotations.forEach(ann => {
      const isSelected = ann.id === selectedAnnotation?.id;
      const annColor = ann.color || color;
      const annLineWidth = ann.line_width || lineWidth;
      
      ctx.strokeStyle = isSelected ? '#00ff00' : annColor;
      ctx.lineWidth = isSelected ? annLineWidth + 2 : annLineWidth;
      ctx.setLineDash(isSelected ? [5, 5] : []);
      
      switch (ann.shape_type) {
        case 'rectangle':
          const rect = ann.coordinates;
          ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
          break;
        case 'circle':
          const circle = ann.coordinates;
          ctx.beginPath();
          ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
          ctx.stroke();
          break;
        case 'ellipse':
          const ellipse = ann.coordinates;
          ctx.beginPath();
          ctx.ellipse(ellipse.x, ellipse.y, ellipse.radiusX, ellipse.radiusY, 0, 0, 2 * Math.PI);
          ctx.stroke();
          break;
        default:
          break;
      }
      
      // 绘制标签
      if (ann.label) {
        ctx.fillStyle = isSelected ? '#00ff00' : annColor;
        ctx.font = '16px Arial';
        ctx.fillText(ann.label, ann.coordinates.x, ann.coordinates.y - 10);
      }

      ctx.setLineDash([]);
    });
    
    // 如果正在绘制，绘制预览
    if (start && end && selectedTool && selectedTool !== 'select') {
      const previewCoords = calculateCoordinates(selectedTool, start.x, start.y, end.x, end.y);
      if (previewCoords && isAnnotationValid(selectedTool, previewCoords)) {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.setLineDash([5, 5]);
        
        switch (selectedTool) {
          case 'rectangle':
            ctx.strokeRect(previewCoords.x, previewCoords.y, previewCoords.width, previewCoords.height);
            break;
          case 'circle':
            ctx.beginPath();
            ctx.arc(previewCoords.x, previewCoords.y, previewCoords.radius, 0, 2 * Math.PI);
            ctx.stroke();
            break;
          case 'ellipse':
            ctx.beginPath();
            ctx.ellipse(previewCoords.x, previewCoords.y, previewCoords.radiusX, previewCoords.radiusY, 0, 0, 2 * Math.PI);
            ctx.stroke();
            break;
        }
        
        ctx.setLineDash([]);
      }
    }
    
    // 恢复画布状态
    ctx.restore();
  };

  // 更新画布容器样式
  const updateCanvasContainerStyle = () => {
    const container = canvasContainerRef.current;
    if (!container) return;
    
    container.style.transform = `
      scale(${transform.scale})
      rotate(${transform.rotation}deg)
      translate(${transform.translateX}px, ${transform.translateY}px)
    `;
    container.style.transformOrigin = 'center center';
    container.style.transition = 'transform 0.1s ease-out';
  };

  // 事件处理函数
  const handleMouseDown = (e) => {
    if (isPanning) {
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const coords = getCanvasCoordinates(e);
    if (!coords) return;
    
    const { x, y } = coords;

    if (selectedTool === 'select') {
      const annotation = getAnnotationAtPoint(x, y);
      if (annotation) {
        setSelectedAnnotation(annotation);
        setDragging(true);
        const annCoords = annotation.coordinates;
        setDragOffset({
          x: x - annCoords.x,
          y: y - annCoords.y
        });
      } else {
        setSelectedAnnotation(null);
      }
    } else if (selectedTool && selectedTool !== 'select') {
      setDrawing(true);
      setStartPoint({ x, y });
      setCurrentPoint({ x, y });
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning && panStart.x !== 0 && panStart.y !== 0) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      
      setTransform(prev => ({
        ...prev,
        translateX: prev.translateX + deltaX,
        translateY: prev.translateY + deltaY
      }));
      
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const coords = getCanvasCoordinates(e);
    if (!coords) return;
    
    const { x, y } = coords;

    if (dragging && selectedAnnotation) {
      const newCoords = { ...selectedAnnotation.coordinates };
      newCoords.x = x - dragOffset.x;
      newCoords.y = y - dragOffset.y;
      
      if (onAnnotationUpdate) {
        onAnnotationUpdate(selectedAnnotation.id, { coordinates: newCoords });
      }
    } else if (drawing && startPoint) {
      setCurrentPoint({ x, y });
    }
  };

  const handleMouseUp = (e) => {
    if (isPanning) {
      setPanStart({ x: 0, y: 0 });
      return;
    }

    const coords = getCanvasCoordinates(e);
    if (!coords) return;
    
    const { x, y } = coords;

    if (drawing && startPoint && selectedTool && selectedTool !== 'select') {
      const coordinates = calculateCoordinates(selectedTool, startPoint.x, startPoint.y, x, y);
      
      if (coordinates && isAnnotationValid(selectedTool, coordinates) && onAnnotationCreate) {
        onAnnotationCreate({
          shape_type: selectedTool,
          coordinates: coordinates,
          label: `Annotation ${annotations.length + 1}`,
          color: color,
          line_width: lineWidth
        });
      }
    }

    setDrawing(false);
    setStartPoint(null);
    setCurrentPoint(null);
    setDragging(false);
    
    drawAll();
  };

  // 当工具从select切换到其他工具时，取消选择当前标注
  useEffect(() => {
    if (selectedTool !== 'select' && selectedAnnotation) {
      setSelectedAnnotation(null);
    }
  }, [selectedTool, selectedAnnotation]);

  // 加载图像
  useEffect(() => {
    if (imageUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setImageObj(img);
        setImageLoaded(true);
        if (canvasRef.current) {
          canvasRef.current.width = img.width;
          canvasRef.current.height = img.height;
          setCanvasSize({ width: img.width, height: img.height });
        }
        setTransform({
          scale: 1,
          rotation: 0,
          translateX: 0,
          translateY: 0
        });
      };
      img.onerror = (err) => {
        console.error('Failed to load image:', err);
        setImageLoaded(false);
      };
      img.src = `http://localhost:5000${imageUrl}`;
    } else {
      setImageLoaded(false);
      setImageObj(null);
      setCanvasSize({ width: 0, height: 0 });
    }
  }, [imageUrl]);

  // 当标注变化时重绘
  useEffect(() => {
    if (!drawing) {
      drawAll();
    }
  }, [annotations, selectedAnnotation, imageLoaded, drawing]);

  // 当绘制状态变化时重绘（显示/隐藏预览）
  useEffect(() => {
    if (drawing && startPoint && currentPoint) {
      drawAll(startPoint, currentPoint);
    }
  }, [drawing, startPoint, currentPoint]);

  // 当变换变化时重绘
  useEffect(() => {
    drawAll();
    updateCanvasContainerStyle();
  }, [transform]);

  // 处理键盘事件
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 缩放快捷键
      if ((e.ctrlKey || e.metaKey) && e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        handleReset();
      }
      
      // 原有的删除和ESC逻辑
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAnnotation) {
        if (onAnnotationDelete) {
          onAnnotationDelete(selectedAnnotation.id);
          setSelectedAnnotation(null);
        }
      }
      
      // 按ESC键取消选择或平移模式
      if (e.key === 'Escape') {
        if (isPanning) {
          handlePanEnd();
        } else if (selectedAnnotation) {
          setSelectedAnnotation(null);
          drawAll();
        } else if (drawing) {
          setDrawing(false);
          setStartPoint(null);
          setCurrentPoint(null);
          drawAll();
        }
      }
      
      // 空格键启动平移模式
      if (e.key === ' ') {
        e.preventDefault();
        if (isPanning) {
          handlePanEnd();
        } else {
          handlePanStart();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedAnnotation, isPanning, drawing]);

  // 更新光标样式
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      if (isPanning) {
        container.style.cursor = 'grabbing';
      } else if (selectedTool === 'select') {
        container.style.cursor = dragging ? 'grabbing' : 'grab';
      } else {
        container.style.cursor = 'crosshair';
      }
    }
  }, [isPanning, selectedTool, dragging]);

  return (
    <div 
      ref={containerRef}
      className="image-viewer"
      onWheel={handleWheel}
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
      
      <div className="transform-info">
        <span style={{color: 'white'}}>{language === 'zh' ? '缩放: ' : 'Zoom: '}{transform.scale.toFixed(2)}x</span>
        <span style={{color: 'white'}}>{language === 'zh' ? '旋转: ' : 'Rotation: '}{transform.rotation}°</span>
        {isPanning && <span style={{color: 'white'}}>{language === 'zh' ? '平移模式 (空格键退出)' : 'Panning Mode (Space to exit)'}</span>}
      </div>
 
      {selectedTool === 'select' && selectedAnnotation && (
        <div className="selection-info">
          {language === 'zh' 
            ? `已选中：${selectedAnnotation.label} (拖动移动，Delete删除，ESC取消)`
            : `Selected: ${selectedAnnotation.label} (Drag to move, Delete to remove, ESC to cancel)`
          }
        </div>
      )}
      
      {!imageLoaded && imageUrl && (
        <div className="loading-overlay">
          {language === 'zh' ? '加载图像中...' : 'Loading image...'}
        </div>
      )}
      
      {/* 新增的画布容器，用于包裹canvas并应用CSS变换 */}
      <div 
        ref={canvasContainerRef}
        className="canvas-container"
        style={{
          display: imageLoaded ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'center',
          width: canvasSize.width * transform.scale,
          height: canvasSize.height * transform.scale,
          transform: `
            scale(${transform.scale})
            rotate(${transform.rotation}deg)
            translate(${transform.translateX}px, ${transform.translateY}px)
          `,
          transformOrigin: 'center center',
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            if (dragging || drawing) {
              setDrawing(false);
              setDragging(false);
              setStartPoint(null);
              setCurrentPoint(null);
              drawAll();
            }
            if (isPanning) {
              setPanStart({ x: 0, y: 0 });
            }
          }}
          style={{ 
            border: '1px solid #2c3e50',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            backgroundColor: 'white',
            cursor: selectedTool === 'select' ? 
              (dragging ? 'grabbing' : 'grab') : 'crosshair'
          }}
        />
      </div>
    </div>
  );
};

export default ImageViewer;
