import type { NextRequest } from "next/server";

const MCP_SERVER_URL = "http://18.61.195.193:8010";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log(`🔄 Proxying MCP request:`, body);

    const response = await fetch(`${MCP_SERVER_URL}/v1/functions/call`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        // Add any other headers the MCP server might need
      },
      body: JSON.stringify(body),
    });

    console.log(`✅ MCP server response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `❌ MCP Server error: ${response.status} ${response.statusText}`,
        errorText
      );
      return Response.json(
        {
          error: `MCP Server error: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`📊 MCP server response data:`, JSON.stringify(data, null, 2));

    // Return the data with proper CORS headers
    return Response.json(data, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error(`❌ Error proxying MCP request:`, error);
    return Response.json(
      {
        error: "Failed to proxy MCP request",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
