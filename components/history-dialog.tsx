"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { History, User, Bot } from "lucide-react"
import type { Message } from "ai"

interface HistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  messages: Message[]
}

export function HistoryDialog({ open, onOpenChange, messages }: HistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-purple-600" />
            Conversation History
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No conversation history yet.</p>
              <p className="text-sm">Start chatting to see your message history here!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div key={message.id || index} className="space-y-2">
                  <div className="flex items-center gap-2">
                    {message.role === "user" ? (
                      <>
                        <User className="w-4 h-4 text-blue-600" />
                        <Badge variant="outline" className="text-blue-600 border-blue-200">
                          You
                        </Badge>
                      </>
                    ) : (
                      <>
                        <Bot className="w-4 h-4 text-green-600" />
                        <Badge variant="outline" className="text-green-600 border-green-200">
                          Assistant
                        </Badge>
                      </>
                    )}
                    <span className="text-xs text-gray-500">Message {index + 1}</span>
                  </div>
                  <div className="pl-6 text-sm bg-gray-50 p-3 rounded-lg">
                    <p className="whitespace-pre-wrap">
                      {message.content.length > 200 ? `${message.content.substring(0, 200)}...` : message.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
