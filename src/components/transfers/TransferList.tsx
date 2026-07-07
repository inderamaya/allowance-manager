"use client"

import { useState } from "react"
import { receiveTransfer } from "@/app/actions/finance"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

interface Transfer {
  id: string
  amount: number
  status: string
  type: string
  created_at: string
}

interface TransferHistoryProps {
  transfers: Transfer[]
}

export function TransferList({ transfers }: TransferHistoryProps) {
  const [processingId, setProcessingId] = useState<string | null>(null)
  const { toast } = useToast()

  async function handleReceive(id: string, amount: number) {
    setProcessingId(id)
    try {
      await receiveTransfer(id, amount)
      toast({
        title: "Transfer received",
        description: `RM ${amount.toFixed(2)} added to your wallet.`,
      })
    } catch (err) {
      console.error(err)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process transfer.",
      })
    } finally {
      setProcessingId(null)
    }
  }

  if (transfers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No transfer history yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {transfers.map((transfer) => (
        <Card key={transfer.id} className="border-none bg-card/50">
          <CardContent className="flex items-center justify-between p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">RM {transfer.amount.toFixed(2)}</span>
                <Badge variant={transfer.status === 'completed' ? "secondary" : "outline"}>
                  {transfer.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(transfer.created_at), "PPP p")}
              </p>
            </div>
            {transfer.status === 'pending' && transfer.type === 'request' && (
              <Button
                size="sm"
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={() => handleReceive(transfer.id, transfer.amount)}
                disabled={processingId === transfer.id}
              >
                {processingId === transfer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Receive"}
              </Button>
            )}
            {transfer.status === 'completed' && (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
