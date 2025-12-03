// useImageViewer.js - 修复版本，确保绘制预览实时显示
import { useState, useEffect, useRef, useCallback } from 'react';
import { AnnotationToolManager } from '../tools/AnnotationToolManager';

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
  
  // 新增：强制重绘的触发器
  const [forceRender, setForceRender] = useState(0);
  
  // Tool manager
  const toolManagerRef = useRef(new AnnotationToolManager());
  
  // 工具状态跟踪
  const toolStateRef = useRef({
    isDrawing: false,
    lastUpdate: Date.now()
  });

  // 更新工具上下文
  useEffect(() => {
    toolManagerRef.current.setContext({
      color,
      lineWidth,
      label: `Annotation ${annotations.length + 1}`
    });
  }, [color, lineWidth, annotations.length]);

  // 设置当前工具
  useEffect(() => {
    if (selectedTool && selectedTool !== 'select') {
      const success = toolManagerRef.current.setCurrentTool(selectedTool);
      console.log(`Setting tool ${selectedTool}: ${success ? 'success' : 'failed'}`);
      
      // 重置工具状态
      toolStateRef.current.isDrawing = false;
      setForceRender(prev => prev + 1);
    } else {
      toolManagerRef.current.currentTool = null;
      toolStateRef.current.isDrawing = false;
    }
  }, [selectedTool]);

  // 简化的坐标转换函数
  const getCanvasCoordinates = useCallback((e) => {
    const canvas = canvasRef.current;
    const viewerContainer = containerRef.current;
    
    if (!canvas || !viewerContainer) return null;
    
    const viewerRect = viewerContainer.getBoundingClientRect();
    const mouseX = e.clientX - viewerRect.left;
    const mouseY = e.clientY - viewerRect.top;
    
    const viewerCenterX = viewerRect.width / 2;
    const viewerCenterY = viewerRect.height / 2;
    
    const canvasCenterX = viewerCenterX + transform.translateX;
    const canvasCenterY = viewerCenterY + transform.translateY;
    
    const canvasLeft = canvasCenterX - canvas.width / 2 * transform.scale;
    const canvasTop = canvasCenterY - canvas.height / 2 * transform.scale;
    
    if (
      mouseX < canvasLeft || 
      mouseX > canvasLeft + canvas.width * transform.scale ||
      mouseY < canvasTop || 
      mouseY > canvasTop + canvas.height * transform.scale
    ) {
      return null;
    }
    
    const canvasX = (mouseX - canvasLeft) / transform.scale;
    const canvasY = (mouseY - canvasTop) / transform.scale;
    
    return { x: Math.round(canvasX), y: Math.round(canvasY) };
  }, [transform.scale, transform.translateX, transform.translateY]);

  // 检查点是否在标注内
  const isPointInAnnotation = useCallback((point, annotation) => {
    if (!annotation || !annotation.coordinates) return false;
    
    const coords = annotation.coordinates;
    
    switch (annotation.shape_type) {
      case 'rectangle':
        if (coords.x === undefined || coords.y === undefined || coords.width === undefined || coords.height === undefined) {
          return false;
        }
        return point.x >= coords.x && 
               point.x <= coords.x + coords.width && 
               point.y >= coords.y && 
               point.y <= coords.y + coords.height;
      case 'circle':
        if (coords.x === undefined || coords.y === undefined || coords.radius === undefined) {
          return false;
        }
        const distance = Math.sqrt(
          Math.pow(point.x - coords.x, 2) + Math.pow(point.y - coords.y, 2)
        );
        return distance <= coords.radius;
      case 'ellipse':
        if (coords.x === undefined || coords.y === undefined || coords.radiusX === undefined || coords.radiusY === undefined) {
          return false;
        }
        const normalizedX = (point.x - coords.x) / coords.radiusX;
        const normalizedY = (point.y - coords.y) / coords.radiusY;
        return (normalizedX * normalizedX + normalizedY * normalizedY) <= 1;
      case 'spline':
      case 'freehand':
        if (coords.points && Array.isArray(coords.points)) {
          // 检查点是否在控制点附近
          for (let i = 0; i < coords.points.length; i++) {
            const p = coords.points[i];
            if (p.x === undefined || p.y === undefined) continue;
            
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

  // Event handlers - 关键修复
  const handleMouseDown = useCallback((e) => {
    console.log('Mouse down, selected tool:', selectedTool);
    
    if (isPanning) {
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const coords = getCanvasCoordinates(e);
    if (!coords) return;
    
    const { x, y } = coords;

    if (selectedTool === 'select') {
      const annotation = getAnnotationAtPoint(x, y);
      console.log('Select tool: found annotation:', annotation);
      
      if (annotation) {
        setSelectedAnnotation(annotation);
        setDragging(true);
        
        if (annotation.shape_type === 'rectangle' || annotation.shape_type === 'circle' || annotation.shape_type === 'ellipse') {
          const annCoords = annotation.coordinates;
          setDragOffset({
            x: x - annCoords.x,
            y: y - annCoords.y
          });
        } else if (annotation.shape_type === 'spline' || annotation.shape_type === 'freehand') {
          const firstPoint = annotation.coordinates.points[0];
          setDragOffset({
            x: x - firstPoint.x,
            y: y - firstPoint.y
          });
        }
      } else {
        setSelectedAnnotation(null);
      }
    } else if (selectedTool && selectedTool !== 'select') {
      console.log('Using drawing tool:', selectedTool, 'at point:', { x, y });
      const result = toolManagerRef.current.handleMouseDown({ x, y });
      console.log('Tool mouse down result:', result);
      
      // 更新工具状态
      toolStateRef.current.isDrawing = result.shouldDraw;
      toolStateRef.current.lastUpdate = Date.now();
      
      // 强制重绘以显示预览
      if (result.shouldDraw) {
        setForceRender(prev => prev + 1);
      }
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
      if (selectedAnnotation.shape_type === 'rectangle' || selectedAnnotation.shape_type === 'circle' || selectedAnnotation.shape_type === 'ellipse') {
        const newCoords = { ...selectedAnnotation.coordinates };
        newCoords.x = x - dragOffset.x;
        newCoords.y = y - dragOffset.y;
        
        if (onAnnotationUpdate) {
          onAnnotationUpdate(selectedAnnotation.id, { coordinates: newCoords });
        }
      } else if (selectedAnnotation.shape_type === 'spline' || selectedAnnotation.shape_type === 'freehand') {
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
    } else if (selectedTool && selectedTool !== 'select') {
      const result = toolManagerRef.current.handleMouseMove({ x, y });
      console.log('Tool mouse move result:', result);
      
      // 如果工具正在绘制，强制重绘
      if (result.shouldDraw) {
        toolStateRef.current.isDrawing = true;
        toolStateRef.current.lastUpdate = Date.now();
        setForceRender(prev => prev + 1);
      }
    }
  }, [isPanning, panStart, dragging, selectedAnnotation, dragOffset, onAnnotationUpdate, selectedTool, getCanvasCoordinates]);

  // 关键修复：鼠标释放事件
  const handleMouseUp = useCallback((e) => {
    console.log('Mouse up, selected tool:', selectedTool);
    
    if (isPanning) {
      setPanStart({ x: 0, y: 0 });
      return;
    }
  
    const coords = getCanvasCoordinates(e);
    if (!coords) return;
    
    const { x, y } = coords;
  
    if (selectedTool && selectedTool !== 'select') {
      console.log('Processing tool mouse up for:', selectedTool);
      const result = toolManagerRef.current.handleMouseUp({ x, y });
      console.log('Tool mouse up result:', result);
      
      // 处理标注创建
      if (result.shouldCreateAnnotation) {
        let annotationData = result.annotationData;
        
        // 如果没有annotationData，尝试从工具获取
        if (!annotationData) {
          const tool = toolManagerRef.current.getCurrentTool();
          if (tool && tool.isValid()) {
            annotationData = tool.getAnnotationData(
              `${selectedTool.charAt(0).toUpperCase() + selectedTool.slice(1)} ROI ${annotations.length + 1}`,
              color,
              lineWidth
            );
          }
        }
        
        // 如果有标注数据，创建它
        if (annotationData && onAnnotationCreate) {
          console.log('Creating annotation:', annotationData);
          onAnnotationCreate(annotationData);
        }
      }
      
      // 重置工具
      if (result.resetTool) {
        const tool = toolManagerRef.current.getCurrentTool();
        if (tool) {
          tool.reset();
        }
        toolManagerRef.current.pendingAnnotation = null;
      }
      
      // 更新工具状态
      toolStateRef.current.isDrawing = false;
      setForceRender(prev => prev + 1);
    }

    setDragging(false);
  }, [isPanning, selectedTool, onAnnotationCreate, getCanvasCoordinates, annotations.length, color, lineWidth]);

  // 双击事件
  const handleDoubleClick = useCallback((e) => {
    console.log('Double click, selected tool:', selectedTool);
    
    const coords = getCanvasCoordinates(e);
    if (!coords) return;
    
    const { x, y } = coords;

    if (selectedTool === 'spline') {
      console.log('Spline double click');
      const result = toolManagerRef.current.handleDoubleClick({ x, y });
      console.log('Spline double click result:', result);
    
      if (result.shouldCreateAnnotation && result.annotationData && onAnnotationCreate) {
        console.log('Creating annotation from double click:', result.annotationData);
        onAnnotationCreate(result.annotationData);
      }
    }
  }, [selectedTool, onAnnotationCreate, getCanvasCoordinates]);

  const handleMouseLeave = useCallback(() => {
    if (dragging) {
      setDragging(false);
    }
    if (isPanning) {
      setPanStart({ x: 0, y: 0 });
    }
    
    // 重置工具状态
    toolStateRef.current.isDrawing = false;
    setForceRender(prev => prev + 1);
  }, [dragging, isPanning]);

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
        setForceRender(prev => prev + 1);
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
        } else if (selectedTool && selectedTool !== 'select') {
          toolManagerRef.current.resetAllTools();
          toolStateRef.current.isDrawing = false;
          setForceRender(prev => prev + 1);
        }
      }
      
      // Enter键完成样条曲线
      if (e.key === 'Enter' && selectedTool === 'spline') {
        e.preventDefault();
        console.log('Enter key pressed for spline');
        const tool = toolManagerRef.current.getCurrentTool();
        if (tool && tool.isValid() && onAnnotationCreate) {
          const annotationData = tool.getAnnotationData(
            `Spline ROI ${annotations.length + 1}`,
            color,
            lineWidth
          );
          console.log('Creating spline with Enter key:', annotationData);
          if (annotationData) {
            onAnnotationCreate(annotationData);
            tool.reset();
            toolStateRef.current.isDrawing = false;
            setForceRender(prev => prev + 1);
          }
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
  }, [selectedAnnotation, isPanning, selectedTool, onAnnotationDelete, handleZoomIn, handleZoomOut, handleReset, handlePanEnd, handlePanStart, annotations.length, color, lineWidth, onAnnotationCreate]);

  // 检查是否有正在进行的绘制
  const isDrawing = useCallback(() => {
    return toolStateRef.current.isDrawing || 
           (toolManagerRef.current.currentTool && toolManagerRef.current.currentTool.drawing);
  }, []);

  return {
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
    shouldDraw: isDrawing(), // 关键修复：使用实时计算的绘制状态
    forceRender, // 新增：强制重绘的触发器
    
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
    toolManager: toolManagerRef.current,
    
    // Additional data
    annotations,
    selectedTool,
    lineWidth,
    color,
  };
};
