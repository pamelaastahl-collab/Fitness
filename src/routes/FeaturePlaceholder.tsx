/**
 * FeaturePlaceholder — used by every Day-2 route that ships before its
 * feature lands. Names the feature, the day it's planned for, and a short
 * description so reviewers can click through the sidebar end-to-end without
 * empty white screens.
 */

import { Hammer } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface FeaturePlaceholderProps {
  name: string
  day: number
  description: string
}

export function FeaturePlaceholder({
  name,
  day,
  description,
}: FeaturePlaceholderProps) {
  return (
    <div className="mx-auto max-w-3xl px-8 py-12">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[color:var(--color-border-strong)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-text-muted)]">
        Day {day} feature
      </span>
      <h1 className="mt-3 font-display text-2xl font-bold tracking-tight">
        {name}
      </h1>
      <p className="mt-2 text-sm text-[color:var(--color-text-secondary)]">
        {description}
      </p>
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[color:var(--color-primary-light)] text-[color:var(--color-primary)]">
            <Hammer size={18} strokeWidth={1.75} />
          </div>
          <CardTitle className="text-[17px]">Coming Day {day}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[color:var(--color-text-secondary)]">
          The shell, contexts, and mock data are wired today. The feature
          flow itself ships on Day {day}.
        </CardContent>
      </Card>
    </div>
  )
}
