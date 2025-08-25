"use client"

import type { ReactNode } from "react"

interface StatRectangleProps {
  label: string
  value: string
  valueColor?: string
  icon?: ReactNode
}

export function StatRectangle({ label, value, valueColor = "text-[var(--foreground)] font-bold", icon }: StatRectangleProps) {
  return (
    <div className="bg-white dark:bg-[#1e2939] px-3 py-1.5 rounded-full border-0 flex items-center gap-2">
      {icon}
      <span className="text-[var(--muted-foreground)]">
        {label}: <span className={valueColor}>{value.toLocaleString()}</span>
      </span>
    </div>
  )
}
