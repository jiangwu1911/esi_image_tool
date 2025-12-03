// PathRenderer.js - 修复版本
export const PathRenderer = {
  // 绘制样条曲线（分段Catmull-Rom样条）
  drawSpline: (ctx, points, isClosed = false, isPreview = false) => {
    if (points.length < 2) return;
    
    ctx.beginPath();
    
    if (points.length === 2) {
      // 只有两个点，直接画直线
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
    } else {
      // 分段绘制Catmull-Rom样条
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = i > 0 ? points[i - 1] : points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = i < points.length - 2 ? points[i + 2] : points[i + 1];
        
        // 绘制当前段
        PathRenderer.drawCatmullRomSegment(ctx, p0, p1, p2, p3);
      }
      
      // 如果是预览且接近起点，自动闭合
      if (isPreview && points.length >= 3) {
        const lastPoint = points[points.length - 1];
        const firstPoint = points[0];
        const distance = Math.sqrt(
          Math.pow(lastPoint.x - firstPoint.x, 2) + 
          Math.pow(lastPoint.y - firstPoint.y, 2)
        );
        
        if (distance < 20) { // 20像素内自动闭合
          // 绘制闭合段
          const p0 = points[points.length - 2];
          const p1 = points[points.length - 1];
          const p2 = points[0];
          const p3 = points[1];
          PathRenderer.drawCatmullRomSegment(ctx, p0, p1, p2, p3);
          
          // 闭合到起点
          ctx.lineTo(firstPoint.x, firstPoint.y);
        }
      }
      
      // 如果明确要求闭合
      if (isClosed && points.length > 2) {
        // 连接最后一段到第一段
        const p0 = points[points.length - 2];
        const p1 = points[points.length - 1];
        const p2 = points[0];
        const p3 = points[1];
        PathRenderer.drawCatmullRomSegment(ctx, p0, p1, p2, p3);
        
        // 闭合到起点
        ctx.lineTo(points[0].x, points[0].y);
      }
    }
  },
  
  // 绘制Catmull-Rom样条的一段
  drawCatmullRomSegment: (ctx, p0, p1, p2, p3) => {
    // 从p1到p2的样条
    for (let t = 0; t <= 1; t += 0.05) {
      const t2 = t * t;
      const t3 = t2 * t;
      
      const x = 0.5 * ((2 * p1.x) +
                     (-p0.x + p2.x) * t +
                     (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
                     (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
      
      const y = 0.5 * ((2 * p1.y) +
                     (-p0.y + p2.y) * t +
                     (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
                     (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
      
      if (t === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
  },
  
  // 绘制自由手绘（带自动闭合）
  drawFreehand: (ctx, points, isClosed = false, isPreview = false) => {
    if (points.length < 2) return;
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    // 绘制路径
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    
    // 如果是预览且接近起点，自动闭合
    if (isPreview && points.length >= 10) { // 至少10个点才考虑自动闭合
      const lastPoint = points[points.length - 1];
      const firstPoint = points[0];
      const distance = Math.sqrt(
        Math.pow(lastPoint.x - firstPoint.x, 2) + 
        Math.pow(lastPoint.y - firstPoint.y, 2)
      );
      
      if (distance < 15) { // 15像素内自动闭合
        ctx.lineTo(firstPoint.x, firstPoint.y);
        ctx.closePath();
        return;
      }
    }
    
    // 如果明确要求闭合
    if (isClosed) {
      ctx.closePath();
    }
  },
  
  // 检查是否应该自动闭合
  shouldAutoClose: (points, threshold = 15) => {
    if (points.length < 3) return false;
    
    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];
    const distance = Math.sqrt(
      Math.pow(lastPoint.x - firstPoint.x, 2) + 
      Math.pow(lastPoint.y - firstPoint.y, 2)
    );
    
    return distance < threshold;
  },
  
  // 获取连接起点后的闭合路径
  getClosedPath: (points) => {
    if (points.length < 3) return points;
    
    // 复制点数组并添加起点作为终点
    return [...points, points[0]];
  },
  
  // 简化路径（Ramer-Douglas-Peucker算法）- 优化版本
  simplifyPath: (points, epsilon = 1.0) => {
    if (points.length < 3) return points;
    
    const findFurthestPoint = (points, start, end) => {
      let maxDistance = 0;
      let furthestIndex = start;
      const startPoint = points[start];
      const endPoint = points[end];
      
      // 如果起点和终点相同，跳过简化
      if (startPoint.x === endPoint.x && startPoint.y === endPoint.y) {
        return { index: start, distance: 0 };
      }
      
      for (let i = start + 1; i < end; i++) {
        const distance = PathRenderer.perpendicularDistance(points[i], startPoint, endPoint);
        if (distance > maxDistance) {
          maxDistance = distance;
          furthestIndex = i;
        }
      }
      
      return { index: furthestIndex, distance: maxDistance };
    };
    
    const simplifySegment = (points, start, end, epsilon, result) => {
      const { index, distance } = findFurthestPoint(points, start, end);
      
      if (distance > epsilon) {
        simplifySegment(points, start, index, epsilon, result);
        result.push(points[index]);
        simplifySegment(points, index, end, epsilon, result);
      }
    };
    
    const result = [points[0]];
    simplifySegment(points, 0, points.length - 1, epsilon, result);
    result.push(points[points.length - 1]);
    
    return result;
  },
  
  perpendicularDistance: (point, lineStart, lineEnd) => {
    const area = Math.abs(
      (lineEnd.y - lineStart.y) * point.x -
      (lineEnd.x - lineStart.x) * point.y +
      lineEnd.x * lineStart.y -
      lineEnd.y * lineStart.x
    );
    
    const lineLength = Math.sqrt(
      Math.pow(lineEnd.x - lineStart.x, 2) + 
      Math.pow(lineEnd.y - lineStart.y, 2)
    );
    
    return lineLength > 0 ? area / lineLength : 0;
  },
  
  // 计算路径长度
  calculatePathLength: (points) => {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  },
  
  // 计算路径面积（用于闭合路径）
  calculatePathArea: (points) => {
    if (points.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    
    return Math.abs(area) / 2;
  },
  
  // 计算点到点的距离
  pointDistance: (p1, p2) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  },
  
  // 检查点是否在线段附近
  isPointNearLine: (point, lineStart, lineEnd, threshold = 10) => {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) param = dot / lenSq;
    
    let xx, yy;
    
    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }
    
    const dx = point.x - xx;
    const dy = point.y - yy;
    
    return Math.sqrt(dx * dx + dy * dy) < threshold;
  }
};
