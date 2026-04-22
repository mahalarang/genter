import React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

export interface DialogProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  title: string
}

export const Dialog: React.FC<DialogProps> = ({ open, onClose, children, className, title }) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div 
        className={cn("bg-card text-card-foreground shadow-lg sm:rounded-lg border w-full max-w-md mx-4 overflow-hidden", className)}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-6 pb-4 border-b">
          <h3 className="font-semibold leading-none tracking-tight">{title}</h3>
          <button 
            onClick={onClose}
            className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          >
            <X size={16} />
            <span className="sr-only">Close</span>
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
