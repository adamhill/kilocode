import EventSource from "eventsource"
import type { ServerConfig, SSEEvent } from "./types"

// Type definitions for handlers
export type SSEEventHandler = (event: SSEEvent) => void
export type SSEErrorHandler = (error: Error) => void
export type SSEStateHandler = (state: "connecting" | "connected" | "disconnected") => void

/**
 * SSE Client for receiving real-time events from the CLI backend.
 * Manages EventSource connection and distributes events to subscribers.
 */
export class SSEClient {
  private eventSource: EventSource | null = null
  private handlers: Set<SSEEventHandler> = new Set()
  private errorHandlers: Set<SSEErrorHandler> = new Set()
  private stateHandlers: Set<SSEStateHandler> = new Set()

  constructor(private readonly config: ServerConfig) {}

  /**
   * Connect to the SSE endpoint for a specific directory.
   * @param directory - The workspace directory to subscribe to events for
   */
  connect(directory: string): void {
    console.log('[SSEClient] 🔌 connect() called with directory:', directory);
    
    // Return early if already connected
    if (this.eventSource) {
      console.log('[SSEClient] ⚠️ Already connected, skipping');
      return
    }

    // Notify connecting state
    console.log('[SSEClient] 🔄 Setting state to "connecting"');
    this.notifyState("connecting")

    // Build URL with directory parameter
    const url = `${this.config.baseUrl}/event?directory=${encodeURIComponent(directory)}`
    console.log('[SSEClient] 🌐 Connecting to URL:', url);

    // Create auth header
    const authHeader = `Basic ${Buffer.from(`:${this.config.password}`).toString("base64")}`
    console.log('[SSEClient] 🔑 Auth header created (password length):', this.config.password.length);

    // Create EventSource with headers
    console.log('[SSEClient] 🎬 Creating EventSource...');
    this.eventSource = new EventSource(url, {
      headers: {
        Authorization: authHeader,
      },
    })

    // Set up onopen handler
    this.eventSource.onopen = () => {
      console.log('[SSEClient] ✅ EventSource opened successfully');
      this.notifyState("connected")
    }

    // Set up onmessage handler
    this.eventSource.onmessage = (messageEvent) => {
      console.log('[SSEClient] 📨 Received message event:', messageEvent.data);
      try {
        const event = JSON.parse(messageEvent.data) as SSEEvent
        console.log('[SSEClient] 📦 Parsed event type:', event.type);
        this.notifyEvent(event)
      } catch (error) {
        console.error("[SSEClient] ❌ Failed to parse event:", error)
        this.notifyError(error instanceof Error ? error : new Error(String(error)))
      }
    }

    // Set up onerror handler
    this.eventSource.onerror = (errorEvent) => {
      console.error("[SSEClient] ❌ EventSource error:", errorEvent)
      this.notifyError(new Error("EventSource connection error"))
      this.notifyState("disconnected")
    }
  }

  /**
   * Disconnect from the SSE endpoint.
   */
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    this.notifyState("disconnected")
  }

  /**
   * Subscribe to SSE events.
   * @param handler - Function to call when an event is received
   * @returns Unsubscribe function
   */
  onEvent(handler: SSEEventHandler): () => void {
    this.handlers.add(handler)
    return () => {
      this.handlers.delete(handler)
    }
  }

  /**
   * Subscribe to error events.
   * @param handler - Function to call when an error occurs
   * @returns Unsubscribe function
   */
  onError(handler: SSEErrorHandler): () => void {
    this.errorHandlers.add(handler)
    return () => {
      this.errorHandlers.delete(handler)
    }
  }

  /**
   * Subscribe to connection state changes.
   * @param handler - Function to call when state changes
   * @returns Unsubscribe function
   */
  onStateChange(handler: SSEStateHandler): () => void {
    this.stateHandlers.add(handler)
    return () => {
      this.stateHandlers.delete(handler)
    }
  }

  /**
   * Notify all event handlers of a new event.
   */
  private notifyEvent(event: SSEEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(event)
      } catch (error) {
        console.error("[SSEClient] Error in event handler:", error)
      }
    }
  }

  /**
   * Notify all error handlers of an error.
   */
  private notifyError(error: Error): void {
    for (const handler of this.errorHandlers) {
      try {
        handler(error)
      } catch (err) {
        console.error("[SSEClient] Error in error handler:", err)
      }
    }
  }

  /**
   * Notify all state handlers of a state change.
   */
  private notifyState(state: "connecting" | "connected" | "disconnected"): void {
    for (const handler of this.stateHandlers) {
      try {
        handler(state)
      } catch (error) {
        console.error("[SSEClient] Error in state handler:", error)
      }
    }
  }

  /**
   * Dispose of the client, disconnecting and clearing all handlers.
   */
  dispose(): void {
    this.disconnect()
    this.handlers.clear()
    this.errorHandlers.clear()
    this.stateHandlers.clear()
  }
}
