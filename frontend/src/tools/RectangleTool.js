// RectangleTool.js
import { BaseAnnotationTool } from './BaseAnnotationTool';

export class RectangleTool extends BaseAnnotationTool {
  constructor() {
    super();
    this.type = 'rectangle';
  }
  
  onMouseDown(point, context) {
    this.drawing = true;
    this.startPoint = point;
    this.currentPoint = point;
    return { shouldDraw: true };
  }
  
  onMouseMove(point, context) {
    if (this.drawing) {
      this.currentPoint = point;
      return { shouldDraw: true };
    }
    return { shouldDraw: false };
  }
  
  onMouseUp(point, context) {
    if (this.drawing) {
      this.currentPoint = point;
      const isValid = this.isValid();
      this.drawing = false;
      return { 
        shouldDraw: false, 
        shouldCreateAnnotation: isValid,
        resetTool: true 
      };
    }
    return { shouldDraw: false };
  }
  
  draw(ctx, color, lineWidth) {
    if (!this.startPoint || !this.currentPoint) return;
    
    const coords = this.getCoordinates();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(coords.x, coords.y, coords.width, coords.height);
  }
  
  drawPreview(ctx, color, lineWidth) {
    if (!this.startPoint || !this.currentPoint) return;
    
    const coords = this.getCoordinates();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(coords.x, coords.y, coords.width, coords.height);
    ctx.setLineDash([]);
  }
  
  isValid() {
    if (!this.startPoint || !this.currentPoint) return false;
    
    const coords = this.getCoordinates();
    const MIN_SIZE = 5;
    return coords.width > MIN_SIZE && coords.height > MIN_SIZE;
  }
  
  getAnnotationData(label, color, lineWidth) {
    if (!this.startPoint || !this.currentPoint) return null;
    
    const coords = this.getCoordinates();
    return {
      shape_type: 'rectangle',
      coordinates: coords,
      label: label,
      color: color,
      line_width: lineWidth
    };
  }
  
  getCoordinates() {
    return {
      x: Math.min(this.startPoint.x, this.currentPoint.x),
      y: Math.min(this.startPoint.y, this.currentPoint.y),
      width: Math.abs(this.currentPoint.x - this.startPoint.x),
      height: Math.abs(this.currentPoint.y - this.startPoint.y)
    };
  }
}
