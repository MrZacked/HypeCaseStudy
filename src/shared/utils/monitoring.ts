interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();

  start(name: string): void {
    this.metrics.set(name, {
      name,
      startTime: performance.now()
    });
  }

  end(name: string): number {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric '${name}' not found`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    this.metrics.set(name, {
      ...metric,
      endTime,
      duration
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  getAllMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values()).filter(m => m.duration !== undefined);
  }

  clear(): void {
    this.metrics.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Performance decorator for functions
export const withPerformanceTracking = <T extends unknown[], R>(
  fn: (...args: T) => R,
  name: string
) => {
  return (...args: T): R => {
    performanceMonitor.start(name);
    const result = fn(...args);
    performanceMonitor.end(name);
    return result;
  };
};

// React hook for performance tracking
export const usePerformanceTracking = () => {
  const track = (name: string, fn: () => void) => {
    performanceMonitor.start(name);
    fn();
    performanceMonitor.end(name);
  };

  return { track, monitor: performanceMonitor };
};