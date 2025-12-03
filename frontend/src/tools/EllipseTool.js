// EllipseTool.js
import { BaseAnnotationTool } from './BaseAnnotationTool';

export class EllipseTool extends BaseAnnotationTool {
  constructor() {
    super();
    this.type = 'ellipse';
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
    ctx.beginPath();
    ctx.ellipse(coords.x, coords.y, coords.radiusX, coords.radiusY, 0, 0, 2 * Math.PI);
    ctx.stroke();
  }
  
  drawPreview(ctx, color, lineWidth) {
    if (!this.startPoint || !this.currentPoint) return;
    
    const coords = this.getCoordinates();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.ellipse(coords.x, coords.y, coords.radiusX, coords.radiusY, 0, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  
  isValid() {
    if (!this.startPoint || !this.currentPoint) return false;
    
    const coords = this.getCoordinates();
    const MIN_SIZE = 5;
    return coords.radiusX > MIN_SIZE && coords.radiusY > MIN_SIZE;
  }
  
  getAnnotationData(label, color, lineWidth) {
    if (!this.startPoint || !this.currentPoint) return null;
    
    const coords = this.getCoordinates();
    return {
      shape_type: 'ellipse',
      coordinates: coords,
      label: label,
      color: color,
      line_width: lineWidth
    };
  }
  
  getCoordinates() {
    const radiusX = Math.abs(this.currentPoint.x - this.startPoint.x);
    const radiusY = Math.abs(this.currentPoint.y - this.startPoint.y);
    return { 
      x: this.startPoint.x, 
      y: this.startPoint.y, 
      radiusX: radiusX, 
      radiusY: radiusY 
    };
  }
}
