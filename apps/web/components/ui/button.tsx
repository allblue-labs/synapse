import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-ink/20 disabled:pointer-events-none disabled:opacity-50',
          variant === 'primary' && 'bg-ink text-white hover:bg-graphite',
          variant === 'secondary' && 'border border-ink/10 bg-white text-ink hover:bg-mist',
          variant === 'ghost' && 'text-graphite hover:bg-ink/5',
          variant === 'danger' && 'bg-ember text-white hover:bg-ember/90',
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
