"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronUp, Bug } from "lucide-react"
import type { Message } from "ai"

interface DebugPanelProps {
  messages: Message[]
}

export function DebugPanel({ messages }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (messages.length === 0) return null

  return (
    <Card className="mx-4 mb-4 border-orange-200 bg-orange-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-orange-800 flex items-center gap-2">
            <Bug className="w-4 h-4" />
            Debug Panel
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="text-orange-600 hover:text-orange-800"
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="pt-0">
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {messages.map((message, index) => (
              <div key={message.id || index} className="text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {message.role}
                  </Badge>
                  <span className="text-gray-500">Message {index + 1}</span>
                </div>
                <div className="bg-white p-2 rounded border text-xs font-mono">
                  <div className="text-gray-600 mb-1">Content length: {message.content.length}</div>
                  <div className="max-h-20 overflow-y-auto">
                    {message.content.substring(0, 200)}
                    {message.content.length > 200 && "..."}
                  </div>
                  {message.toolInvocations && (
                    <div className="mt-2 pt-2 border-t">
                      <div className="text-orange-600 font-semibold">Tool Calls:</div>
                      {message.toolInvocations.map((tool, i) => (
                        <div key={i} className="ml-2">
                          <div>Tool: {tool.toolName}</div>
                          <div>State: {tool.state}</div>
                          {tool.result && (
                            <div className="text-green-600">
                              Result: {JSON.stringify(tool.result).substring(0, 100)}...
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
