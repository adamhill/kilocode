/**
 * ChatView component
 * Main chat container that combines all chat components
 */

import { Component } from 'solid-js';
import { StatusIndicator } from './StatusIndicator';
import { MessageList } from './MessageList';
import { PromptInput } from './PromptInput';
import { PermissionDialog } from './PermissionDialog';

export const ChatView: Component = () => {
  return (
    <div class="chat-view">
      <div class="chat-header">
        <StatusIndicator />
      </div>
      
      <div class="chat-messages">
        <MessageList />
      </div>
      
      <div class="chat-input">
        <PromptInput />
      </div>
      
      <PermissionDialog />
    </div>
  );
};
