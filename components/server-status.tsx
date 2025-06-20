"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, CheckCircle, XCircle } from "lucide-react"

interface ServerStatus {
  success: boolean
  mcpServer?: any
  error?: string
  timestamp: string
}

export function ServerStatus() {
  const [status, setStatus] = useState<ServerStatus | null>(null)
  const [loading, setLoading] = useState(false)

  const checkHealth = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/mcp-health")
      const data: ServerStatus = await response.json()
      setStatus(data)
    } catch (error) {
      setStatus({
        success: false,
        error: "Failed to check server status",
        timestamp: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  return (
    <div className="flex items-center gap-2">
      {status ? (
        <>
          {status.success ? (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              MCP Server Online
            </Badge>
          ) : (
            <Badge variant="destructive">
              <XCircle className="w-3 h-3 mr-1" />
              MCP Server Offline
            </Badge>
          )}
        </>
      ) : (
        <Badge variant="outline">Checking...</Badge>
      )}

      <Button variant="ghost" size="sm" onClick={checkHealth} disabled={loading} className="h-6 w-6 p-0">
        <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
      </Button>
    </div>
  )
}
