"use client"

import { useState } from "react"
import { requestTransfer } from "@/app/actions/finance"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ArrowLeftRight, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function RequestTransferDialog() {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const { toast } = useToast()

  async function handleSubmit(formData: FormData) {
    setPending(true)
    try {
      await requestTransfer(formData)
      setOpen(false)
      toast({
        title: "Request sent",
        description: "Transfer request has been recorded.",
      })
    } catch (err) {
      console.error(err)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send request.",
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-primary/20 hover:bg-primary/5">
          <ArrowLeftRight className="mr-2 h-4 w-4" /> Request Transfer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Request Mama Transfer</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (RM)</Label>
            <Input id="amount" name="amount" type="number" step="0.01" placeholder="0.00" required />
          </div>
          <Button type="submit" disabled={pending} className="w-full bg-primary hover:bg-primary/90">
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Send Request"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
