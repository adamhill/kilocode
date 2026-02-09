/**
 * StatusIndicator component
 * Shows the connection status to the CLI backend
 */

import { Component, Show } from 'solid-js';
import { useServer } from '../../context/server';
import type { ConnectionState } from '../../types/messages';

const statusConfig: Record<ConnectionState, { icon: string; label: string; className: string }> = {
  connecting: {
    icon: '◌',
    label: 'Connecting...',
    className: 'status-connecting',
  },
  connected: {
    icon: '●',
    label: 'Connected',
    className: 'status-connected',
  },
  disconnected: {
    icon: '○',
    label: 'Disconnected',
    className: 'status-disconnected',
  },
  error: {
    icon: '✕',
    label: 'Error',
    className: 'status-error',
  },
};

export const StatusIndicator: Component = () => {
  const server = useServer();

  const config = () => statusConfig[server.connectionState()];

  return (
    <div class={`status-indicator ${config().className}`}>
      <span class="status-icon">{config().icon}</span>
      <span class="status-label">{config().label}</span>
      <Show when={server.error()}>
        <span class="status-error-message" title={server.error()}>
          {server.error()}
        </span>
      </Show>
    </div>
  );
};
