'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"

export function Settings() {
  const [apiUrl, setApiUrl] = useState('http://localhost:8000')

  const saveSettings = () => {
    // In a real application, you would save this to some form of persistent storage
    localStorage.setItem('apiUrl', apiUrl)
    toast({
      title: "Success",
      description: "Settings saved successfully",
    })
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="api-url">API URL</Label>
              <Input
                id="api-url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="Enter API URL"
              />
            </div>
            <Button onClick={saveSettings}>Save Settings</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}