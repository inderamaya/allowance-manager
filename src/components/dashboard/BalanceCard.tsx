import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface BalanceCardProps {
  title: string
  amount: number
  currency?: string
  icon: LucideIcon
  className?: string
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
}

export function BalanceCard({
  title,
  amount,
  currency = "RM",
  icon: Icon,
  className,
  description,
  trend
}: BalanceCardProps) {
  return (
    <Card className={cn("overflow-hidden border-none bg-card/50 backdrop-blur-sm transition-all hover:shadow-md", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">
          {currency} {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        {(description || trend) && (
          <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
            {trend && (
              <span className={cn(trend.isPositive ? "text-emerald-500" : "text-destructive")}>
                {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
              </span>
            )}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
