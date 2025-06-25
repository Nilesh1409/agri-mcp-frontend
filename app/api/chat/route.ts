import { openai } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";
import type { NextRequest } from "next/server";

// Configure OpenAI API key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY is not set");
  throw new Error("OPENAI_API_KEY environment variable is required");
}

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Call a specific tool function on the MCP server through our proxy
async function callMCPTool(toolName: string, params: any) {
  try {
    console.log(
      `🛠️ Calling MCP tool: ${toolName} with params:`,
      JSON.stringify(params, null, 2)
    );

    // Use our proxy route instead of calling MCP server directly

    const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    const response = await fetch(
      `${BASE_URL}/api/mcp-proxy`,

      // const response = await fetch(
      //   `${
      //     process.env.VERCEL_URL
      //       ? `https://${process.env.VERCEL_URL}`
      //       : "http://localhost:3000"
      //   }/api/mcp-proxy`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tool_name: toolName,
          params: params,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log(
      `🎯 MCP tool ${toolName} result:`,
      JSON.stringify(result, null, 2)
    );
    return result;
  } catch (error) {
    console.error(`❌ Error calling MCP tool ${toolName}:`, error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages, location } = await req.json();
    console.log(`📨 Received ${messages.length} messages`);

    // Extract location from the latest message if provided
    console.log(`📨 Received ${messages.length} messages`);
    console.log(`📍 Received location:`, location);
    let userLocation = location;
    // let userLocation = JSON.parse(localStorage.getItem("mcpLocation") || );
    const latestMessage = messages[messages.length - 1]?.content;

    console.log(`🔍 Latest message content:`, latestMessage);

    // Try multiple patterns to extract location info - FIXED REGEX
    const locationPatterns = [
      /Location:\s*([^,\n(]+)\s*$$([^,)]+),\s*([^)]+)$$/,
      /Location:\s*([^,\n(]+)\s*$$([^,)]+),([^)]+)$$/,
      /📍\s*([^,\n(]+)\s*$$([^,)]+),\s*([^)]+)$$/,
      /Location:\s*([^(]+)$$([^,)]+),\s*([^)]+)$$/,
    ];

    for (const pattern of locationPatterns) {
      const match = latestMessage?.match(pattern);
      if (match) {
        userLocation = {
          locationName: match[1].trim(),
          latitude: Number.parseFloat(match[2]),
          longitude: Number.parseFloat(match[3]),
        };
        console.log(`📍 Extracted location using pattern:`, userLocation);
        break;
      }
    }

    // If no location found in message, try to extract from previous messages
    if (!userLocation) {
      for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i]?.content;
        for (const pattern of locationPatterns) {
          const match = message?.match(pattern);
          if (match) {
            userLocation = {
              locationName: match[1].trim(),
              latitude: Number.parseFloat(match[2]),
              longitude: Number.parseFloat(match[3]),
            };
            console.log(`📍 Found location in previous message:`, userLocation);
            break;
          }
        }
        if (userLocation) break;
      }
    }

    // Default to Bengaluru if no location found
    if (!userLocation) {
      userLocation = {
        locationName: "Nairobi, Kenya",
        latitude: 1.2921,
        longitude: 36.8219,
        // 1.2921° S, 36.8219
      };
      console.log(`📍 Using default location: Kenya`);
    }

    // Create the AI response with tools using the new tool() helper
    const result = streamText({
      model: openai("gpt-4o"),
      messages: [
        {
          role: "system",
          content: `You are an environmental data assistant with access to comprehensive agricultural and environmental APIs through MCP server tools.

IMPORTANT: User's location is: ${userLocation.locationName} (Latitude: ${userLocation.latitude}, Longitude: ${userLocation.longitude})

When users ask for environmental data, AUTOMATICALLY call the appropriate tool using these coordinates:
- Latitude: ${userLocation.latitude}
- Longitude: ${userLocation.longitude}

Available tools and when to use them:
- getWeatherData: Current weather information (temperature, humidity, precipitation, wind)

- getPrecipitationData: Historical rainfall data from CHIRPS satellite
- getGroundwaterData: Groundwater storage trends from GRACE satellite
- getSoilMoistureData: Current soil moisture from SMAP satellite
- getCropPrices: Agricultural commodity prices (wheat, rice, corn, etc.) by country
- getCropIdentification: Identify crops in an area (US only)
- getEarthquakeData: Recent seismic activity data
- getComprehensiveFarmData: All-in-one farm analysis combining multiple data sources

ALWAYS use the tools when users ask about environmental data. Don't ask for location - you already have it!

Examples of what to call:
- "What's the weather?" → getWeatherData

- "Precipitation data" or "rainfall" → getPrecipitationData
- "Groundwater" or "water storage" → getGroundwaterData
- "Soil moisture" → getSoilMoistureData
- "Wheat prices in India" → getCropPrices with country="India", commodity="wheat"
- "What crops grow here?" → getCropIdentification
- "Any earthquakes?" → getEarthquakeData
- "Farm analysis" or "comprehensive data" → getComprehensiveFarmData

Be proactive in calling the right tools based on user questions!`,
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
            const lat = latitude || userLocation.latitude;
            const lon = longitude || userLocation.longitude;

            console.log(`🌤️ Getting weather for coordinates: ${lat}, ${lon}`);

            try {
              const data = await callMCPTool("OpenMeteoAPI", {
                latitude: lat,
                longitude: lon,
                current:
                  "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,pressure_msl,cloud_cover,soil_moisture_0_to_1cm",
                hourly: "temperature_2m,relative_humidity_2m",
              });

              if (!data.current) {
                return "❌ No weather data available from the API";
              }

              const current = data.current;
              let response = `🌤️ **Current Weather for ${userLocation.locationName}:**\n\n`;

              if (current.temperature_2m !== undefined)
                response += `🌡️ **Temperature:** ${current.temperature_2m}°C\n`;
              if (current.relative_humidity_2m !== undefined)
                response += `💧 **Humidity:** ${current.relative_humidity_2m}%\n`;
              if (current.precipitation !== undefined)
                response += `🌧️ **Precipitation:** ${current.precipitation} mm\n`;
              if (current.wind_speed_10m !== undefined)
                response += `💨 **Wind Speed:** ${current.wind_speed_10m} km/h\n`;

              response += `\n📍 **Location:** ${userLocation.locationName} (${lat}, ${lon})`;
              response += `\n🕐 **Retrieved at:** ${new Date().toLocaleString()}`;

              return response;
            } catch (error) {
              console.error("Weather tool error:", error);
              return `❌ Error getting weather data: ${error.message}`;
            }
          },
        }),

        // getSoilData: tool({
        //   description: "Get soil composition and properties data",
        //   parameters: z.object({
        //     latitude: z.number().optional().describe("Latitude coordinate"),
        //     longitude: z.number().optional().describe("Longitude coordinate"),
        //   }),
        //   execute: async ({ latitude, longitude }) => {
        //     const lat = latitude || userLocation.latitude;
        //     const lon = longitude || userLocation.longitude;

        //     console.log(`🌱 Getting soil data for coordinates: ${lat}, ${lon}`);

        //     try {
        //       const data = await callMCPTool("SoilGridsAPI", {
        //         lat: lat,
        //         lon: lon,
        //         property: "sand,clay,silt,soc,phh2o",
        //         depth: "0-5cm,5-15cm,15-30cm",
        //       });

        //       if (!data.properties) {
        //         return "❌ No soil data available from the API";
        //       }

        //       let response = `🌱 **Soil Properties for ${userLocation.locationName}:**\n\n`;

        //       for (const [propName, propData] of Object.entries(
        //         data.properties
        //       )) {
        //         if (
        //           propData &&
        //           typeof propData === "object" &&
        //           "depths" in propData
        //         ) {
        //           response += `🔬 **${propName.toUpperCase()}**\n`;
        //           for (const [depth, value] of Object.entries(
        //             propData.depths
        //           )) {
        //             response += `  • ${depth}: ${
        //               value !== null ? value : "No data"
        //             }\n`;
        //           }
        //           response += `\n`;
        //         }
        //       }

        //       response += `📍 **Location:** ${userLocation.locationName} (${lat}, ${lon})`;
        //       response += `\n🕐 **Retrieved at:** ${new Date().toLocaleString()}`;

        //       return response;
        //     } catch (error) {
        //       console.error("Soil tool error:", error);
        //       return `❌ Error getting soil data: ${error.message}`;
        //     }
        //   },
        // }),

        getPrecipitationData: tool({
          description: "Get historical precipitation data from CHIRPS",
          parameters: z.object({
            latitude: z.number().optional().describe("Latitude coordinate"),
            longitude: z.number().optional().describe("Longitude coordinate"),
            startDate: z
              .string()
              .optional()
              .describe("Start date in YYYY-MM-DD format"),
            endDate: z
              .string()
              .optional()
              .describe("End date in YYYY-MM-DD format"),
          }),
          execute: async ({ latitude, longitude, startDate, endDate }) => {
            const lat = latitude || userLocation.latitude;
            const lon = longitude || userLocation.longitude;

            console.log(
              `🌧️ Getting precipitation data for coordinates: ${lat}, ${lon}`
            );

            try {
              const data = await callMCPTool("CHIRPSPrecipitation", {
                lat: lat,
                lon: lon,
                start_date: startDate || "2024-01-01",
                end_date: endDate || new Date().toISOString().split("T")[0],
                temporal_resolution: "monthly",
              });

              let response = `🌧️ **Precipitation Data for ${userLocation.locationName}:**\n\n`;

              if (data.monthly_total !== undefined) {
                response += `📊 **Monthly Total:** ${data.monthly_total} mm\n`;
              }
              if (data.anomaly_percent !== undefined) {
                response += `📈 **Anomaly:** ${data.anomaly_percent}%\n`;
              }

              response += `\n📍 **Location:** ${userLocation.locationName} (${lat}, ${lon})`;
              response += `\n🕐 **Retrieved at:** ${new Date().toLocaleString()}`;

              return response;
            } catch (error) {
              console.error("Precipitation tool error:", error);
              return `❌ Error getting precipitation data: ${error.message}`;
            }
          },
        }),

        getGroundwaterData: tool({
          description:
            "Get groundwater storage trends from GRACE satellite data",
          parameters: z.object({
            latitude: z.number().optional().describe("Latitude coordinate"),
            longitude: z.number().optional().describe("Longitude coordinate"),
          }),
          execute: async ({ latitude, longitude }) => {
            const lat = latitude || userLocation.latitude;
            const lon = longitude || userLocation.longitude;

            console.log(
              `💧 Getting groundwater data for coordinates: ${lat}, ${lon}`
            );

            try {
              const data = await callMCPTool("GRACEGroundwater", {
                lat: lat,
                lon: lon,
                start_date: "2024-01-01",
                end_date: new Date().toISOString().split("T")[0],
              });

              let response = `💧 **Groundwater Data for ${userLocation.locationName}:**\n\n`;

              if (data.groundwater_storage_cm !== undefined) {
                response += `📊 **Storage:** ${data.groundwater_storage_cm} cm\n`;
              }
              if (data.storage_anomaly_cm !== undefined) {
                response += `📈 **Anomaly:** ${data.storage_anomaly_cm} cm\n`;
              }
              if (data.trend_cm_per_year !== undefined) {
                response += `📉 **Trend:** ${data.trend_cm_per_year} cm/year\n`;
              }

              response += `\n📍 **Location:** ${userLocation.locationName} (${lat}, ${lon})`;
              response += `\n🕐 **Retrieved at:** ${new Date().toLocaleString()}`;

              return response;
            } catch (error) {
              console.error("Groundwater tool error:", error);
              return `❌ Error getting groundwater data: ${error.message}`;
            }
          },
        }),

        getSoilMoistureData: tool({
          description: "Get satellite soil moisture data from SMAP",
          parameters: z.object({
            latitude: z.number().optional().describe("Latitude coordinate"),
            longitude: z.number().optional().describe("Longitude coordinate"),
          }),
          execute: async ({ latitude, longitude }) => {
            const lat = latitude || userLocation.latitude;
            const lon = longitude || userLocation.longitude;

            console.log(
              `🌱 Getting SMAP soil moisture for coordinates: ${lat}, ${lon}`
            );

            try {
              const data = await callMCPTool("SMAPSoilMoisture", {
                lat: lat,
                lon: lon,
                date: new Date().toISOString().split("T")[0],
                product: "SPL3SMP",
              });

              let response = `🌱 **Soil Moisture Data (SMAP) for ${userLocation.locationName}:**\n\n`;

              if (data.soil_moisture !== undefined) {
                response += `💧 **Soil Moisture:** ${data.soil_moisture}\n`;
              }
              if (data.soil_moisture_anomaly !== undefined) {
                response += `📊 **Anomaly:** ${data.soil_moisture_anomaly}\n`;
              }
              if (data.vegetation_opacity !== undefined) {
                response += `🌿 **Vegetation Opacity:** ${data.vegetation_opacity}\n`;
              }
              if (data.quality_flag !== undefined) {
                response += `✅ **Quality:** ${data.quality_flag}\n`;
              }

              response += `\n📍 **Location:** ${userLocation.locationName} (${lat}, ${lon})`;
              response += `\n🕐 **Retrieved at:** ${new Date().toLocaleString()}`;

              return response;
            } catch (error) {
              console.error("SMAP tool error:", error);
              return `❌ Error getting soil moisture data: ${error.message}`;
            }
          },
        }),

        getCropPrices: tool({
          description: "Get agricultural commodity prices from FAO",
          parameters: z.object({
            country: z
              .string()
              .describe("Country name (e.g., India, USA, China)"),
            commodity: z
              .string()
              .describe("Commodity name (e.g., wheat, rice, corn, soybeans)"),
          }),
          execute: async ({ country, commodity }) => {
            console.log(`💰 Getting ${commodity} prices for ${country}`);

            try {
              const data = await callMCPTool("FAOPriceData", {
                country: country,
                commodity: commodity,
              });

              let response = `💰 **Agricultural Prices for ${userLocation.locationName}:**\n\n`;

              response += `🌾 **Commodity:** ${
                commodity.charAt(0).toUpperCase() + commodity.slice(1)
              }\n`;
              response += `🌍 **Country:** ${country}\n`;

              if (data.price_usd_per_tonne !== undefined) {
                response += `💵 **Price:** $${data.price_usd_per_tonne} per tonne\n`;
              }
              if (data.date !== undefined) {
                response += `📅 **Date:** ${data.date}\n`;
              }

              response += `\n🕐 **Retrieved at:** ${new Date().toLocaleString()}`;

              return response;
            } catch (error) {
              console.error("FAO price tool error:", error);
              return `❌ Error getting price data: ${error.message}`;
            }
          },
        }),

        getCropIdentification: tool({
          description:
            "Identify crops in an area using USDA CropScape (US only)",
          parameters: z.object({
            latitude: z.number().optional().describe("Latitude coordinate"),
            longitude: z.number().optional().describe("Longitude coordinate"),
          }),
          execute: async ({ latitude, longitude }) => {
            const lat = latitude || userLocation.latitude;
            const lon = longitude || userLocation.longitude;

            console.log(
              `🌾 Getting crop identification for coordinates: ${lat}, ${lon}`
            );

            try {
              const data = await callMCPTool("USDACropScape", {
                lat: lat,
                lon: lon,
              });

              let response = `🌾 **Crop Identification for ${userLocation.locationName}:**\n\n`;

              if (data.dominant_crop !== undefined) {
                response += `🌱 **Dominant Crop:** ${data.dominant_crop}\n`;
              }
              if (data.confidence_score !== undefined) {
                response += `📊 **Confidence:** ${data.confidence_score}\n`;
              }
              if (data.year !== undefined) {
                response += `📅 **Year:** ${data.year}\n`;
              }

              response += `\n📍 **Location:** ${userLocation.locationName} (${lat}, ${lon})`;
              response += `\n🕐 **Retrieved at:** ${new Date().toLocaleString()}`;

              return response;
            } catch (error) {
              console.error("Crop identification tool error:", error);
              return `❌ Error getting crop identification: ${error.message}`;
            }
          },
        }),

        getEarthquakeData: tool({
          description: "Get recent earthquake data from USGS",
          parameters: z.object({
            latitude: z.number().optional().describe("Latitude coordinate"),
            longitude: z.number().optional().describe("Longitude coordinate"),
            radiusKm: z
              .number()
              .optional()
              .describe("Search radius in kilometers"),
          }),
          execute: async ({ latitude, longitude, radiusKm }) => {
            const lat = latitude || userLocation.latitude;
            const lon = longitude || userLocation.longitude;
            const radius = radiusKm || 100;

            console.log(
              `🌍 Getting earthquake data for coordinates: ${lat}, ${lon}`
            );

            try {
              const data = await callMCPTool("USGS_Earthquake_API", {
                latitude: lat,
                longitude: lon,
                maxradiuskm: radius,
              });

              let response = `🌍 **Earthquake Data near ${userLocation.locationName}:**\n\n`;

              if (data.earthquake_count !== undefined) {
                response += `📊 **Count:** ${data.earthquake_count} earthquakes\n`;
              }
              if (data.date_range_queried) {
                response += `📅 **Period:** ${data.date_range_queried.start} to ${data.date_range_queried.end}\n`;
              }
              if (data.location_queried) {
                response += `📍 **Search Radius:** ${data.location_queried.radius_km} km\n`;
              }

              if (data.earthquakes && data.earthquakes.length > 0) {
                response += `\n🚨 **Recent Earthquakes:**\n`;
                data.earthquakes.slice(0, 5).forEach((eq, index) => {
                  response += `${index + 1}. Magnitude ${eq.magnitude} - ${
                    eq.place
                  }\n`;
                });
              } else {
                response += `\n✅ **No recent earthquakes detected in the area**\n`;
              }

              response += `\n📍 **Location:** ${userLocation.locationName} (${lat}, ${lon})`;
              response += `\n🕐 **Retrieved at:** ${new Date().toLocaleString()}`;

              return response;
            } catch (error) {
              console.error("Earthquake tool error:", error);
              return `❌ Error getting earthquake data: ${error.message}`;
            }
          },
        }),

        getComprehensiveFarmData: tool({
          description:
            "Get comprehensive farm analysis with multiple data sources",
          parameters: z.object({
            latitude: z.number().optional().describe("Latitude coordinate"),
            longitude: z.number().optional().describe("Longitude coordinate"),
          }),
          execute: async ({ latitude, longitude }) => {
            const lat = latitude || userLocation.latitude;
            const lon = longitude || userLocation.longitude;

            console.log(
              `🚜 Getting comprehensive farm data for coordinates: ${lat}, ${lon}`
            );

            try {
              const data = await callMCPTool("ComprehensiveFarmData", {
                lat: lat,
                lon: lon,
              });

              let response = `🚜 **Comprehensive Farm Analysis for ${userLocation.locationName}:**\n\n`;

              if (data.precipitation) {
                response += `🌧️ **Precipitation:** ${
                  data.precipitation.monthly_total || "N/A"
                } mm (monthly)\n`;
              }
              if (data.soil_moisture) {
                response += `🌱 **Soil Moisture:** ${
                  data.soil_moisture.soil_moisture || "N/A"
                }\n`;
              }
              if (data.groundwater) {
                response += `💧 **Groundwater:** ${
                  data.groundwater.groundwater_storage_cm || "N/A"
                } cm\n`;
              }
              if (data.crop_identification) {
                response += `🌾 **Crop:** ${
                  data.crop_identification.dominant_crop || "N/A"
                }\n`;
              }
              if (data.crop_prices) {
                response += `💰 **Price:** $${
                  data.crop_prices.price_usd_per_tonne || "N/A"
                }/tonne\n`;
              }

              response += `\n📍 **Location:** ${userLocation.locationName} (${lat}, ${lon})`;
              response += `\n🕐 **Retrieved at:** ${new Date().toLocaleString()}`;

              return response;
            } catch (error) {
              console.error("Comprehensive farm data tool error:", error);
              return `❌ Error getting comprehensive farm data: ${error.message}`;
            }
          },
        }),
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("❌ Chat API Error:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to process request",
        message: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
