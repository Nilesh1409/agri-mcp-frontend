"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Bot, Wrench } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Message } from "ai";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  // 1. Extract the main content
  let content = message.content;
  if (!content && message.parts?.length > 1) {
    const p = message.parts[1] as any;
    content = p.toolInvocation?.result ?? p.text ?? "";
  }

  // 2. Detect generating state
  const isGenerating = !content && message.role === "assistant";

  // 3. Grab first tool invocation if present
  const invocation = (message as any).toolInvocations?.[0];

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2 `}>
      <Card
        className={`max-w-4xl relative ${
          isUser ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"
        }`}
      >
        <CardContent className="p-4 relative">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                isUser ? "bg-blue-600" : "bg-green-600"
              }`}
            >
              {isUser ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Bot className="w-4 h-4 text-white" />
              )}
            </div>

            {/* Main content */}
            <div className="flex-1 space-y-2">
              <Badge
                variant={isUser ? "default" : "secondary"}
                className={
                  isUser ? "bg-blue-600" : "bg-green-100 text-green-800"
                }
              >
                {isUser ? "You" : "Assistant"}
              </Badge>

              <div className="prose prose-sm max-w-none text-gray-800">
                {isGenerating ? (
                  "⏳ Generating response..."
                ) : (
                  <ReactMarkdown>
                    {content || "No response content."}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          </div>

          {/* Tool invocation overlay */}
          {!isUser && invocation && (
            <div className="absolute top-3 right-3 flex items-start gap-1 bg-gray-50 p-2 rounded shadow-sm text-xs text-gray-600">
              <Wrench className="w-4 h-4 flex-shrink-0" />
              <div className="leading-tight">
                <div>
                  <span className="font-medium">Tool:</span>{" "}
                  <code>{invocation.toolName}</code>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
