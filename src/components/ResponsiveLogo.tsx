import { OptimizedImage } from './OptimizedImage';
import logo512 from '../images/logo-512.webp';
import logo1024 from '../images/logo-1024.webp';

interface ResponsiveLogoProps {
  size: 'small' | 'medium' | 'large';
  className?: string;
  alt?: string;
}

const sizeConfig = {
  small: {
    width: 40,
    height: 40,
    src: logo512
  },
  medium: {
    width: 64,
    height: 64,
    src: logo512
  },
  large: {
    width: 120,
    height: 120,
    src: logo1024
  }
};

export const ResponsiveLogo = ({ 
  size, 
  className,
  alt = "Breakfast Buddy Logo"
}: ResponsiveLogoProps) => {
  const config = sizeConfig[size];
  
  return (
    <OptimizedImage
      src={config.src}
      alt={alt}
      width={config.width}
      height={config.height}
      className={className}
      priority={size === 'large'}
      quality={90}
    />
  );
};