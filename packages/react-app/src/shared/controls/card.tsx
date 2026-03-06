/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {forwardRef, type HTMLAttributes, type ImgHTMLAttributes} from 'react';

// Utility function for className merging
function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}

// Card Root Component
export interface CardProperties extends HTMLAttributes<HTMLDivElement> {
  alignment?: 'left' | 'center' | 'right';
  elevation?: number;
}

const Card = forwardRef<HTMLDivElement, CardProperties>(
  (
    {alignment = 'left', className, elevation = 1, ...properties},
    reference,
  ) => {
    const alignmentClass = {
      center: 'text-center',
      left: 'text-left',
      right: 'text-right',
    }[alignment];

    const elevationClass = elevation > 0 ? 'shadow-md' : 'shadow-none';

    return (
      <div
        ref={reference}
        className={cn(
          'rounded-lg border bg-card text-card-foreground',
          elevationClass,
          alignmentClass,
          className,
        )}
        {...properties}
      />
    );
  },
);
Card.displayName = 'Card';

// Card Media Component
export interface CardMediaProperties
  extends ImgHTMLAttributes<HTMLImageElement> {
  as?: 'img';
}

const CardMedia = forwardRef<HTMLImageElement, CardMediaProperties>(
  ({as: _as = 'img', className, ...properties}, reference) => {
    return (
      <img
        ref={reference}
        className={cn('w-full rounded-t-lg object-cover', className)}
        alt=""
        {...properties}
      />
    );
  },
);
CardMedia.displayName = 'CardMedia';

// Card Adornment Component
export interface CardAdornmentProperties
  extends HTMLAttributes<HTMLDivElement> {
  placement?: 'top-right-outer' | 'top-left-outer' | 'top-right' | 'top-left';
}

const CardAdornment = forwardRef<HTMLDivElement, CardAdornmentProperties>(
  (
    {children, className, placement = 'top-right-outer', ...properties},
    reference,
  ) => {
    const placementClass = {
      'top-left': 'absolute top-2 left-2',
      'top-left-outer': 'absolute -top-2 -left-2',
      'top-right': 'absolute top-2 right-2',
      'top-right-outer': 'absolute -top-2 -right-2',
    }[placement];

    return (
      <div
        ref={reference}
        className={cn(placementClass, className)}
        {...properties}
      >
        {children}
      </div>
    );
  },
);
CardAdornment.displayName = 'CardAdornment';

// Card Content Component
const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({className, ...properties}, reference) => (
    <div
      ref={reference}
      className={cn('p-6 pt-0', className)}
      {...properties}
    />
  ),
);
CardContent.displayName = 'CardContent';

// Card Title Component
const CardTitle = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLHeadingElement>
>(({children, className, ...properties}, reference) => (
  <h3
    ref={reference}
    className={cn(
      'text-2xl font-semibold leading-none tracking-tight',
      className,
    )}
    {...properties}
  >
    {children}
  </h3>
));
CardTitle.displayName = 'CardTitle';

// Card Subtitle Component
const CardSubtitle = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({className, ...properties}, reference) => (
  <p
    ref={reference}
    className={cn('text-sm font-medium text-muted-foreground', className)}
    {...properties}
  />
));
CardSubtitle.displayName = 'CardSubtitle';

// Card Description Component
const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({className, ...properties}, reference) => (
  <p
    ref={reference}
    className={cn('text-sm text-muted-foreground', className)}
    {...properties}
  />
));
CardDescription.displayName = 'CardDescription';

// Card Header Component (optional, for completeness)
const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({className, ...properties}, reference) => (
    <div
      ref={reference}
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...properties}
    />
  ),
);
CardHeader.displayName = 'CardHeader';

// Card Footer Component (optional, for completeness)
const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({className, ...properties}, reference) => (
    <div
      ref={reference}
      className={cn('flex items-center p-6 pt-0', className)}
      {...properties}
    />
  ),
);
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardAdornment,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardMedia,
  CardSubtitle,
  CardTitle,
};
