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

  // 修复：正确的坐标转换函数
  const getCanvasCoordinates = useCallback((e) => {
    const canvas = canvasRef.current;
    const container = canvasContainerRef.current;
    
    if (!canvas || !container) return null;
    
    // 获取鼠标相对于容器的坐标
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 重要：计算容器中心
    const containerCenterX = rect.width / 2;
    const containerCenterY = rect.height / 2;
    
    // 鼠标相对于容器中心的坐标
    const centeredX = x - containerCenterX;
    const centeredY = y - containerCenterY;
    
    // 应用反向变换：先反向平移，再反向旋转，再反向缩放
    // 1. 反向平移
    let transformedX = centeredX - transform.translateX;
    let transformedY = centeredY - transform.translateY;
    
    // 2. 反向旋转
    const rad = -transform.rotation * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    
    const rotatedX = cos * transformedX - sin * transformedY;
    const rotatedY = sin * transformedX + cos * transformedY;
    
    // 3. 反向缩放
    transformedX = rotatedX / transform.scale;
    transformedY = rotatedY / transform.scale;
    
    // 4. 转换为画布坐标（加上画布中心）
    const canvasCenterX = canvas.width / 2;
    const canvasCenterY = canvas.height / 2;
    
    return {
      x: transformedX + canvasCenterX,
      y: transformedY + canvasCenterY
    };
  }, [transform]);

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

  // 修复：确保每次只旋转90度
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
    
    // Helper functions for drawAll
    getAnnotationAtPoint,
    calculateCoordinates,
    isAnnotationValid,
    
    // Additional data
    annotations,
    selectedTool,
    lineWidth,
    color,
  };
};
