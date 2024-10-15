'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"

type DatabaseRequest = {
  name: string
  db_type: string
  internal_port: number
  env_vars: Record<string, string>
}

type AvailablePortsResponse = number[]

export default function CreateDatabasePage() {
  const router = useRouter()
  const [formData, setFormData] = useState<DatabaseRequest>({
    name: '',
    db_type: 'mysql', // Default type
    internal_port: 8000,
    env_vars: {}
  })
  const [availablePorts, setAvailablePorts] = useState<AvailablePortsResponse>([])
  const [selectedPort, setSelectedPort] = useState<number | null>(null)
  const [isFetchingPorts, setIsFetchingPorts] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  // Fetch available ports when internal_port or db_type changes
  useEffect(() => {
    if (formData.internal_port) {
      fetchAvailablePorts(formData.internal_port)
    }
  }, [formData.internal_port])

  const fetchAvailablePorts = async (port: number) => {
    setIsFetchingPorts(true)
    setAvailablePorts([])
    setSelectedPort(null)
    try {
      const response = await fetch(`${API_BASE_URL}/get-free-ports/${port}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to fetch available ports.')
      }

      const ports: AvailablePortsResponse = await response.json()
      setAvailablePorts(ports)
      setSelectedPort(ports[0]) // Automatically select the first port
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'An unknown error occurred while fetching ports.',
        variant: "destructive",
      })
    } finally {
      setIsFetchingPorts(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'internal_port' ? parseInt(value) : value
    }))
  }

  const handleEnvVarChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      env_vars: {
        ...prev.env_vars,
        [key]: value
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPort) {
      toast({
        title: "Error",
        description: "Please select a user port.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`${API_BASE_URL}/databases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          user_port: selectedPort
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to create database.')
      }

      const data = await response.json()
      toast({
        title: "Success",
        description: "Database created successfully.",
      })
      router.push(`/databases/${formData.name}`)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'An unknown error occurred while creating the database.',
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Create New Database</h1>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Database Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="db_type">Database Type</Label>
                <Input
                  id="db_type"
                  name="db_type"
                  value={formData.db_type}
                  onChange={handleInputChange}
                  required
                  list="db-types"
                />
                <datalist id="db-types">
                  <option value="mysql" />
                  <option value="mariadb" />
                  <option value="mongodb" />
                  <option value="postgres" />
                  <option value="redis" />
                </datalist>
              </div>
              <div>
                <Label htmlFor="internal_port">Internal Port</Label>
                <Input
                  id="internal_port"
                  name="internal_port"
                  type="number"
                  value={formData.internal_port}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="user_port">User Port</Label>
                {isFetchingPorts ? (
                  <div>Fetching available ports...</div>
                ) : availablePorts.length > 0 ? (
                  <select
                    id="user_port"
                    value={selectedPort || ''}
                    onChange={(e) => setSelectedPort(parseInt(e.target.value))}
                    required
                  >
                    {availablePorts.map(port => (
                      <option key={port} value={port}>
                        {port}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div>No available ports found.</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Dynamically render environment variable inputs based on db_type */}
              {formData.db_type && getRequiredEnvVars(formData.db_type).map(varName => (
                <div key={varName} className="flex items-center">
                  <Label htmlFor={varName}>{varName}</Label>
                  <Input
                    id={varName}
                    name={varName}
                    value={formData.env_vars[varName] || ''}
                    onChange={(e) => handleEnvVarChange(varName, e.target.value)}
                    required
                    className="ml-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Database'}
        </Button>
      </form>
    </div>
  )
}

/**
 * Returns the required environment variables based on the database type.
 * Modify this function based on your actual environment variable requirements.
 * 
 * @param dbType - The type of the database (e.g., 'mysql', 'postgres')
 * @returns An array of required environment variable names
 */
function getRequiredEnvVars(dbType: string): string[] {
  switch (dbType.toLowerCase()) {
    case 'mysql':
    case 'mariadb':
      return ['MYSQL_ROOT_PASSWORD']
    case 'mongodb':
      return ['MONGO_INITDB_ROOT_USERNAME', 'MONGO_INITDB_ROOT_PASSWORD']
    case 'postgres':
      return ['POSTGRES_PASSWORD']
    case 'redis':
      return ['REDIS_PASSWORD'] 
    default:
      return []
  }
}