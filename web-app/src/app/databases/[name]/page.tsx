'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { API_URL } from '@/lib/api'
import { Copy } from "lucide-react"

const API_BASE_URL = API_URL

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
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDatabase()
  }, [])

  const fetchDatabase = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/databases/${params.name}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to fetch database')
      const data = await response.json()
      setDatabase(data)
      setUpdateRequest({
        new_env_vars: data.env_vars,
        new_user_port: data.user_port,
        new_internal_port: data.internal_port
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred')
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateDatabase = async (status: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/databases/${params.name}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: status }),
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
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: "destructive",
      })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: "Text copied to clipboard.",
    })
  }

  const getPublicUrl = () => {
    return `https://${database?.name}.${API_URL}`
  }

  /**
   * Constructs the connection URL based on db_type and env_vars.
   * Supported db_types:
   * - MySQL
   * - MariaDB
   * - MongoDB
   * - Postgres
   * - Redis
   */
  const constructConnectionURL = (): string | null => {
    if (!database) return null

    const { db_type, env_vars } = database
    const username = encodeURIComponent(env_vars['USERNAME'] || '')
    const password = encodeURIComponent(env_vars['PASSWORD'] || '')
    const host = env_vars['HOST'] || ''
    const port = env_vars['PORT'] || ''
    const databaseName = env_vars['DATABASE'] || ''

    switch (db_type.toLowerCase()) {
      case 'mysql':
      case 'mariadb':
        return `mysql://${username}:${password}@${host}:${port}/${databaseName}`
      case 'mongodb':
        return `mongodb://${username}:${password}@${host}:${port}/${databaseName}`
      case 'postgres':
        return `postgres://${username}:${password}@${host}:${port}/${databaseName}`
      case 'redis':
        return `redis://:${password}@${host}:${port}/${databaseName}`
      default:
        return null
    }
  }

  const connectionURL = constructConnectionURL()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  if (!database) {
    return <div>No database found</div>
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
                disabled={database.status === 'running'}
              />
            </div>
            <div>
              <Label>Internal Port</Label>
              <Input
                type="number"
                value={updateRequest.new_internal_port ?? database.internal_port}
                onChange={(e) => setUpdateRequest(prev => ({...prev, new_internal_port: parseInt(e.target.value)}))}
                disabled={database.status === 'running'}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Input value={database.status} disabled />
            </div>
            <div>
              <Label>Public URL</Label>
              <div className="flex items-center">
                <Input value={getPublicUrl()} disabled />
                <Button onClick={() => copyToClipboard(getPublicUrl())} className="ml-2">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {connectionURL && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Connection URL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Input value={connectionURL} disabled />
              <Button onClick={() => copyToClipboard(connectionURL)} className="ml-2">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
        </CardHeader>
        <CardContent>
          {updateRequest.new_env_vars && Object.entries(updateRequest.new_env_vars).map(([key, value]) => (
            <div key={key} className="mb-4 flex items-center">
              <Label htmlFor={key}>{key}</Label>
              <Input
                id={key}
                value={value}
                onChange={(e) => {
                  setUpdateRequest(prev => ({
                    ...prev,
                    new_env_vars: {
                      ...prev.new_env_vars,
                      [key]: e.target.value
                    }
                  }))
                }}
                disabled={database.status === 'running'}
                className="ml-2"
              />
              <Button onClick={() => copyToClipboard(value)} className="ml-2">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button onClick={() => updateDatabase('running')} disabled={database.status === 'running'}>
          Update Database
        </Button>
        {database.status === 'running' ? (
          <Button 
            variant="destructive" 
            onClick={() => updateDatabase('stopped')}
          >
            Stop Database
          </Button>
        ) : (
          <Button 
            variant="default" 
            onClick={() => updateDatabase('running')}
          >
            Start Database
          </Button>
        )}
        <Button variant="outline" onClick={() => router.push('/databases')}>Back to List</Button>
      </div>
    </div>
  )
}