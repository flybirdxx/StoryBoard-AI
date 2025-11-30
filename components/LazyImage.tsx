import React, { useState, useRef, useEffect, memo } from 'react';

interface LazyImageProps {
  src?: string;
  alt?: string;
  className?: string;
  placeholder?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
  loading?: 'lazy' | 'eager';
  threshold?: number; // Intersection observer threshold
}

/**
 * 懒加载图片组件
 * 使用 Intersection Observer API 实现图片懒加载，减少初始加载时间
 */
const LazyImage: React.FC<LazyImageProps> = memo(({
  src,
  alt = '',
  className = '',
  placeholder,
  onLoad,
  onError,
  loading = 'lazy',
  threshold = 0.1
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(loading === 'eager');
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // 如果设置为 eager 或已经加载，直接显示
    if (loading === 'eager' || isLoaded) {
      setIsInView(true);
      return;
    }

    // 如果图片已经加载过，直接显示
    if (!src) {
      return;
    }

    // 创建 Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            // 一旦进入视口，就不再需要观察
            if (observerRef.current && imgRef.current) {
              observerRef.current.unobserve(imgRef.current);
            }
          }
        });
      },
      {
        threshold,
        rootMargin: '50px' // 提前 50px 开始加载
      }
    );

    observerRef.current = observer;

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (observerRef.current && imgRef.current) {
        observerRef.current.unobserve(imgRef.current);
      }
    };
  }, [src, loading, threshold, isLoaded]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // 如果没有 src，显示占位符
  if (!src) {
    return (
      <div className={`lazy-image-container ${className}`}>
        {placeholder || (
          <div className="lazy-image-placeholder-default">
            <span>No Image</span>
          </div>
        )}
      </div>
    );
  }

  // 如果加载出错，显示错误占位符
  if (hasError) {
    return (
      <div className={`lazy-image-container ${className}`}>
        {placeholder || (
          <div className="lazy-image-error">
            <span>加载失败</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`lazy-image-container ${className}`} ref={imgRef}>
      {!isLoaded && placeholder && (
        <div className="lazy-image-placeholder">
          {placeholder}
        </div>
      )}
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={`lazy-image-img ${!isLoaded ? 'loading' : 'loaded'}`}
          onLoad={handleLoad}
          onError={handleError}
          loading={loading}
        />
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

export default LazyImage;

