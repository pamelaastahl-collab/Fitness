import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function HomeRoute() {
  return (
    <main className="mx-auto max-w-[1280px] px-8 py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight">FitFlow Prototype</h1>
        <p className="mt-2 text-base text-[color:var(--color-text-secondary)]">
          Day 1 scaffold. Tailwind v4 + shadcn/ui themed against the FitFlow style guide.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Style guide smoke test</CardTitle>
          <CardDescription>
            Buttons should be pill-shaped per the style guide rule. Primary uses Electric Blue (#2563EB).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button className="rounded-full">Primary action</Button>
          <Button variant="secondary" className="rounded-full">Secondary</Button>
          <Button variant="ghost" className="rounded-full">Ghost</Button>
          <Button variant="destructive" className="rounded-full">Danger</Button>
          <Badge>Active</Badge>
        </CardContent>
      </Card>
    </main>
  )
}
