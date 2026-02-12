/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {forwardRef, type HTMLAttributes, type ImgHTMLAttributes} from "react"

// Utility function for className merging
function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ")
}

// Card Root Component
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  alignment?: "left" | "center" | "right"
  elevation?: number
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({alignment = "left", className, elevation = 1, ...props}, ref) => {
    const alignmentClass = {
      center: "text-center",
      left: "text-left",
      right: "text-right",
    }[alignment]

    const elevationClass = elevation > 0 ? "shadow-md" : "shadow-none"

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border bg-card text-card-foreground",
          elevationClass,
          alignmentClass,
          className,
        )}
        {...props}
      />
    )
  },
)
Card.displayName = "Card"

// Card Media Component
export interface CardMediaProps extends ImgHTMLAttributes<HTMLImageElement> {
  as?: "img"
}

const CardMedia = forwardRef<HTMLImageElement, CardMediaProps>(
  ({as: _as = "img", className, ...props}, ref) => {
    return (
      <img
        ref={ref}
        className={cn("w-full rounded-t-lg object-cover", className)}
        {...props}
      />
    )
  },
)
CardMedia.displayName = "CardMedia"

// Card Adornment Component
export interface CardAdornmentProps extends HTMLAttributes<HTMLDivElement> {
  placement?: "top-right-outer" | "top-left-outer" | "top-right" | "top-left"
}

const CardAdornment = forwardRef<HTMLDivElement, CardAdornmentProps>(
  ({children, className, placement = "top-right-outer", ...props}, ref) => {
    const placementClass = {
      "top-left": "absolute top-2 left-2",
      "top-left-outer": "absolute -top-2 -left-2",
      "top-right": "absolute top-2 right-2",
      "top-right-outer": "absolute -top-2 -right-2",
    }[placement]

    return (
      <div ref={ref} className={cn(placementClass, className)} {...props}>
        {children}
      </div>
    )
  },
)
CardAdornment.displayName = "CardAdornment"

// Card Content Component
const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({className, ...props}, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  ),
)
CardContent.displayName = "CardContent"

// Card Title Component
const CardTitle = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLHeadingElement>
>(({className, ...props}, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className,
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

// Card Subtitle Component
const CardSubtitle = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({className, ...props}, ref) => (
  <p
    ref={ref}
    className={cn("text-sm font-medium text-muted-foreground", className)}
    {...props}
  />
))
CardSubtitle.displayName = "CardSubtitle"

// Card Description Component
const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({className, ...props}, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

// Card Header Component (optional, for completeness)
const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({className, ...props}, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  ),
)
CardHeader.displayName = "CardHeader"

// Card Footer Component (optional, for completeness)
const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({className, ...props}, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  ),
)
CardFooter.displayName = "CardFooter"

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
}
