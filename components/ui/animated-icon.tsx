import { cn } from '@/lib/utils'
import { LucideProps } from 'lucide-react'

interface AnimatedIconProps extends Omit<LucideProps, 'ref'> {
  icon: React.ComponentType<LucideProps>
  animation?: 'pulse' | 'spin' | 'bounce' | 'none'
}

const animationClasses = {
  pulse: 'animate-pulse-fast',
  spin: 'animate-spin-slow',
  bounce: 'animate-bounce-subtle',
  none: '',
}

export function AnimatedIcon({ 
  icon: Icon, 
  animation = 'none', 
  className,
  size = 24,
  ...props 
}: AnimatedIconProps) {
  return (
    <Icon
      size={size}
      className={cn(
        'transition-all duration-300',
        animationClasses[animation],
        className
      )}
      {...props}
    />
  )
}