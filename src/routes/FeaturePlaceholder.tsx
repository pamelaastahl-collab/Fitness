/**
 * FeaturePlaceholder — used by every Day-2 route that ships before its
 * feature lands. Names the feature, the day it's planned for, and a short
 * description so reviewers can click through the sidebar end-to-end without
 * empty white screens.
 */

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
      <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-[color:var(--color-border-strong)] px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-[color:var(--color-text-secondary)]">
        Day {day} feature
      </span>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">{name}</h1>
      <p className="mt-2 text-sm text-[color:var(--color-text-secondary)]">
        {description}
      </p>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Coming Day {day}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[color:var(--color-text-secondary)]">
          The shell, contexts, and mock data are wired today. The feature
          flow itself ships on Day {day}.
        </CardContent>
      </Card>
    </div>
  )
}
