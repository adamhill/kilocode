/**
 * Session context
 * Manages session state, messages, and handles SSE events from the extension
 */

import {
  createContext,
  useContext,
  createSignal,
  onMount,
  onCleanup,
  ParentComponent,
  Accessor,
  batch,
} from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { useVSCode } from './vscode';
import { useServer } from './server';
import type {
  SessionInfo,
  Message,
  Part,
  PartDelta,
  SessionStatus,
  PermissionRequest,
  TodoItem,
  ExtensionMessage,
} from '../types/messages';

// Store structure for messages and parts
interface SessionStore {
  sessions: Record<string, SessionInfo>;
  messages: Record<string, Message[]>; // sessionID -> messages
  parts: Record<string, Part[]>; // messageID -> parts
  todos: Record<string, TodoItem[]>; // sessionID -> todos
}

interface SessionContextValue {
  // Current session
  currentSessionID: Accessor<string | undefined>;
  currentSession: Accessor<SessionInfo | undefined>;
  setCurrentSessionID: (id: string | undefined) => void;
  
  // Session status
  status: Accessor<SessionStatus>;
  
  // Messages for current session
  messages: Accessor<Message[]>;
  
  // Parts for a specific message
  getParts: (messageID: string) => Part[];
  
  // Todos for current session
  todos: Accessor<TodoItem[]>;
  
  // Pending permission requests
  permissions: Accessor<PermissionRequest[]>;
  
  // Actions
  sendMessage: (text: string) => void;
  abort: () => void;
  respondToPermission: (permissionId: string, response: 'once' | 'always' | 'reject') => void;
  createSession: () => void;
}

const SessionContext = createContext<SessionContextValue>();

export const SessionProvider: ParentComponent = (props) => {
  const vscode = useVSCode();
  const server = useServer();
  
  // Current session ID
  const [currentSessionID, setCurrentSessionID] = createSignal<string | undefined>();
  
  // Session status
  const [status, setStatus] = createSignal<SessionStatus>('idle');
  
  // Pending permissions
  const [permissions, setPermissions] = createSignal<PermissionRequest[]>([]);
  
  // Store for sessions, messages, parts, todos
  const [store, setStore] = createStore<SessionStore>({
    sessions: {},
    messages: {},
    parts: {},
    todos: {},
  });

  // Handle messages from extension
  onMount(() => {
    const unsubscribe = vscode.onMessage((message: ExtensionMessage) => {
      switch (message.type) {
        case 'sessionCreated':
          handleSessionCreated(message.session);
          break;
          
        case 'messagesLoaded':
          handleMessagesLoaded(message.sessionID, message.messages);
          break;
          
        case 'messageCreated':
          handleMessageCreated(message.message);
          break;
          
        case 'partUpdated':
          handlePartUpdated(message.sessionID, message.messageID, message.part, message.delta);
          break;
          
        case 'sessionStatus':
          handleSessionStatus(message.sessionID, message.status);
          break;
          
        case 'permissionRequest':
          handlePermissionRequest(message.permission);
          break;
          
        case 'todoUpdated':
          handleTodoUpdated(message.sessionID, message.items);
          break;
      }
    });

    onCleanup(unsubscribe);
  });

  // Event handlers
  function handleSessionCreated(session: SessionInfo) {
    console.log('[Kilo New] Session created:', session.id);
    batch(() => {
      setStore('sessions', session.id, session);
      setStore('messages', session.id, []);
      setCurrentSessionID(session.id);
    });
  }

  function handleMessagesLoaded(sessionID: string, messages: Message[]) {
    console.log('[Kilo New] Messages loaded for session:', sessionID, messages.length);
    setStore('messages', sessionID, messages);
    
    // Also extract parts from messages
    messages.forEach((msg) => {
      if (msg.parts && msg.parts.length > 0) {
        setStore('parts', msg.id, msg.parts);
      }
    });
  }

  function handleMessageCreated(message: Message) {
    console.log('[Kilo New] Message created:', message.id, message.role);
    setStore('messages', message.sessionID, (msgs = []) => [...msgs, message]);
    
    if (message.parts && message.parts.length > 0) {
      setStore('parts', message.id, message.parts);
    }
  }

  function handlePartUpdated(sessionID: string, messageID: string, part: Part, delta?: PartDelta) {
    setStore('parts', produce((parts) => {
      if (!parts[messageID]) {
        parts[messageID] = [];
      }
      
      const existingIndex = parts[messageID].findIndex((p) => p.id === part.id);
      
      if (existingIndex >= 0) {
        // Update existing part
        if (delta?.type === 'text-delta' && delta.textDelta && parts[messageID][existingIndex].type === 'text') {
          // Append text delta
          (parts[messageID][existingIndex] as { text: string }).text += delta.textDelta;
        } else {
          // Replace entire part
          parts[messageID][existingIndex] = part;
        }
      } else {
        // Add new part
        parts[messageID].push(part);
      }
    }));
  }

  function handleSessionStatus(sessionID: string, newStatus: SessionStatus) {
    console.log('[Kilo New] Session status:', sessionID, newStatus);
    if (sessionID === currentSessionID()) {
      setStatus(newStatus);
    }
  }

  function handlePermissionRequest(permission: PermissionRequest) {
    console.log('[Kilo New] Permission request:', permission.toolName);
    setPermissions((prev) => [...prev, permission]);
  }

  function handleTodoUpdated(sessionID: string, items: TodoItem[]) {
    console.log('[Kilo New] Todos updated:', sessionID, items.length);
    setStore('todos', sessionID, items);
  }

  // Actions
  function sendMessage(text: string) {
    if (!server.isConnected()) {
      console.warn('[Kilo New] Cannot send message: not connected');
      return;
    }
    
    console.log('[Kilo New] Sending message:', text.substring(0, 50));
    vscode.postMessage({
      type: 'sendMessage',
      text,
      sessionID: currentSessionID(),
    });
  }

  function abort() {
    const sessionID = currentSessionID();
    if (!sessionID) {
      console.warn('[Kilo New] Cannot abort: no current session');
      return;
    }
    
    console.log('[Kilo New] Aborting session:', sessionID);
    vscode.postMessage({
      type: 'abort',
      sessionID,
    });
  }

  function respondToPermission(permissionId: string, response: 'once' | 'always' | 'reject') {
    console.log('[Kilo New] Permission response:', permissionId, response);
    vscode.postMessage({
      type: 'permissionResponse',
      permissionId,
      response,
    });
    
    // Remove from pending permissions
    setPermissions((prev) => prev.filter((p) => p.id !== permissionId));
  }

  function createSession() {
    if (!server.isConnected()) {
      console.warn('[Kilo New] Cannot create session: not connected');
      return;
    }
    
    console.log('[Kilo New] Creating new session');
    vscode.postMessage({ type: 'createSession' });
  }

  // Computed values
  const currentSession = () => {
    const id = currentSessionID();
    return id ? store.sessions[id] : undefined;
  };

  const messages = () => {
    const id = currentSessionID();
    return id ? store.messages[id] || [] : [];
  };

  const getParts = (messageID: string) => {
    return store.parts[messageID] || [];
  };

  const todos = () => {
    const id = currentSessionID();
    return id ? store.todos[id] || [] : [];
  };

  const value: SessionContextValue = {
    currentSessionID,
    currentSession,
    setCurrentSessionID,
    status,
    messages,
    getParts,
    todos,
    permissions,
    sendMessage,
    abort,
    respondToPermission,
    createSession,
  };

  return (
    <SessionContext.Provider value={value}>
      {props.children}
    </SessionContext.Provider>
  );
};

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
