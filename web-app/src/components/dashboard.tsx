'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { API_URL } from '@/lib/api'

type Database = {
  name: string
  db_type: string
  user_port: number
  status: string
}
const API_BASE_URL=API_URL
export default function Dashboard() {
  const [databases, setDatabases] = useState<Database[]>([])

  useEffect(() => {
    fetchDatabases()
  }, [])

  const fetchDatabases = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/databases`,{})
      if (!response.ok) throw new Error('Failed to fetch databases')
      const data = await response.json()
      setDatabases(data)
    } catch (error) {
      console.error('Error fetching databases:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
        return 'bg-green-500'
      case 'stopped':
        return 'bg-red-500'
      case 'paused':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {databases.map((db) => (
          <Card key={db.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {db.name}
              </CardTitle>
              <div className={`w-3 h-3 rounded-full ${getStatusColor(db.status)}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{db.db_type}</div>
              <p className="text-xs text-muted-foreground">
                Port: {db.user_port}
              </p>
              <Link href={`/databases/${db.name}`}>
                      <Button variant="outline" size="sm" className="mr-2">Manage</Button>
                    </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}