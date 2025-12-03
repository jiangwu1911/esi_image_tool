// useImageViewer.js
import { useState, useEffect, useRef, useCallback } from 'react';

export const useImageViewer = ({
  imageUrl,
  annotations,
  onAnnotationCreate,
  onAnnotationUpdate,
  onAnnotationDelete,
  selectedTool,
  lineWidth,
  color,
}) => {
  // Refs
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const canvasContainerRef = useRef(null);
  
  // State
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

  // 简化的坐标转换函数 - 只在CSS变换，不需要复杂的数学
  const getCanvasCoordinates = useCallback((e) => {
    const canvas = canvasRef.current;
    const viewerContainer = containerRef.current;
    
    if (!canvas || !viewerContainer) return null;
    
    // 获取整个image-viewer容器的边界
    const viewerRect = viewerContainer.getBoundingClientRect();
    
    // 鼠标相对于viewer容器的坐标
    const mouseX = e.clientX - viewerRect.left;
    const mouseY = e.clientY - viewerRect.top;
    
    // viewer中心点
    const viewerCenterX = viewerRect.width / 2;
    const viewerCenterY = viewerRect.height / 2;
    
    // 计算canvas在viewer中的位置（绝对定位居中）
    const canvasLeft = viewerCenterX - canvas.width / 2 * transform.scale;
    const canvasTop = viewerCenterY - canvas.height / 2 * transform.scale;
    
    // 鼠标是否在canvas区域内
    if (
      mouseX < canvasLeft || 
      mouseX > canvasLeft + canvas.width * transform.scale ||
      mouseY < canvasTop || 
      mouseY > canvasTop + canvas.height * transform.scale
    ) {
      return null;
    }
    
    // 转换为canvas坐标（考虑缩放）
    const canvasX = (mouseX - canvasLeft) / transform.scale;
    const canvasY = (mouseY - canvasTop) / transform.scale;
    
    return {
      x: canvasX,
      y: canvasY
    };
  }, [transform.scale]);

  // Helper functions
  const isPointInAnnotation = useCallback((point, annotation) => {
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
  }, []);

  const getAnnotationAtPoint = useCallback((x, y) => {
    const point = { x, y };
    for (let i = annotations.length - 1; i >= 0; i--) {
      if (isPointInAnnotation(point, annotations[i])) {
        return annotations[i];
      }
    }
    return null;
  }, [annotations, isPointInAnnotation]);

  const isAnnotationValid = useCallback((shapeType, coordinates) => {
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
  }, []);

  const calculateCoordinates = useCallback((shapeType, startX, startY, endX, endY) => {
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
  }, []);

  // Transform handlers
  const handleZoomIn = useCallback(() => {
    setTransform(prev => ({
      ...prev,
      scale: Math.min(prev.scale * 1.2, 5)
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setTransform(prev => ({
      ...prev,
      scale: Math.max(prev.scale / 1.2, 0.2)
    }));
  }, []);

  const handleRotate = useCallback(() => {
    setTransform(prev => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360
    }));
  }, []);

  const handlePanStart = useCallback(() => {
    setIsPanning(true);
  }, []);

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
    setPanStart({ x: 0, y: 0 });
  }, []);

  const handleReset = useCallback(() => {
    setTransform({
      scale: 1,
      rotation: 0,
      translateX: 0,
      translateY: 0
    });
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    
    const oldScale = transform.scale;
    const newScale = Math.max(0.2, Math.min(5, oldScale * (1 + delta)));
    
    setTransform(prev => ({
      ...prev,
      scale: newScale
    }));
  }, [transform]);

  // Event handlers
  const handleMouseDown = useCallback((e) => {
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
  }, [isPanning, getCanvasCoordinates, selectedTool, getAnnotationAtPoint]);

  const handleMouseMove = useCallback((e) => {
    if (isPanning && panStart.x !== 0 && panStart.y !== 0) {
      // 修复：在整个窗口上平移
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
  }, [isPanning, panStart, dragging, selectedAnnotation, dragOffset, onAnnotationUpdate, drawing, startPoint, getCanvasCoordinates]);

  const handleMouseUp = useCallback((e) => {
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
  }, [isPanning, drawing, startPoint, selectedTool, onAnnotationCreate, annotations.length, color, lineWidth, getCanvasCoordinates, calculateCoordinates, isAnnotationValid]);

  // Effects
  useEffect(() => {
    if (selectedTool !== 'select' && selectedAnnotation) {
      setSelectedAnnotation(null);
    }
  }, [selectedTool, selectedAnnotation]);

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

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e) => {
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
      
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAnnotation) {
        if (onAnnotationDelete) {
          onAnnotationDelete(selectedAnnotation.id);
          setSelectedAnnotation(null);
        }
      }
      
      if (e.key === 'Escape') {
        if (isPanning) {
          handlePanEnd();
        } else if (selectedAnnotation) {
          setSelectedAnnotation(null);
        } else if (drawing) {
          setDrawing(false);
          setStartPoint(null);
          setCurrentPoint(null);
        }
      }
      
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
  }, [selectedAnnotation, isPanning, drawing, onAnnotationDelete, handleZoomIn, handleZoomOut, handleReset, handlePanEnd, handlePanStart]);

  // Update cursor
  useEffect(() => {
    const viewerContainer = containerRef.current;
    if (viewerContainer) {
      if (isPanning) {
        viewerContainer.style.cursor = 'grabbing';
      } else if (selectedTool === 'select') {
        viewerContainer.style.cursor = dragging ? 'grabbing' : 'grab';
      } else {
        viewerContainer.style.cursor = 'crosshair';
      }
    }
  }, [isPanning, selectedTool, dragging]);

  return {
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
    dragOffset,
    imageLoaded,
    imageObj,
    transform,
    isPanning,
    panStart,
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
    
    // Additional data
    annotations,
    selectedTool,
    lineWidth,
    color,
  };
};
