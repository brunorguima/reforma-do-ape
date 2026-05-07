'use client'

interface SkeletonProps {
  className?: string
}

function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-surface-container-high rounded-xl ${className}`} />
  )
}

/** Skeleton that mimics a KPI card row */
export function KpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 ${count > 2 ? 'md:grid-cols-4' : ''} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-surface-lowest border border-outline-variant rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-8 rounded-xl" />
          </div>
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  )
}

/** Skeleton that mimics a card list */
export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-surface-lowest border border-outline-variant rounded-2xl p-4 flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

/** Skeleton that mimics the Dashboard hero + KPIs + quick actions */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Hero card */}
      <div className="bg-surface-lowest border border-outline-variant rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-40" />
          </div>
          <Skeleton className="w-11 h-11 rounded-xl" />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-8" />
          </div>
          <Skeleton className="h-2.5 w-full rounded-full" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="flex-1 h-12 rounded-xl" />
          <Skeleton className="flex-1 h-12 rounded-xl" />
        </div>
      </div>

      {/* KPI grid */}
      <KpiSkeleton count={4} />

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface-lowest border border-outline-variant rounded-2xl p-4 space-y-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface-lowest border border-outline-variant rounded-2xl p-6 space-y-4">
          <Skeleton className="h-4 w-36" />
          <CardListSkeleton count={2} />
        </div>
        <div className="bg-surface-lowest border border-outline-variant rounded-2xl p-6 space-y-4">
          <Skeleton className="h-4 w-32" />
          <CardListSkeleton count={3} />
        </div>
      </div>
    </div>
  )
}

/** Skeleton for financial/measurement panels with KPIs + list */
export function PanelSkeleton() {
  return (
    <div className="space-y-6">
      <KpiSkeleton count={4} />
      <CardListSkeleton count={4} />
    </div>
  )
}

export default Skeleton
