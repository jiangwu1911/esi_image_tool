import { useState, useCallback } from 'react';

const useImageTransform = () => {
  const [transform, setTransform] = useState({
    scale: 1,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
    isPanning: false,
  });

  // 缩放
  const zoomIn = useCallback(() => {
    setTransform(prev => ({
      ...prev,
      scale: Math.min(prev.scale * 1.2, 10) // 最大放大10倍
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setTransform(prev => ({
      ...prev,
      scale: Math.max(prev.scale / 1.2, 0.1) // 最小缩小到0.1倍
    }));
  }, []);

  // 旋转
  const rotate = useCallback(() => {
    setTransform(prev => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360
    }));
  }, []);

  // 平移
  const startPan = useCallback(() => {
    setTransform(prev => ({
      ...prev,
      isPanning: true
    }));
  }, []);

  const stopPan = useCallback(() => {
    setTransform(prev => ({
      ...prev,
      isPanning: false
    }));
  }, []);

  const handlePan = useCallback((dx, dy) => {
    if (transform.isPanning) {
      setTransform(prev => ({
        ...prev,
        offsetX: prev.offsetX + dx,
        offsetY: prev.offsetY + dy
      }));
    }
  }, [transform.isPanning]);

  // 重置
  const resetTransform = useCallback(() => {
    setTransform({
      scale: 1,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
      isPanning: false,
    });
  }, []);

  // 鼠标滚轮缩放
  const handleWheel = useCallback((event) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.1, Math.min(prev.scale * delta, 10))
    }));
  }, []);

  return {
    transform,
    zoomIn,
    zoomOut,
    rotate,
    startPan,
    stopPan,
    handlePan,
    resetTransform,
    handleWheel,
  };
};

export default useImageTransform;
