import { useState } from 'react';

type ResponsiveImageProps = {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  eager?: boolean;
};

export function ResponsiveImage({ src, alt, className = '', sizes = '100vw', eager = false }: ResponsiveImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <span className={`ua-responsive-image${loaded ? ' is-loaded' : ''}`}>
      <img
        src={src}
        alt={alt}
        className={className}
        sizes={sizes}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : 'auto'}
        decoding="async"
        onLoad={() => setLoaded(true)}
      />
    </span>
  );
}
