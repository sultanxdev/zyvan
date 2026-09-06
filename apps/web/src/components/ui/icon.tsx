import * as React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from '@/lib/utils';

export type IconSvgObject = (
  | [string, { [key: string]: string | number }]
  | readonly [string, { readonly [key: string]: string | number }]
)[];

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'icon'> {
  icon: any;
  size?: number | string;
  strokeWidth?: number;
  className?: string;
}

export function Icon({
  icon,
  size = 18,
  strokeWidth = 1.5,
  className,
  ...props
}: IconProps) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      strokeWidth={strokeWidth}
      className={cn('inline-block shrink-0 text-current', className)}
      {...(props as any)}
    />
  );
}

export { HugeiconsIcon };
