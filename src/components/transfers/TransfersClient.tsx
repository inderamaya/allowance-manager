/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from "react"
import { db, collection, onSnapshot } from "@/lib/firebase"
import { RequestTransferDialog } from "@/components/transfers/RequestTransferDialog"
import { TransferList } from "@/components/transfers/TransferList"
import { ArrowLeftRight } from "lucide-react"
import { BankAccountsCard } from "@/components/dashboard/BankAccountsCard"

export function TransfersClient() {
  const [transfers, setTransfers] = useState<any[]>([])

  useEffect(() => {
    // Subscribe to transfers collection, sorted by timestamp descending
    const unsub = onSnapshot(collection(db, 'transfers'), (snap: any) => {
      const list: any[] = []
      snap.forEach((d: any) => {
        const data = d.data()
        const dateVal = data.timestamp
          ? (typeof data.timestamp === 'string' ? new Date(data.timestamp) : new Date(data.timestamp.seconds * 1000))
          : new Date()
        list.push({
          id: d.id,
          amount: data.amount,
          status: data.status,
          type: data.type,
          created_at: dateVal.toISOString()
        })
      })
      // Sort descending
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setTransactions(list)
    })

    function setTransactions(items: any[]) {
      setTransfers(items)
    }

    return () => unsub()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="h-8 w-8 text-primary" />
            Mama Transfers
          </h2>
          <p className="text-muted-foreground">Manage your funds from the Mama Account in real-time.</p>
        </div>
        <RequestTransferDialog />
      </div>

      <div className="grid gap-6 lg:grid-cols-3 pt-4">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold">History</h3>
          <TransferList transfers={transfers} />
        </div>
        <div className="space-y-4">
          <BankAccountsCard />
        </div>
      </div>
    </div>
  )
}
