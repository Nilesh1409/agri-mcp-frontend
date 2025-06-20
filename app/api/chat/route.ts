import { openai } from "@ai-sdk/openai"
import { streamText, tool } from "ai"
import { z } from "zod"
import type { NextRequest } from "next/server"

// Configure OpenAI API key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY is not set")
  throw new Error("OPENAI_API_KEY environment variable is required")
}

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

// Call a specific tool function on the MCP server through our proxy
async function callMCPTool(toolName: string, params: any) {
  try {
    console.log(`🛠️ Calling MCP tool: ${toolName} with params:`, JSON.stringify(params, null, 2))

    // Use our proxy route instead of calling MCP server directly
    const response = await fetch(
      `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"}/api/mcp-proxy`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tool_name: toolName,
          params: params,
        }),
      },
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    const result = await response.json()
    console.log(`🎯 MCP tool ${toolName} result:`, JSON.stringify(result, null, 2))
    return result
  } catch (error) {
    console.error(`❌ Error calling MCP tool ${toolName}:`, error)
    throw error
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()
    console.log(`📨 Received ${messages.length} messages`)

    // Extract location from the latest message if provided
    let userLocation = null
    const latestMessage = messages[messages.length - 1]?.content

    console.log(`🔍 Latest message content:`, latestMessage)

    // Try multiple patterns to extract location info - FIXED REGEX
    const locationPatterns = [
      /Location:\s*([^,\n(]+)\s*$$([^,)]+),\s*([^)]+)$$/,
      /Location:\s*([^,\n(]+)\s*$$([^,)]+),([^)]+)$$/,
      /📍\s*([^,\n(]+)\s*$$([^,)]+),\s*([^)]+)$$/,
      /Location:\s*([^(]+)$$([^,)]+),\s*([^)]+)$$/,
    ]

    for (const pattern of locationPatterns) {
      const match = latestMessage?.match(pattern)
      if (match) {
        userLocation = {
          locationName: match[1].trim(),
          latitude: Number.parseFloat(match[2]),
          longitude: Number.parseFloat(match[3]),
        }
        console.log(`📍 Extracted location using pattern:`, userLocation)
        break
      }
    }

    // If no location found in message, try to extract from previous messages
    if (!userLocation) {
      for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i]?.content
        for (const pattern of locationPatterns) {
          const match = message?.match(pattern)
          if (match) {
            userLocation = {
              locationName: match[1].trim(),
              latitude: Number.parseFloat(match[2]),
              longitude: Number.parseFloat(match[3]),
            }
            console.log(`📍 Found location in previous message:`, userLocation)
            break
          }
        }
        if (userLocation) break
      }
    }

    // Default to Bengaluru if no location found
    if (!userLocation) {
      userLocation = {
        locationName: "Bengaluru, India",
        latitude: 12.9716,
        longitude: 77.5946,
      }
      console.log(`📍 Using default location: Bengaluru`)
    }

    // Create the AI response with tools using the new tool() helper
    const result = streamText({
      model: openai("gpt-4o"),
      messages: [
        {
          role: "system",
          content: `You are an environmental data assistant with access to real environmental APIs through MCP server tools.

IMPORTANT: User's location is: ${userLocation.locationName} (Latitude: ${userLocation.latitude}, Longitude: ${userLocation.longitude})

When users ask for environmental data like weather, soil, precipitation, etc., AUTOMATICALLY call the appropriate tool using these coordinates:
- Latitude: ${userLocation.latitude}
- Longitude: ${userLocation.longitude}

Available tools:
- getWeatherData: Get current weather information using OpenMeteo API
- getSoilData: Get soil composition and health data using SoilGrids API

You should ALWAYS use the tools when users ask about environmental data. Don't ask for location - you already have it!`,
        },
        ...messages,
      ],
      tools: {
        getWeatherData: tool({
          description: "Get current weather data from OpenMeteo API",
          parameters: z.object({
            latitude: z.number().optional().describe("Latitude coordinate"),
            longitude: z.number().optional().describe("Longitude coordinate"),
          }),
          execute: async ({ latitude, longitude }) => {
            // Always use the user location
            const lat = latitude || userLocation.latitude
            const lon = longitude || userLocation.longitude

            console.log(`🌤️ Getting weather for coordinates: ${lat}, ${lon}`)

            try {
              const data = await callMCPTool("OpenMeteoAPI", {
                latitude: lat,
                longitude: lon,
                current: "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code",
              })

              if (!data.current) {
                return "❌ No weather data available from the API"
              }

              const current = data.current
              let response = `🌤️ **Current Weather for ${userLocation.locationName}:**\n\n`

              if (current.temperature_2m !== undefined) response += `🌡️ **Temperature:** ${current.temperature_2m}°C\n`
              if (current.relative_humidity_2m !== undefined)
                response += `💧 **Humidity:** ${current.relative_humidity_2m}%\n`
              if (current.precipitation !== undefined) response += `🌧️ **Precipitation:** ${current.precipitation} mm\n`
              if (current.wind_speed_10m !== undefined)
                response += `💨 **Wind Speed:** ${current.wind_speed_10m} km/h\n`

              response += `\n📍 **Location:** ${userLocation.locationName} (${lat}, ${lon})`
              response += `\n🕐 **Retrieved at:** ${new Date().toLocaleString()}`

              return response
            } catch (error) {
              console.error("Weather tool error:", error)
              return `❌ Error getting weather data: ${error.message}`
            }
          },
        }),

        getSoilData: tool({
          description: "Get soil composition and properties data",
          parameters: z.object({
            latitude: z.number().optional().describe("Latitude coordinate"),
            longitude: z.number().optional().describe("Longitude coordinate"),
          }),
          execute: async ({ latitude, longitude }) => {
            // Always use the user location
            const lat = latitude || userLocation.latitude
            const lon = longitude || userLocation.longitude

            console.log(`🌱 Getting soil data for coordinates: ${lat}, ${lon}`)

            try {
              const data = await callMCPTool("SoilGridsAPI", {
                lat: lat,
                lon: lon,
                property: "sand,clay,silt,soc,phh2o",
                depth: "0-5cm,5-15cm,15-30cm",
              })

              if (!data.properties) {
                return "❌ No soil data available from the API"
              }

              let response = `🌱 **Soil Properties for ${userLocation.locationName}:**\n\n`

              for (const [propName, propData] of Object.entries(data.properties)) {
                if (propData && typeof propData === "object" && "depths" in propData) {
                  response += `🔬 **${propName.toUpperCase()}**\n`
                  for (const [depth, value] of Object.entries(propData.depths)) {
                    response += `  • ${depth}: ${value !== null ? value : "No data"}\n`
                  }
                  response += `\n`
                }
              }

              response += `📍 **Location:** ${userLocation.locationName} (${lat}, ${lon})`
              response += `\n🕐 **Retrieved at:** ${new Date().toLocaleString()}`

              return response
            } catch (error) {
              console.error("Soil tool error:", error)
              return `❌ Error getting soil data: ${error.message}`
            }
          },
        }),
      },
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error("❌ Chat API Error:", error)

    return new Response(
      JSON.stringify({
        error: "Failed to process request",
        message: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
