'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

import { uniqueNamesGenerator, Config, adjectives as adjectives2, colors, animals } from 'unique-names-generator';
import { API_URL } from '@/lib/api'

type DatabaseRequest = {
  db_type: string
  name: string
  user_port: number
  internal_port?: number | null
  env_vars: Record<string, string>
}

const API_BASE_URL = API_URL

const database_configs = {
  mysql: {
    image: "mysql:latest",
    internal_port: 3306,
    required_env_vars: ["MYSQL_ROOT_PASSWORD"],
    optional_env_vars: ["MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD"],
    cmd: []
  },
  postgresql: {
    image: "postgres:latest",
    internal_port: 5432,
    required_env_vars: ["POSTGRES_PASSWORD"],
    optional_env_vars: ["POSTGRES_USER", "POSTGRES_DB"],
    cmd: []
  },
  mongodb: {
    image: "mongo:latest",
    internal_port: 27017,
    required_env_vars: [],
    optional_env_vars: ["MONGO_INITDB_ROOT_USERNAME", "MONGO_INITDB_ROOT_PASSWORD"],
    cmd: []
  },
  redis: {
    image: "redis:latest",
    internal_port: 6379,
    required_env_vars: ["REDIS_PASSWORD"],
    optional_env_vars: [],
    cmd: []
  },
  mariadb: {
    image: "mariadb:latest",
    internal_port: 3306,
    required_env_vars: ["MYSQL_ROOT_PASSWORD"],
    optional_env_vars: ["MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD"],
    cmd: []
  }
}

const nameConfig: Config = {
  dictionaries: [adjectives2, colors, animals],
  separator: '-',
  length: 3,
};

function generateRandomName() {
  return uniqueNamesGenerator(nameConfig);
}

function generateRandomString(length: number) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({length}, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function DatabaseManager() {
  const router = useRouter()
  const [newDatabase, setNewDatabase] = useState<DatabaseRequest>({
    db_type: 'mysql',
    name: generateRandomName(),
    user_port: 3306,
    internal_port: null,
    env_vars: {}
  })
  const [isLoading, setIsLoading] = useState(false)
  const [availablePorts, setAvailablePorts] = useState<number[]>([])
  const [isFetchingPorts, setIsFetchingPorts] = useState(false)

  useEffect(() => {
    // Reset env_vars when db_type changes and generate random values
    const config = database_configs[newDatabase.db_type as keyof typeof database_configs]
    const newEnvVars: Record<string, string> = {}
    
    config.required_env_vars.forEach(envVar => {
      if (envVar.includes('PASSWORD')) {
        newEnvVars[envVar] = generateRandomString(20)
      } else if (envVar.includes('USER')) {
        newEnvVars[envVar] = generateRandomString(10)
      }
    })

    config.optional_env_vars.forEach(envVar => {
      if (envVar.includes('DATABASE')) {
        newEnvVars[envVar] = generateRandomName().replace(/-/g, '_')
      } else if (envVar.includes('PASSWORD')) {
        newEnvVars[envVar] = generateRandomString(20)
      } else if (envVar.includes('USER')) {
        newEnvVars[envVar] = generateRandomString(10)
      }
    })

    setNewDatabase(prev => ({
      ...prev,
      name: generateRandomName(),
      env_vars: newEnvVars,
      internal_port: config.internal_port
    }))

    // Fetch available ports when db_type changes
    fetchAvailablePorts(config.internal_port)
  }, [newDatabase.db_type])

  const fetchAvailablePorts = useCallback(async (internalPort: number) => {
    setIsFetchingPorts(true)
    try {
      const response = await fetch(`${API_BASE_URL}/get-free-ports/${internalPort}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to fetch available ports')
      const ports: number[] = await response.json()
      setAvailablePorts(ports)
      setNewDatabase(prev => ({ ...prev, user_port: ports[0] }))
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to fetch available ports',
        variant: "destructive",
      })
    } finally {
      setIsFetchingPorts(false)
    }
  }, [API_BASE_URL])

  const createDatabase = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/databases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDatabase),
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to create database')
   
      const data = await response.json()
      console.log(data)
      toast({
        title: "Success",
        description: "Database created successfully",
      })

      // Redirect to the new database page
      router.push(`/`)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create database',
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEnvVarChange = (key: string, value: string) => {
    setNewDatabase(prev => ({
      ...prev,
      env_vars: {
        ...prev.env_vars,
        [key]: value
      }
    }))
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Database Manager</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Create New Database</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="db_type">Database Type</Label>
              <Select 
                onValueChange={(value) => setNewDatabase({...newDatabase, db_type: value})}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select database type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(database_configs).map((dbType) => (
                    <SelectItem key={dbType} value={dbType}>{dbType}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newDatabase.name}
                onChange={(e) => setNewDatabase({...newDatabase, name: e.target.value})}
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="user_port">Public Port</Label>
              <Select
                onValueChange={(value) => setNewDatabase({...newDatabase, user_port: parseInt(value)})}
                disabled={isLoading || isFetchingPorts}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isFetchingPorts ? "Fetching free ports..." : "Select Public port"} />
                </SelectTrigger>
                <SelectContent>
                  {availablePorts.map((port) => (
                    <SelectItem key={port} value={port.toString()}>{port}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="internal_port">Internal Port</Label>
              <Input
                id="internal_port"
                type="number"
                value={newDatabase.internal_port || ''}
                onChange={(e) => setNewDatabase({...newDatabase, internal_port: e.target.value ? parseInt(e.target.value) : null})}
                disabled={true}
              />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Environment Variables</h3>
            {database_configs[newDatabase.db_type as keyof typeof database_configs].required_env_vars.map((envVar) => (
              <div key={envVar} className="mb-2">
                <Label htmlFor={envVar}>{envVar} (Required)</Label>
                <Input
                  id={envVar}
                  value={newDatabase.env_vars[envVar] || ''}
                  onChange={(e) => handleEnvVarChange(envVar, e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            ))}
            {database_configs[newDatabase.db_type as keyof typeof database_configs].optional_env_vars.map((envVar) => (
              <div key={envVar} className="mb-2">
                <Label htmlFor={envVar}>{envVar} (Optional)</Label>
                <Input
                  id={envVar}
                  value={newDatabase.env_vars[envVar] || ''}
                  onChange={(e) => handleEnvVarChange(envVar, e.target.value)}
                  disabled={isLoading}
                />
              </div>
            ))}
          </div>
          <Button className="mt-4" onClick={createDatabase} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Database...
              </>
            ) : (
              'Create Database'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}