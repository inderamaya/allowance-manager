/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from "react"
import { db, collection, onSnapshot } from "@/lib/firebase"
import { HistoryList } from "@/components/history/HistoryList"

export function HistoryClient() {
  const [history, setHistory] = useState<any[]>([])

  useEffect(() => {
    // Subscribe to history collection
    const unsub = onSnapshot(collection(db, 'history'), (snap: any) => {
      const list: any[] = []
      snap.forEach((d: any) => {
        const data = d.data()
        const dateVal = data.timestamp
          ? (typeof data.timestamp === 'string' ? new Date(data.timestamp) : new Date(data.timestamp.seconds * 1000))
          : new Date()
        list.push({
          id: d.id,
          action_type: data.actionType || 'UPDATE_BALANCES',
          description: data.details || data.description || '',
          is_undone: !!data.isUndone,
          created_at: dateVal.toISOString()
        })
      })

      // Sort descending
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setHistory(list)
    })

    return () => unsub()
  }, [])

  return (
    <div className="pt-4">
      <HistoryList history={history} />
    </div>
  )
}
