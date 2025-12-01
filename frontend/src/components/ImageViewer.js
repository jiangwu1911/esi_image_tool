import React, { useRef, useEffect, useState, useCallback } from 'react';

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
  const [drawing, setDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [currentPoint, setCurrentPoint] = useState(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageObj, setImageObj] = useState(null);

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
        // 初始化画布大小
        if (canvasRef.current) {
          canvasRef.current.width = img.width;
          canvasRef.current.height = img.height;
        }
      };
      img.onerror = (err) => {
        console.error('Failed to load image:', err);
        setImageLoaded(false);
      };
      img.src = `http://localhost:5000${imageUrl}`;
    } else {
      setImageLoaded(false);
      setImageObj(null);
    }
  }, [imageUrl]);

  // 检查点是否在标注内
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

  // 获取鼠标位置的标注
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

  // 检查标注是否足够大
  const isAnnotationValid = (shapeType, coordinates) => {
    if (!coordinates) return false;
    
    const MIN_SIZE = 5; // 最小5像素
    
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

  // 计算坐标
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

  // 绘制函数
  const drawAll = useCallback((start = null, end = null) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded || !imageObj) return;
    
    const ctx = canvas.getContext('2d');
    
    // 1. 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 2. 绘制图像
    ctx.drawImage(imageObj, 0, 0);
    
    // 3. 绘制所有已保存的标注
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

      // 重置虚线
      ctx.setLineDash([]);
    });
    
    // 4. 如果正在绘制，绘制预览
    if (start && end && selectedTool && selectedTool !== 'select') {
      const previewCoords = calculateCoordinates(selectedTool, start.x, start.y, end.x, end.y);
      if (previewCoords && isAnnotationValid(selectedTool, previewCoords)) {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.setLineDash([5, 5]); // 预览使用虚线
        
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
  }, [imageLoaded, imageObj, annotations, selectedAnnotation, selectedTool, color, lineWidth]);

  // 当标注变化时重绘
  useEffect(() => {
    if (!drawing) {
      drawAll();
    }
  }, [annotations, selectedAnnotation, imageLoaded, drawing, drawAll]);

  // 当绘制状态变化时重绘（显示/隐藏预览）
  useEffect(() => {
    if (drawing && startPoint && currentPoint) {
      drawAll(startPoint, currentPoint);
    }
  }, [drawing, startPoint, currentPoint, drawAll]);

  // 获得画布坐标
  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    return { x, y };
  };

  // 处理鼠标按下
  const handleMouseDown = (e) => {
    const coords = getCanvasCoordinates(e);
    if (!coords) return;
    
    const { x, y } = coords;

    if (selectedTool === 'select') {
      // 选择模式
      const annotation = getAnnotationAtPoint(x, y);
      if (annotation) {
        setSelectedAnnotation(annotation);
        setDragging(true);
        // 计算拖拽偏移量
        const annCoords = annotation.coordinates;
        setDragOffset({
          x: x - annCoords.x,
          y: y - annCoords.y
        });
      } else {
        setSelectedAnnotation(null);
      }
    } else if (selectedTool && selectedTool !== 'select') {
      // 绘制模式
      setDrawing(true);
      setStartPoint({ x, y });
      setCurrentPoint({ x, y });
    }
  };

  // 处理鼠标移动
  const handleMouseMove = (e) => {
    const coords = getCanvasCoordinates(e);
    if (!coords) return;
    
    const { x, y } = coords;

    if (dragging && selectedAnnotation) {
      // 拖拽模式
      const newCoords = { ...selectedAnnotation.coordinates };
      newCoords.x = x - dragOffset.x;
      newCoords.y = y - dragOffset.y;
      
      // 更新标注位置
      if (onAnnotationUpdate) {
        onAnnotationUpdate(selectedAnnotation.id, { coordinates: newCoords });
      }
    } else if (drawing && startPoint) {
      // 更新当前点用于预览
      setCurrentPoint({ x, y });
    }
  };

  // 处理鼠标抬起
  const handleMouseUp = (e) => {
    const coords = getCanvasCoordinates(e);
    if (!coords) return;
    
    const { x, y } = coords;

    if (drawing && startPoint && selectedTool && selectedTool !== 'select') {
      // 完成绘制
      const coordinates = calculateCoordinates(selectedTool, startPoint.x, startPoint.y, x, y);
      
      // 检查标注是否有效（足够大）
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

    // 重置状态
    setDrawing(false);
    setStartPoint(null);
    setCurrentPoint(null);
    setDragging(false);
    
    // 重绘以清除预览
    drawAll();
  };

  // 处理键盘事件
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAnnotation) {
        if (onAnnotationDelete) {
          onAnnotationDelete(selectedAnnotation.id);
          setSelectedAnnotation(null);
        }
      }
      
      // 按ESC键取消选择
      if (e.key === 'Escape') {
        if (selectedAnnotation) {
          setSelectedAnnotation(null);
          drawAll(); // 重绘以清除选择状态
        } else if (drawing) {
          // 如果正在绘制，取消绘制
          setDrawing(false);
          setStartPoint(null);
          setCurrentPoint(null);
          drawAll(); // 重绘以清除预览
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAnnotation, onAnnotationDelete, drawing, drawAll]);

  return (
    <div className="image-viewer">
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
      
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          // 鼠标离开画布时取消状态
          if (dragging || drawing) {
            setDrawing(false);
            setDragging(false);
            setStartPoint(null);
            setCurrentPoint(null);
            drawAll(); // 重绘以清除预览
          }
        }}
        style={{ 
          cursor: selectedTool === 'select' ? 
            (dragging ? 'grabbing' : 'grab') : 'crosshair',
          display: imageLoaded ? 'block' : 'none',
          border: '1px solid #ccc',
          maxWidth: '90vw',
          maxHeight: '70vh',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          backgroundColor: 'white'
        }}
      />
    </div>
  );
};

export default ImageViewer;
