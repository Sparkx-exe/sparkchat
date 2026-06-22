import React, { useState, useEffect, useRef } from 'react';
import { decode } from 'blurhash';

interface BlurhashImageProps {
  src: string;
  hash: string | null;
  alt: string;
  width?: string | number;
  height?: string | number;
  className?: string;
  imgClassName?: string;
}

export const BlurhashImage: React.FC<BlurhashImageProps> = ({
  src,
  hash,
  alt,
  width = '100%',
  height = 'auto',
  className = '',
  imgClassName = '',
}) => {
  const [loaded, setLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!hash || !canvasRef.current) return;
    try {
      // Decode the blurhash to 32x32 pixels
      const pixels = decode(hash, 32, 32);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const imageData = ctx.createImageData(32, 32);
        imageData.data.set(pixels);
        ctx.putImageData(imageData, 0, 0);
      }
    } catch (e) {
      console.error('Failed to decode blurhash:', e);
    }
  }, [hash]);

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      {/* Canvas blurhash placeholder */}
      {hash && !loaded && (
        <canvas
          ref={canvasRef}
          width={32}
          height={32}
          className="absolute inset-0 w-full h-full object-cover blur-sm"
        />
      )}

      {/* Loaded image */}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        } ${imgClassName}`}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
};
export default BlurhashImage;
