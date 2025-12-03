// PathRenderer.js - 处理样条曲线和自由手绘的渲染
export const PathRenderer = {
  // 绘制样条曲线（Catmull-Rom样条）
  drawSpline: (ctx, points, isClosed = false) => {
    if (points.length < 2) return;
    
    ctx.beginPath();
    
    if (points.length === 2) {
      // 只有两个点，直接画直线
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
    } else {
      // 使用Catmull-Rom样条曲线
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(i - 1, 0)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(i + 2, points.length - 1)];
        
        // Catmull-Rom样条计算
        for (let t = 0; t <= 1; t += 0.1) {
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
      }
    }
    
    if (isClosed && points.length > 2) {
      ctx.closePath();
    }
  },
  
  // 绘制自由手绘
  drawFreehand: (ctx, points) => {
    if (points.length < 2) return;
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
  },
  
  // 简化路径（Ramer-Douglas-Peucker算法）
  simplifyPath: (points, epsilon = 1.0) => {
    if (points.length < 3) return points;
    
    const findFurthestPoint = (points, start, end) => {
      let maxDistance = 0;
      let furthestIndex = start;
      
      for (let i = start + 1; i < end; i++) {
        const distance = perpendicularDistance(points[i], points[start], points[end]);
        if (distance > maxDistance) {
          maxDistance = distance;
          furthestIndex = i;
        }
      }
      
      return { index: furthestIndex, distance: maxDistance };
    };
    
    const perpendicularDistance = (point, lineStart, lineEnd) => {
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
      
      return area / lineLength;
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
  }
};
