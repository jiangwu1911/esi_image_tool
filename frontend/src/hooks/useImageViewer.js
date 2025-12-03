// useImageViewer.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { PathRenderer } from '../renderers/PathRenderer';

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
  
  // 新工具的状态
  const [splinePoints, setSplinePoints] = useState([]);
  const [freehandPoints, setFreehandPoints] = useState([]);
  const [isDrawingFreehand, setIsDrawingFreehand] = useState(false);
  const [isDrawingSpline, setIsDrawingSpline] = useState(false);

  // 简化的坐标转换函数
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
    
    // 计算canvas在viewer中的位置（绝对定位居中 + 平移）
    const canvasCenterX = viewerCenterX + transform.translateX;
    const canvasCenterY = viewerCenterY + transform.translateY;
    
    const canvasLeft = canvasCenterX - canvas.width / 2 * transform.scale;
    const canvasTop = canvasCenterY - canvas.height / 2 * transform.scale;
    
    // 鼠标是否在canvas区域内
    if (
      mouseX < canvasLeft || 
      mouseX > canvasLeft + canvas.width * transform.scale ||
      mouseY < canvasTop || 
      mouseY > canvasTop + canvas.height * transform.scale
    ) {
      return null;
    }
    
    // 转换为canvas坐标（考虑缩放和平移）
    const canvasX = (mouseX - canvasLeft) / transform.scale;
    const canvasY = (mouseY - canvasTop) / transform.scale;
    
    return {
      x: canvasX,
      y: canvasY
    };
  }, [transform.scale, transform.translateX, transform.translateY]);

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
      case 'spline':
        // 检查点是否在样条曲线附近
        if (coords.points && coords.points.length > 0) {
          for (let i = 0; i < coords.points.length; i++) {
            const p = coords.points[i];
            const distance = Math.sqrt(
              Math.pow(point.x - p.x, 2) + Math.pow(point.y - p.y, 2)
            );
            if (distance < 10) return true;
          }
        }
        return false;
      case 'freehand':
        // 检查点是否在自由手绘路径附近
        if (coords.points && coords.points.length > 0) {
          for (let i = 0; i < coords.points.length; i++) {
            const p = coords.points[i];
            const distance = Math.sqrt(
              Math.pow(point.x - p.x, 2) + Math.pow(point.y - p.y, 2)
            );
            if (distance < 10) return true;
          }
        }
        return false;
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
      case 'spline':
        return coordinates.points && coordinates.points.length >= 3;
      case 'freehand':
        return coordinates.points && coordinates.points.length >= 2;
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
        
        // 计算拖拽偏移量（基于标注的坐标）
        if (annotation.shape_type === 'rectangle' || annotation.shape_type === 'circle' || annotation.shape_type === 'ellipse') {
          const annCoords = annotation.coordinates;
          setDragOffset({
            x: x - annCoords.x,
            y: y - annCoords.y
          });
        } else if (annotation.shape_type === 'spline' || annotation.shape_type === 'freehand') {
          // 对于路径类标注，计算相对于第一个点的偏移
          const firstPoint = annotation.coordinates.points[0];
          setDragOffset({
            x: x - firstPoint.x,
            y: y - firstPoint.y
          });
        }
      } else {
        setSelectedAnnotation(null);
      }
    } else if (selectedTool === 'spline') {
      // 样条曲线：添加点
      setIsDrawingSpline(true);
      const newPoints = [...splinePoints, { x, y }];
      setSplinePoints(newPoints);
    } else if (selectedTool === 'freehand') {
      // 自由手绘：开始绘制
      setIsDrawingFreehand(true);
      setFreehandPoints([{ x, y }]);
    } else if (selectedTool && ['rectangle', 'circle', 'ellipse'].includes(selectedTool)) {
      // 矩形、圆形、椭圆：开始绘制
      setDrawing(true);
      setStartPoint({ x, y });
      setCurrentPoint({ x, y });
    }
  }, [isPanning, getCanvasCoordinates, selectedTool, getAnnotationAtPoint, splinePoints]);

  const handleMouseMove = useCallback((e) => {
    if (isPanning && panStart.x !== 0 && panStart.y !== 0) {
      // 在整个窗口上平移
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
      // 更新标注位置
      if (selectedAnnotation.shape_type === 'rectangle' || selectedAnnotation.shape_type === 'circle' || selectedAnnotation.shape_type === 'ellipse') {
        const newCoords = { ...selectedAnnotation.coordinates };
        newCoords.x = x - dragOffset.x;
        newCoords.y = y - dragOffset.y;
        
        if (onAnnotationUpdate) {
          onAnnotationUpdate(selectedAnnotation.id, { coordinates: newCoords });
        }
      } else if (selectedAnnotation.shape_type === 'spline' || selectedAnnotation.shape_type === 'freehand') {
        // 对于路径类标注，移动所有点
        const offsetX = x - dragOffset.x - selectedAnnotation.coordinates.points[0].x;
        const offsetY = y - dragOffset.y - selectedAnnotation.coordinates.points[0].y;
        
        const newPoints = selectedAnnotation.coordinates.points.map(point => ({
          x: point.x + offsetX,
          y: point.y + offsetY
        }));
        
        const newCoords = {
          ...selectedAnnotation.coordinates,
          points: newPoints
        };
        
        if (onAnnotationUpdate) {
          onAnnotationUpdate(selectedAnnotation.id, { coordinates: newCoords });
        }
      }
    } else if (drawing && startPoint) {
      // 矩形、圆形、椭圆：更新当前点
      setCurrentPoint({ x, y });
    } else if (isDrawingFreehand) {
      // 自由手绘：添加点
      setFreehandPoints(prev => [...prev, { x, y }]);
    }
  }, [isPanning, panStart, dragging, selectedAnnotation, dragOffset, onAnnotationUpdate, drawing, startPoint, getCanvasCoordinates, isDrawingFreehand]);

  const handleMouseUp = useCallback((e) => {
    if (isPanning) {
      setPanStart({ x: 0, y: 0 });
      return;
    }

    const coords = getCanvasCoordinates(e);
    if (!coords) return;
    
    const { x, y } = coords;

    if (selectedTool === 'freehand' && isDrawingFreehand && freehandPoints.length > 1) {
      // 完成自由手绘
      const simplifiedPoints = PathRenderer.simplifyPath(freehandPoints, 2.0);
      
      if (onAnnotationCreate && simplifiedPoints.length >= 2) {
        onAnnotationCreate({
          shape_type: 'freehand',
          coordinates: { 
            points: simplifiedPoints,
            area: PathRenderer.calculatePathArea(simplifiedPoints),
            length: PathRenderer.calculatePathLength(simplifiedPoints)
          },
          label: `Freehand ROI ${annotations.length + 1}`,
          color: color,
          line_width: lineWidth
        });
      }
      
      setIsDrawingFreehand(false);
      setFreehandPoints([]);
    } else if (drawing && startPoint && selectedTool && ['rectangle', 'circle', 'ellipse'].includes(selectedTool)) {
      // 完成矩形、圆形、椭圆
      const coordinates = calculateCoordinates(selectedTool, startPoint.x, startPoint.y, x, y);
      
      if (coordinates && isAnnotationValid(selectedTool, coordinates) && onAnnotationCreate) {
        onAnnotationCreate({
          shape_type: selectedTool,
          coordinates: coordinates,
          label: `${selectedTool.charAt(0).toUpperCase() + selectedTool.slice(1)} ROI ${annotations.length + 1}`,
          color: color,
          line_width: lineWidth
        });
      }
    }

    setDrawing(false);
    setStartPoint(null);
    setCurrentPoint(null);
    setDragging(false);
  }, [isPanning, selectedTool, isDrawingFreehand, freehandPoints, onAnnotationCreate, annotations.length, color, lineWidth, drawing, startPoint, getCanvasCoordinates, calculateCoordinates, isAnnotationValid]);

  // 双击事件处理样条曲线完成
  const handleDoubleClick = useCallback((e) => {
    if (selectedTool === 'spline' && splinePoints.length >= 3) {
      // 完成样条曲线
      const closedPoints = [...splinePoints, splinePoints[0]]; // 闭合曲线
      
      if (onAnnotationCreate) {
        onAnnotationCreate({
          shape_type: 'spline',
          coordinates: { 
            points: splinePoints,
            closed: true,
            area: PathRenderer.calculatePathArea(closedPoints),
            length: PathRenderer.calculatePathLength(splinePoints)
          },
          label: `Spline ROI ${annotations.length + 1}`,
          color: color,
          line_width: lineWidth
        });
      }
      
      setSplinePoints([]);
      setIsDrawingSpline(false);
    }
  }, [selectedTool, splinePoints, onAnnotationCreate, annotations.length, color, lineWidth]);

  // 处理鼠标离开事件
  const handleMouseLeave = useCallback(() => {
    if (dragging || drawing || isDrawingFreehand || isDrawingSpline) {
      setDrawing(false);
      setDragging(false);
      setIsDrawingFreehand(false);
      setIsDrawingSpline(false);
      setStartPoint(null);
      setCurrentPoint(null);
      setSplinePoints([]);
      setFreehandPoints([]);
    }
    if (isPanning) {
      setPanStart({ x: 0, y: 0 });
    }
  }, [dragging, drawing, isDrawingFreehand, isDrawingSpline, isPanning]);

  // Effects
  useEffect(() => {
    if (selectedTool !== 'select' && selectedAnnotation) {
      setSelectedAnnotation(null);
    }
    
    // 切换工具时清除绘制状态
    if (selectedTool !== 'spline') {
      setSplinePoints([]);
      setIsDrawingSpline(false);
    }
    if (selectedTool !== 'freehand') {
      setFreehandPoints([]);
      setIsDrawingFreehand(false);
    }
    if (!['rectangle', 'circle', 'ellipse'].includes(selectedTool)) {
      setDrawing(false);
      setStartPoint(null);
      setCurrentPoint(null);
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
      
      // ESC键取消绘制或选择
      if (e.key === 'Escape') {
        if (isPanning) {
          handlePanEnd();
        } else if (isDrawingSpline) {
          setSplinePoints([]);
          setIsDrawingSpline(false);
        } else if (isDrawingFreehand) {
          setFreehandPoints([]);
          setIsDrawingFreehand(false);
        } else if (drawing) {
          setDrawing(false);
          setStartPoint(null);
          setCurrentPoint(null);
        } else if (selectedAnnotation) {
          setSelectedAnnotation(null);
        }
      }
      
      // 空格键启动/停止平移模式
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
  }, [selectedAnnotation, isPanning, drawing, isDrawingSpline, isDrawingFreehand, onAnnotationDelete, handleZoomIn, handleZoomOut, handleReset, handlePanEnd, handlePanStart]);

  // Update cursor
  useEffect(() => {
    const viewerContainer = containerRef.current;
    if (viewerContainer) {
      if (isPanning) {
        viewerContainer.style.cursor = 'grabbing';
      } else if (selectedTool === 'select') {
        viewerContainer.style.cursor = dragging ? 'grabbing' : 'grab';
      } else if (selectedTool === 'spline') {
        viewerContainer.style.cursor = 'crosshair';
      } else if (selectedTool === 'freehand') {
        viewerContainer.style.cursor = isDrawingFreehand ? 'crosshair' : 'default';
      } else {
        viewerContainer.style.cursor = 'crosshair';
      }
    }
  }, [isPanning, selectedTool, dragging, isDrawingFreehand]);

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
    
    // Helper functions
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
