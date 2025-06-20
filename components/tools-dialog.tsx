"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Wrench, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ToolsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Tool {
  name: string
  description: string
  parameters?: Record<string, any>
}

interface ToolsResponse {
  success: boolean
  free_tools: Tool[]
  premium_tools: Tool[]
  error?: string
}

export function ToolsDialog({ open, onOpenChange }: ToolsDialogProps) {
  const [tools, setTools] = useState<ToolsResponse>({
    success: false,
    free_tools: [],
    premium_tools: [],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      fetchTools()
    }
  }, [open])

  const fetchTools = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/tools")

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: ToolsResponse = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch tools")
      }

      setTools(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch tools"
      setError(errorMessage)
      console.error("Error fetching tools:", err)
    } finally {
      setLoading(false)
    }
  }

  const categorizeTools = (toolsList: Tool[]) => {
    const categories: Record<string, Tool[]> = {
      "Weather & Climate": [],
      Precipitation: [],
      "Soil & Water": [],
      Groundwater: [],
      "Satellite Data": [],
      "Agricultural Data": [],
      Other: [],
    }

    toolsList.forEach((tool) => {
      const name = tool.name.toLowerCase()
      const desc = tool.description.toLowerCase()

      if (
        name.includes("meteo") ||
        name.includes("weather") ||
        name.includes("nasa_power") ||
        name.includes("climate")
      ) {
        categories["Weather & Climate"].push(tool)
      } else if (name.includes("chirps") || desc.includes("precipitation") || desc.includes("rainfall")) {
        categories["Precipitation"].push(tool)
      } else if (name.includes("soil") || name.includes("smap") || desc.includes("soil")) {
        categories["Soil & Water"].push(tool)
      } else if (name.includes("grace") || desc.includes("groundwater")) {
        categories["Groundwater"].push(tool)
      } else if (name.includes("sentinel") || desc.includes("satellite")) {
        categories["Satellite Data"].push(tool)
      } else if (
        name.includes("fao") ||
        name.includes("crop") ||
        name.includes("usda") ||
        desc.includes("agricultural") ||
        desc.includes("farm")
      ) {
        categories["Agricultural Data"].push(tool)
      } else {
        categories["Other"].push(tool)
      }
    })

    return categories
  }

  const getToolIcon = (categoryName: string) => {
    const icons: Record<string, string> = {
      "Weather & Climate": "🌤️",
      Precipitation: "🌧️",
      "Soil & Water": "🌱",
      Groundwater: "💧",
      "Satellite Data": "🛰️",
      "Agricultural Data": "🌾",
      Other: "🔧",
    }
    return icons[categoryName] || "•"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-600" />
            Available Tools & Data Sources
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span>Loading tools from MCP server...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <p className="text-red-600 mb-4">❌ Error: {error}</p>
              <Button onClick={fetchTools} variant="outline">
                Try Again
              </Button>
            </div>
          ) : (
            <>
              {tools.free_tools.length > 0 && (
                <>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      ✅ Free Tools ({tools.free_tools.length} available)
                    </Badge>
                  </div>

                  {Object.entries(categorizeTools(tools.free_tools)).map(([category, categoryTools]) => {
                    if (categoryTools.length === 0) return null

                    return (
                      <div key={category} className="space-y-3">
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                          {getToolIcon(category)} {category}
                        </h3>
                        <div className="space-y-2 pl-4">
                          {categoryTools.map((tool) => (
                            <div key={tool.name} className="flex items-start gap-3 p-2 rounded-lg bg-gray-50">
                              <span className="text-lg">{getToolIcon(category)}</span>
                              <div>
                                <p className="font-medium text-sm">{tool.name}</p>
                                <p className="text-xs text-gray-600">{tool.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <Separator />
                      </div>
                    )
                  })}
                </>
              )}

              {tools.premium_tools.length > 0 && (
                <>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                      💎 Premium Tools ({tools.premium_tools.length} available)
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {tools.premium_tools.map((tool) => (
                      <div key={tool.name} className="flex items-start gap-3 p-2 rounded-lg bg-amber-50">
                        <span className="text-lg">💎</span>
                        <div>
                          <p className="font-medium text-sm">{tool.name}</p>
                          <p className="text-xs text-gray-600">{tool.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {tools.free_tools.length === 0 && tools.premium_tools.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Wrench className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No tools available from the MCP server.</p>
                  <Button onClick={fetchTools} variant="outline" className="mt-4">
                    Refresh
                  </Button>
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">💡 How to Use</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Just ask natural questions like "What's the weather?" or "Show me soil data"</li>
                  <li>• I'll automatically choose the best tool and parameters for your query</li>
                  <li>• All data is location-specific based on your coordinates</li>
                  <li>• I maintain conversation context for follow-up questions</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
