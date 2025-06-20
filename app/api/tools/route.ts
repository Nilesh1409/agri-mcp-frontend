import type { NextRequest } from "next/server";

const MCP_SERVER_URL = "http://18.61.195.193:8010";

// Function to call the live MCP server through our proxy
async function callMCPServer(endpoint: string, options?: RequestInit) {
  try {
    console.log(`🔄 Calling MCP server: ${MCP_SERVER_URL}${endpoint}`);

    const response = await fetch(`${MCP_SERVER_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        ...options?.headers,
      },
    });

    console.log(`✅ MCP server response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `❌ MCP Server error: ${response.status} ${response.statusText}`,
        errorText
      );
      throw new Error(
        `MCP Server error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log(`📊 MCP server response data:`, data);
    return data;
  } catch (error) {
    console.error(`❌ Error calling MCP server ${endpoint}:`, error);
    throw error;
  }
}

export async function GET(req: NextRequest) {
  try {
    // Fetch both free and premium tools
    const [freeResponse, premiumResponse] = await Promise.all([
      callMCPServer("/v1/tools/free"),
      callMCPServer("/v1/tools/premium"),
    ]);

    return Response.json({
      success: true,
      free_tools: freeResponse.free_tools || [],
      premium_tools: premiumResponse.premium_tools || [],
    });
  } catch (error) {
    console.error("Error fetching tools:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch tools",
        free_tools: [],
        premium_tools: [],
      },
      { status: 500 }
    );
  }
}
