"use client"

import { useState } from "react"
import { undoLastAction, redoLastAction } from "@/app/actions/finance"
import { Button } from "@/components/ui/button"
import { Undo2, Redo2, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function UndoRedoControls() {
  const [loadingUndo, setLoadingUndo] = useState(false)
  const [loadingRedo, setLoadingRedo] = useState(false)
  const { toast } = useToast()

  async function handleUndo() {
    setLoadingUndo(true)
    try {
      const res = await undoLastAction()
      if (res.success) {
        toast({
          title: "Undo Successful",
          description: res.message,
        })
      } else {
        toast({
          variant: "destructive",
          title: "Undo",
          description: res.message,
        })
      }
    } catch (err) {
      console.error(err)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to perform undo operation.",
      })
    } finally {
      setLoadingUndo(false)
    }
  }

  async function handleRedo() {
    setLoadingRedo(true)
    try {
      const res = await redoLastAction()
      if (res.success) {
        toast({
          title: "Redo Successful",
          description: res.message,
        })
      } else {
        toast({
          variant: "destructive",
          title: "Redo",
          description: res.message,
        })
      }
    } catch (err) {
      console.error(err)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to perform redo operation.",
      })
    } finally {
      setLoadingRedo(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleUndo}
        disabled={loadingUndo || loadingRedo}
        className="rounded-xl border-border bg-card/50 text-muted-foreground hover:text-foreground"
      >
        {loadingUndo ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Undo2 className="h-4 w-4 mr-1.5" />}
        Undo
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRedo}
        disabled={loadingUndo || loadingRedo}
        className="rounded-xl border-border bg-card/50 text-muted-foreground hover:text-foreground"
      >
        {loadingRedo ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Redo2 className="h-4 w-4 mr-1.5" />}
        Redo
      </Button>
    </div>
  )
}
