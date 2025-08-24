import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { LoadingSpinner } from './loading-spinner'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] btn-hover-lift',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-white hover:bg-primary-600 shadow-lg hover:shadow-xl active:shadow-md',
        secondary:
          'bg-secondary text-white hover:bg-secondary-600 shadow-lg hover:shadow-xl active:shadow-md',
        outline:
          'border-2 border-primary text-primary hover:bg-primary hover:text-white shadow-md hover:shadow-lg',
        ghost:
          'text-primary hover:bg-primary/10 hover:text-primary-700',
        danger:
          'bg-danger text-white hover:bg-danger-600 shadow-lg hover:shadow-xl active:shadow-md',
      },
      size: {
        sm: 'h-9 px-3 text-xs',
        md: 'h-10 px-4 py-2',
        lg: 'h-11 px-6 text-base',
        xl: 'h-12 px-8 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <LoadingSpinner size="sm" className="mr-2" />
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }