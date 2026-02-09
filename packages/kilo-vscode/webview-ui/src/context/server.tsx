/**
 * Server connection context
 * Manages connection state to the CLI backend
 */

import { createContext, useContext, createSignal, onMount, onCleanup, ParentComponent, Accessor } from 'solid-js';
import { useVSCode } from './vscode';
import type { ConnectionState, ServerInfo, ExtensionMessage } from '../types/messages';

interface ServerContextValue {
  connectionState: Accessor<ConnectionState>;
  serverInfo: Accessor<ServerInfo | undefined>;
  error: Accessor<string | undefined>;
  isConnected: Accessor<boolean>;
}

const ServerContext = createContext<ServerContextValue>();

export const ServerProvider: ParentComponent = (props) => {
  const vscode = useVSCode();
  
  const [connectionState, setConnectionState] = createSignal<ConnectionState>('connecting');
  const [serverInfo, setServerInfo] = createSignal<ServerInfo | undefined>();
  const [error, setError] = createSignal<string | undefined>();

  onMount(() => {
    const unsubscribe = vscode.onMessage((message: ExtensionMessage) => {
      switch (message.type) {
        case 'ready':
          console.log('[Kilo New] Server ready:', message.serverInfo);
          setServerInfo(message.serverInfo);
          setConnectionState('connected');
          setError(undefined);
          break;
          
        case 'connectionState':
          console.log('[Kilo New] Connection state changed:', message.state);
          setConnectionState(message.state);
          if (message.error) {
            setError(message.error);
          } else if (message.state === 'connected') {
            setError(undefined);
          }
          break;
          
        case 'error':
          console.error('[Kilo New] Server error:', message.message);
          setError(message.message);
          break;
      }
    });

    onCleanup(unsubscribe);
  });

  const value: ServerContextValue = {
    connectionState,
    serverInfo,
    error,
    isConnected: () => connectionState() === 'connected',
  };

  return (
    <ServerContext.Provider value={value}>
      {props.children}
    </ServerContext.Provider>
  );
};

export function useServer(): ServerContextValue {
  const context = useContext(ServerContext);
  if (!context) {
    throw new Error('useServer must be used within a ServerProvider');
  }
  return context;
}
