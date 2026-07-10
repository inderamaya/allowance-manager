"use client"

import { useState } from "react"
import { redoHistoryAction } from "@/app/actions/finance"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, RotateCcw, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

interface HistoryEntry {
  id: string
  action_type: 'ADD_EXPENSE' | 'REQUEST_TRANSFER' | 'RECEIVE_TRANSFER' | 'UPDATE_BALANCES'
  description: string
  is_undone: boolean
  created_at: string
}

interface HistoryListProps {
  history: HistoryEntry[]
}

export function HistoryList({ history }: HistoryListProps) {
  const [processingId, setProcessingId] = useState<string | null>(null)
  const { toast } = useToast()

  async function handleRedo(id: string, description: string) {
    const confirmed = window.confirm(`Are you sure you want to redo this action?\n\n"${description}"`)
    if (!confirmed) return

    setProcessingId(id)
    try {
      const res = await redoHistoryAction(id)
      if (res.success) {
        toast({
          title: "Action Redone",
          description: res.message,
        })
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: res.message,
        })
      }
    } catch (err) {
      console.error(err)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to redo action.",
      })
    } finally {
      setProcessingId(null)
    }
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <p>No action history has been recorded yet.</p>
        <p className="text-xs mt-1">Actions like setting adjustments, transactions, and transfers will be logged here permanently.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {history.map((entry) => {
        const isUndone = entry.is_undone
        return (
          <Card key={entry.id} className={`border-none ${isUndone ? 'bg-muted/40 opacity-60' : 'bg-card/50'}`}>
            <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={entry.action_type === 'UPDATE_BALANCES' ? "secondary" : "outline"}>
                    {entry.action_type.replace('_', ' ')}
                  </Badge>
                  {isUndone && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Undone
                    </Badge>
                  )}
                </div>
                <p className={`font-semibold text-sm sm:text-base ${isUndone ? 'line-through text-muted-foreground' : ''}`}>
                  {entry.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(entry.created_at), "PPP p")}
                </p>
              </div>
              <div className="flex items-center sm:justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRedo(entry.id, entry.description)}
                  disabled={processingId !== null}
                  className="rounded-xl border-border bg-background text-muted-foreground hover:text-foreground h-9 font-semibold flex items-center gap-1.5"
                >
                  {processingId === entry.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                  Redo
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
