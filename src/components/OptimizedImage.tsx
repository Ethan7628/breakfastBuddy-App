import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  onLoad?: () => void;
  onError?: () => void;
}

// Simple in-memory cache for preloaded images
const imageCache = new Set<string>();

export const OptimizedImage = ({
  src,
  alt,
  className,
  width,
  height,
  priority = false,
  quality = 75,
  placeholder = 'blur',
  onLoad,
  onError
}: OptimizedImageProps) => {
  const [isLoading, setIsLoading] = useState(() => !imageCache.has(src));
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Generate optimized image URLs
  const optimizedSrc = useMemo(() => {
    if (!src) return '';
    return src;
  }, [src]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    imageCache.add(src);
    onLoad?.();
  }, [src, onLoad]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  }, [onError]);

  // Setup intersection observer for lazy loading
  useEffect(() => {
    const img = imgRef.current;
    if (!img || priority) return;

    // If already cached, load immediately
    if (imageCache.has(src)) {
      img.src = optimizedSrc;
      setIsLoading(false);
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && img) {
            img.src = optimizedSrc;
            observerRef.current?.unobserve(img);
          }
        });
      },
      {
        rootMargin: '100px', // Start loading 100px before visible
        threshold: 0.01
      }
    );

    observerRef.current.observe(img);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [src, optimizedSrc, priority]);

  // Priority images load immediately
  useEffect(() => {
    if (priority && imgRef.current) {
      imgRef.current.src = optimizedSrc;
    }
  }, [priority, optimizedSrc]);

  if (hasError) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center bg-muted text-muted-foreground rounded-lg',
          className
        )}
        style={{ width, height }}
      >
        <span className="text-xs">Image unavailable</span>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', className)} style={{ width, height }}>
      {/* Blur placeholder */}
      {isLoading && placeholder === 'blur' && (
        <div 
          className="absolute inset-0 bg-gradient-to-br from-muted/60 to-muted/40 animate-pulse rounded-lg"
          aria-hidden="true"
        />
      )}
      
      {/* Main image */}
      <img
        ref={imgRef}
        alt={alt}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-200 rounded-lg',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={handleLoad}
        onError={handleError}
      />

      {/* Minimal loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};