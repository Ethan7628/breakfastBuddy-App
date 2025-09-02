// Performance monitoring and optimization utilities

// Debounce utility for search and input handling
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle utility for scroll events
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Memory usage monitoring
export const monitorMemoryUsage = () => {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    console.log({
      usedJSHeapSize: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
      totalJSHeapSize: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
      jsHeapSizeLimit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`
    });
  }
};

// Performance timing
export const measurePerformance = (name: string) => {
  const start = performance.now();
  
  return {
    end: () => {
      const end = performance.now();
      const duration = end - start;
      console.log(`${name} took ${duration.toFixed(2)}ms`);
      return duration;
    }
  };
};

// Virtual scrolling utility for large lists
export class VirtualScroller {
  private container: HTMLElement;
  private items: any[];
  private itemHeight: number;
  private visibleCount: number;
  private scrollTop = 0;
  
  constructor(
    container: HTMLElement,
    items: any[],
    itemHeight: number,
    visibleCount: number
  ) {
    this.container = container;
    this.items = items;
    this.itemHeight = itemHeight;
    this.visibleCount = visibleCount;
  }
  
  getVisibleItems() {
    const startIndex = Math.floor(this.scrollTop / this.itemHeight);
    const endIndex = Math.min(
      startIndex + this.visibleCount,
      this.items.length
    );
    
    return {
      startIndex,
      endIndex,
      items: this.items.slice(startIndex, endIndex),
      totalHeight: this.items.length * this.itemHeight,
      offsetY: startIndex * this.itemHeight
    };
  }
  
  updateScrollTop(scrollTop: number) {
    this.scrollTop = scrollTop;
  }
}

// Preload critical resources
export const preloadCriticalResources = () => {
  // Preload critical fonts
  const fontPreloads = [
    '/fonts/inter-var.woff2'
  ];
  
  fontPreloads.forEach(font => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = font;
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
  
  // Preload critical images
  const criticalImages = [
    '/images/logo.png',
    '/images/placeholder.svg'
  ];
  
  criticalImages.forEach(src => {
    const img = new Image();
    img.src = src;
  });
};

// Bundle size analyzer
export const analyzeBundleSize = () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Bundle analysis available in production build');
  }
};

// Performance observer for Core Web Vitals
export const initPerformanceObserver = () => {
  if ('PerformanceObserver' in window) {
    // Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log('LCP:', lastEntry.startTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.log('LCP observer not supported');
    }

    // First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          console.log('FID:', entry.processingStart - entry.startTime);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.log('FID observer not supported');
    }

    // Cumulative Layout Shift
    try {
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        });
        console.log('CLS:', clsValue);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.log('CLS observer not supported');
    }
  }
};