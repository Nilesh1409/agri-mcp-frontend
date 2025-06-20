"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useChat } from "ai/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MapPin,
  Send,
  History,
  Settings,
  Trash2,
  Wrench,
  AlertCircle,
} from "lucide-react";
import { LocationDialog } from "@/components/location-dialog";
import { ToolsDialog } from "@/components/tools-dialog";
import { HistoryDialog } from "@/components/history-dialog";
import { MessageBubble } from "@/components/message-bubble";
import { ServerStatus } from "@/components/server-status";

export default function EnhancedMCPChatbot() {
  const [chatError, setChatError] = useState<string | null>(null);
  const { messages, input, handleInputChange, handleSubmit, isLoading, send } =
    useChat({
      api: "/api/chat",
      onError: (error) => {
        console.error("❌ Chat error:", error);
        setChatError(error.message || "An error occurred");
      },
      onFinish: () => setChatError(null),
    });

  console.log("🚀 ~ EnhancedMCPChatbot ~ messages:", messages);

  // Location state
  const [location, setLocation] = useState<{
    latitude: number | null;
    longitude: number | null;
    locationName: string | null;
  }>({ latitude: null, longitude: null, locationName: null });

  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [showToolsDialog, setShowToolsDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  // Enhanced scrolling refs and state
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isUserScrolledUpRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Smooth auto-scroll function
  const smoothScrollToBottom = useCallback(() => {
    if (!chatContainerRef.current || isUserScrolledUpRef.current) return;

    const container = chatContainerRef.current;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const maxScrollTop = scrollHeight - clientHeight;

    // Only scroll if we're not already at the bottom
    if (container.scrollTop < maxScrollTop - 10) {
      container.scrollTo({
        top: maxScrollTop,
        behavior: "smooth",
      });
    }
  }, []);

  // Enhanced scroll detection
  const handleScroll = useCallback(() => {
    if (!chatContainerRef.current) return;

    const container = chatContainerRef.current;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const maxScrollTop = scrollHeight - clientHeight;

    // Check if user scrolled up manually
    const isAtBottom = scrollTop >= maxScrollTop - 50; // 50px threshold
    isUserScrolledUpRef.current = !isAtBottom;

    // Clear timeout and set new one to reset scroll detection
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      // If user stops scrolling and is near bottom, resume auto-scroll
      if (isAtBottom) {
        isUserScrolledUpRef.current = false;
      }
    }, 1000);

    lastScrollTopRef.current = scrollTop;
  }, []);

  // Auto-scroll on messages change with enhanced logic
  useEffect(() => {
    // Use requestAnimationFrame for smoother scrolling
    const scrollFrame = requestAnimationFrame(() => {
      smoothScrollToBottom();
    });

    return () => cancelAnimationFrame(scrollFrame);
  }, [messages, smoothScrollToBottom]);

  // Enhanced auto-scroll during loading (streaming)
  useEffect(() => {
    if (!isLoading) return;

    const scrollInterval = setInterval(() => {
      smoothScrollToBottom();
    }, 100); // Scroll every 100ms during streaming

    return () => clearInterval(scrollInterval);
  }, [isLoading, smoothScrollToBottom]);

  // Mutation observer for dynamic content changes
  useEffect(() => {
    if (!chatContainerRef.current) return;

    const observer = new MutationObserver(() => {
      // Small delay to allow content to render
      setTimeout(smoothScrollToBottom, 50);
    });

    observer.observe(chatContainerRef.current, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [smoothScrollToBottom]);

  // On first load, restore or auto-fetch location
  useEffect(() => {
    const stored = localStorage.getItem("mcpLocation");
    if (stored) {
      try {
        setLocation(JSON.parse(stored));
      } catch {
        promptForLocation();
      }
    } else {
      promptForLocation();
    }

    function promptForLocation() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            const name = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
            const loc = { latitude: lat, longitude: lon, locationName: name };
            setLocation(loc);
            localStorage.setItem("mcpLocation", JSON.stringify(loc));
          },
          () => {
            setShowLocationDialog(true);
          }
        );
      } else {
        setShowLocationDialog(true);
      }
    }
  }, []);

  const handleLocationChange = (loc: {
    latitude: number;
    longitude: number;
    locationName: string;
  }) => {
    setLocation(loc);
    localStorage.setItem("mcpLocation", JSON.stringify(loc));
    setShowLocationDialog(false);
  };

  // 20 s timeout to show fallback if still loading
  useEffect(() => {
    if (!isLoading) return;
    const timeout = setTimeout(() => {
      send({ role: "assistant", content: "⚠️ No response received." });
    }, 20000);
    return () => clearTimeout(timeout);
  }, [isLoading, send]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    setChatError(null);

    // Reset scroll detection when user sends a message
    isUserScrolledUpRef.current = false;

    let messageToSend = input;
    if (location.latitude != null && location.longitude != null) {
      messageToSend = `${input}\n\nLocation: ${location.locationName} (${location.latitude}, ${location.longitude})`;
    }

    const syntheticEvent = {
      ...e,
      currentTarget: {
        ...e.currentTarget,
        elements: {
          ...e.currentTarget.elements,
          message: { value: messageToSend },
        },
      },
    } as React.FormEvent<HTMLFormElement>;

    handleSubmit(syntheticEvent);
  };

  const clearHistory = () => window.location.reload();

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <Card className="rounded-none border-b">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-green-700">
                🌍 Enhanced MCP Environmental Chatbot
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                AI-powered environmental and agricultural data assistant
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ServerStatus />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistoryDialog(true)}
                className="flex items-center gap-1"
              >
                <History className="w-4 h-4" /> History
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowToolsDialog(true)}
                className="flex items-center gap-1"
              >
                <Wrench className="w-4 h-4" /> Tools
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearHistory}
                className="flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" /> Clear
              </Button>
            </div>
          </div>

          {/* Location Display */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-600" />
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800"
              >
                {location.locationName &&
                  `📍 ${location.locationName} (${location.latitude}, ${location.longitude})`}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLocationDialog(true)}
              className="text-blue-600 hover:text-blue-800"
            >
              <Settings className="w-4 h-4 mr-1" /> Change Location
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Intro when empty */}
      {messages.length === 0 && (
        <div className="flex-1 overflow-y-auto p-4">
          <Card className="max-w-4xl mx-auto">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  Welcome to Enhanced MCP Environmental Chatbot! 🌱
                </h2>
                <p className="text-gray-600">
                  I'm connected to live environmental APIs through MCP server.
                  Default location is set to Bengaluru!
                </p>

                <div className="grid md:grid-cols-2 gap-4 mt-6">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-green-700">
                      🔧 MCP Tools Available:
                    </h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Weather data (OpenMeteo API)</li>
                      <li>• Soil composition (SoilGrids API)</li>
                      <li>• Precipitation data (CHIRPS)</li>
                      <li>• Environmental metrics</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold text-blue-700">
                      🌍 Try asking:
                    </h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• "What's the current weather?"</li>
                      <li>• "Show me soil data"</li>
                      <li>• "Get precipitation information"</li>
                      <li>• "Any recent earthquakes nearby?"</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chat Messages with Enhanced Scrolling */}
      {messages.length > 0 && (
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
          onScroll={handleScroll}
          style={{ scrollBehavior: "smooth" }}
        >
          {chatError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Chat Error:</strong> {chatError}
              </AlertDescription>
            </Alert>
          )}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-lg p-4 shadow-sm border max-w-xs">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                  <span className="text-sm text-gray-600">
                    Generating response...
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* Input Area */}
      <Card className="rounded-none border-t">
        <CardContent className="p-4">
          <form onSubmit={onSubmit} className="flex space-x-2">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Ask about weather, soil, precipitation, or any environmental data..."
              className="flex-grow"
              disabled={location.latitude == null || isLoading}
            />
            <Button
              type="submit"
              disabled={!input.trim() || location.latitude == null || isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <LocationDialog
        open={showLocationDialog}
        onOpenChange={setShowLocationDialog}
        location={location}
        onLocationChange={handleLocationChange}
      />
      <ToolsDialog open={showToolsDialog} onOpenChange={setShowToolsDialog} />
      <HistoryDialog
        open={showHistoryDialog}
        onOpenChange={setShowHistoryDialog}
        messages={messages}
      />
    </div>
  );
}
