import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  themeColor?: 'orange' | 'pink'; // To handle the theme switch
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  themeColor = 'orange',
  className = '',
  ...props 
}) => {
  
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const colorMap = {
    orange: {
      primary: "bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500",
      secondary: "bg-orange-100 text-orange-900 hover:bg-orange-200 focus:ring-orange-500",
      outline: "border-2 border-orange-600 text-orange-600 hover:bg-orange-50 focus:ring-orange-500",
      ghost: "text-orange-600 hover:bg-orange-50 hover:text-orange-700",
    },
    pink: {
      primary: "bg-pink-600 text-white hover:bg-pink-700 focus:ring-pink-500",
      secondary: "bg-pink-100 text-pink-900 hover:bg-pink-200 focus:ring-pink-500",
      outline: "border-2 border-pink-600 text-pink-600 hover:bg-pink-50 focus:ring-pink-500",
      ghost: "text-pink-600 hover:bg-pink-50 hover:text-pink-700",
    }
  };

  const selectedColors = colorMap[themeColor];

  const variants = {
    primary: selectedColors.primary,
    secondary: selectedColors.secondary,
    outline: selectedColors.outline,
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    ghost: selectedColors.ghost,
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
