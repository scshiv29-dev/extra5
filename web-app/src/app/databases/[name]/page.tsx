'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { API_URL } from '@/lib/api'

const API_BASE_URL =API_URL

type Database = {
  name: string
  db_type: string
  user_port: number
  internal_port: number
  status: string
  env_vars: Record<string, string>
}

type UpdateDatabaseRequest = {
  new_env_vars?: Record<string, string>
  new_user_port?: number
  new_internal_port?: number
}

export default function DatabasePage() {
  const params = useParams()
  const router = useRouter()
  const [database, setDatabase] = useState<Database | null>(null)
  const [updateRequest, setUpdateRequest] = useState<UpdateDatabaseRequest>({})
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [newStatus, setNewStatus] = useState('')

  useEffect(() => {
    fetchDatabase()
  }, [])

  const fetchDatabase = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/databases/${params.name}`, {
        method: 'GET',
        mode:"no-cors",
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to fetch database')
      const data = await response.json()
      setDatabase(data)
      // Initialize updateRequest with current values
      setUpdateRequest({
        new_env_vars: data.env_vars,
        new_user_port: data.user_port,
        new_internal_port: data.internal_port
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error as string,
        variant: "destructive",
        
      })
    }
  }

  const updateDatabase = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/databases/${params.name}/update`, {
        method: 'PUT',
        mode:"no-cors",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateRequest),
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to update database')
      await fetchDatabase()
      toast({
        title: "Success",
        description: "Database updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error as string,
        variant: "destructive",
      })
    }
  }

  const updateDatabaseStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/databases/${params.name}/status?new_status=${newStatus}`, {
        method: 'PUT',
        mode:"no-cors",
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to update database status')
      await fetchDatabase()
      setIsConfirmDialogOpen(false)
      toast({
        title: "Success",
        description: "Database status updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error as string,
        variant: "destructive",
      })
    }
  }

  const handleEnvVarChange = (key: string, value: string) => {
    setUpdateRequest(prev => ({
      ...prev,
      new_env_vars: {
        ...prev.new_env_vars,
        [key]: value
      }
    }))
  }

  if (!database) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Manage Database: {database.name}</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Database Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input value={database.name} disabled />
            </div>
            <div>
              <Label>Type</Label>
              <Input value={database.db_type} disabled />
            </div>
            <div>
              <Label>User Port</Label>
              <Input
                type="number"
                value={updateRequest.new_user_port ?? database.user_port}
                onChange={(e) => setUpdateRequest(prev => ({...prev, new_user_port: parseInt(e.target.value)}))}
              />
            </div>
            <div>
              <Label>Internal Port</Label>
              <Input
                type="number"
                value={updateRequest.new_internal_port ?? database.internal_port}
                onChange={(e) => setUpdateRequest(prev => ({...prev, new_internal_port: parseInt(e.target.value)}))}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Input value={database.status} disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
        </CardHeader>
        <CardContent>
          {updateRequest.new_env_vars && Object.entries(updateRequest.new_env_vars).map(([key, value]) => (
            <div key={key} className="mb-4">
              <Label htmlFor={key}>{key}</Label>
              <Input
                id={key}
                value={value}
                onChange={(e) => handleEnvVarChange(key, e.target.value)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button onClick={updateDatabase}>Update Database</Button>
        <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Change Status</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Status Change</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="new-status">New Status</Label>
              <Input
                id="new-status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                placeholder="Enter new status"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>Cancel</Button>
              <Button onClick={updateDatabaseStatus}>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button variant="destructive" onClick={() => router.push('/databases')}>Back to List</Button>
      </div>
    </div>
  )
}