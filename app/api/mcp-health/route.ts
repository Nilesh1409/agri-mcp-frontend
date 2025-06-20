import type { NextRequest } from "next/server";

const MCP_SERVER_URL = "https://69c0-106-51-85-143.ngrok-free.app";

export async function GET(req: NextRequest) {
  try {
    const response = await fetch(`${MCP_SERVER_URL}/v1/health`, {
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
    });

    if (!response.ok) {
      throw new Error(`MCP Server health check failed: ${response.status}`);
    }

    const data = await response.json();

    return Response.json({
      success: true,
      mcpServer: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("MCP Server health check failed:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Health check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
