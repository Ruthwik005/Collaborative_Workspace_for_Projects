import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const Dialog = forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("relative", className)} {...props}>
    {children}
  </div>
))
Dialog.displayName = "Dialog"

const DialogTrigger = forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props}>
    {children}
  </div>
))
DialogTrigger.displayName = "DialogTrigger"

const DialogContent = forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50",
      className
    )}
    {...props}
  >
    <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
      {children}
    </div>
  </div>
))
DialogContent.displayName = "DialogContent"

const DialogHeader = forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pb-0", className)} {...props}>
    {children}
  </div>
))
DialogHeader.displayName = "DialogHeader"

const DialogTitle = forwardRef(({ className, children, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  >
    {children}
  </h2>
))
DialogTitle.displayName = "DialogTitle"

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle }