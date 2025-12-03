// CanvasRenderer.js
export const CanvasRenderer = {
  drawAll: (ctx, canvas, imageObj, annotations, selectedAnnotation, 
            transform, selectedTool, lineWidth, color, startPoint = null, currentPoint = null) => {
    
    if (!ctx || !canvas || !imageObj) return;
    
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 保存当前画布状态
    ctx.save();
    
    // 重要：应用变换的正确顺序
    // 1. 将原点移到画布中心
    ctx.translate(canvas.width / 2, canvas.height / 2);
    
    // 2. 应用旋转
    ctx.rotate(transform.rotation * Math.PI / 180);
    
    // 3. 应用平移
    ctx.translate(transform.translateX / transform.scale, transform.translateY / transform.scale);
    
    // 4. 将原点移回
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    
    // 绘制图像
    ctx.drawImage(imageObj, 0, 0, canvas.width, canvas.height);
    
    // 绘制所有已保存的标注
    annotations.forEach(ann => {
      CanvasRenderer.drawAnnotation(ctx, ann, ann.id === selectedAnnotation?.id, lineWidth, color);
    });
    
    // 如果正在绘制，绘制预览
    if (startPoint && currentPoint && selectedTool && selectedTool !== 'select') {
      CanvasRenderer.drawPreview(ctx, selectedTool, startPoint, currentPoint, lineWidth, color);
    }
    
    // 恢复画布状态
    ctx.restore();
  },
  
  drawAnnotation: (ctx, annotation, isSelected, defaultLineWidth, defaultColor) => {
    const coords = annotation.coordinates;
    const annColor = annotation.color || defaultColor;
    const annLineWidth = annotation.line_width || defaultLineWidth;
    
    ctx.strokeStyle = isSelected ? '#00ff00' : annColor;
    ctx.lineWidth = isSelected ? annLineWidth + 2 : annLineWidth;
    ctx.setLineDash(isSelected ? [5, 5] : []);
    
    switch (annotation.shape_type) {
      case 'rectangle':
        ctx.strokeRect(coords.x, coords.y, coords.width, coords.height);
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(coords.x, coords.y, coords.radius, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      case 'ellipse':
        ctx.beginPath();
        ctx.ellipse(coords.x, coords.y, coords.radiusX, coords.radiusY, 0, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      default:
        break;
    }
    
    // 绘制标签
    if (annotation.label) {
      ctx.fillStyle = isSelected ? '#00ff00' : annColor;
      ctx.font = '16px Arial';
      ctx.fillText(annotation.label, coords.x, coords.y - 10);
    }

    ctx.setLineDash([]);
  },
  
  drawPreview: (ctx, shapeType, startPoint, currentPoint, lineWidth, color) => {
    const coords = calculatePreviewCoordinates(shapeType, startPoint, currentPoint);
    
    if (!coords) return;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([5, 5]);
    
    switch (shapeType) {
      case 'rectangle':
        ctx.strokeRect(coords.x, coords.y, coords.width, coords.height);
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(coords.x, coords.y, coords.radius, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      case 'ellipse':
        ctx.beginPath();
        ctx.ellipse(coords.x, coords.y, coords.radiusX, coords.radiusY, 0, 0, 2 * Math.PI);
        ctx.stroke();
        break;
    }
    
    ctx.setLineDash([]);
  }
};

// Helper function for preview coordinates
function calculatePreviewCoordinates(shapeType, startPoint, currentPoint) {
  const { x: startX, y: startY } = startPoint;
  const { x: endX, y: endY } = currentPoint;
  
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
}
