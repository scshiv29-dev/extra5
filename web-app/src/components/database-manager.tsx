'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import Link from 'next/link'
import { uniqueNamesGenerator, Config, adjectives as adjectives2, colors, animals } from 'unique-names-generator';

type Database = {
  name: string
  db_type: string
  user_port: number
  status: string
}

type DatabaseRequest = {
  db_type: string
  name: string
  user_port: number
  internal_port?: number | null
  env_vars: Record<string, string>
}

const API_BASE_URL = 'https://8000-scshiv29dev-extra5-ya3ucv0dc80.ws-us116.gitpod.io'

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
    required_env_vars: [],
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

// Removed unnecessary arrays
// const adjectives = ['happy', 'clever', 'brave', 'calm', 'eager', 'fair', 'kind', 'proud', 'wise', 'zesty']
// const nouns = ['apple', 'bear', 'cat', 'dog', 'eagle', 'fox', 'goat', 'horse', 'iguana', 'jaguar']
// const verbs = ['jumps', 'runs', 'flies', 'swims', 'dances', 'sings', 'laughs', 'dreams', 'thinks', 'creates']

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
  const [databases, setDatabases] = useState<Database[]>([])
  const [newDatabase, setNewDatabase] = useState<DatabaseRequest>({
    db_type: 'mysql',
    name: generateRandomName(),
    user_port: 3306,
    internal_port: null,
    env_vars: {}
  })

  useEffect(() => {
    fetchDatabases()
  }, [])

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
  }, [newDatabase.db_type])

  const fetchDatabases = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/databases`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to fetch databases')
      const data = await response.json()
      setDatabases(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch databases",
        variant: "destructive",
      })
    }
  }

  const createDatabase = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/databases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDatabase),
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to create database')
      await fetchDatabases()
      toast({
        title: "Success",
        description: "Database created successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create database",
        variant: "destructive",
      })
    }
  }

  const deleteDatabase = async (name: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/databases/${name}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to delete database')
      await fetchDatabases()
      toast({
        title: "Success",
        description: "Database deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete database",
        variant: "destructive",
      })
    }
  }

  const updateDatabaseStatus = async (name: string, newStatus: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/databases/${name}/status?new_status=${newStatus}`, {
        method: 'PUT',
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to update database status')
      await fetchDatabases()
      toast({
        title: "Success",
        description: "Database status updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update database status",
        variant: "destructive",
      })
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
              <Select onValueChange={(value) => setNewDatabase({...newDatabase, db_type: value})}>
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
              />
            </div>
            <div>
              <Label htmlFor="user_port">User Port</Label>
              <Input
                id="user_port"
                type="number"
                value={newDatabase.user_port}
                onChange={(e) => setNewDatabase({...newDatabase, user_port: parseInt(e.target.value)})}
              />
            </div>
            <div>
              <Label htmlFor="internal_port">Internal Port</Label>
              <Input
                id="internal_port"
                type="number"
                value={newDatabase.internal_port || ''}
                onChange={(e) => setNewDatabase({...newDatabase, internal_port: e.target.value ? parseInt(e.target.value) : null})}
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
                />
              </div>
            ))}
          </div>
          <Button className="mt-4" onClick={createDatabase}>Create Database</Button>
        </CardContent>
      </Card>
    </div>
  )
}