// 진행률 막대를 네이티브 div로 표시하는 공용 Progress 컴포넌트입니다.
"use client"

import * as React from "react"

function joinClasses(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ")
}

function normalizeProgress(value: number | null | undefined, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0
  if (!Number.isFinite(max) || max <= 0) return 0
  return Math.min(100, Math.max(0, (value / max) * 100))
}

type DivProps = {
  children?: React.ReactNode
  className?: string
  style?: React.CSSProperties
  [key: string]: unknown
}

type SpanProps = {
  children?: React.ReactNode
  className?: string
  [key: string]: unknown
}

type ProgressProps = DivProps & {
  value?: number | null
  max?: number
}

function Progress({
  className,
  children,
  value,
  max = 100,
  ...props
}: ProgressProps) {
  const percent = normalizeProgress(value, max)

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={typeof value === "number" ? Math.min(max, Math.max(0, value)) : undefined}
      data-slot="progress"
      className={joinClasses("relative h-1 w-full overflow-hidden rounded-full bg-muted", className)}
      {...props}
    >
      {children}
      <ProgressIndicator style={{ width: `${percent}%` }} />
    </div>
  )
}

function ProgressTrack({ className, ...props }: DivProps) {
  return (
    <div
      className={joinClasses("relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted", className)}
      data-slot="progress-track"
      {...props}
    />
  )
}

function ProgressIndicator({ className, ...props }: DivProps) {
  return (
    <div
      data-slot="progress-indicator"
      className={joinClasses("h-full bg-primary transition-all", className)}
      {...props}
    />
  )
}

function ProgressLabel({ className, ...props }: SpanProps) {
  return (
    <span
      className={joinClasses("text-sm font-medium", className)}
      data-slot="progress-label"
      {...props}
    />
  )
}

function ProgressValue({ className, ...props }: SpanProps) {
  return (
    <span
      className={joinClasses("ml-auto text-sm text-muted-foreground tabular-nums", className)}
      data-slot="progress-value"
      {...props}
    />
  )
}

export {
  Progress,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue,
}
