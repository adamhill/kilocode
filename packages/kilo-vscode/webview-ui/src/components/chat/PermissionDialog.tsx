/**
 * PermissionDialog component
 * Displays permission requests from the assistant and allows user to respond
 */

import { Component, Show, For, createSignal } from 'solid-js';
import { useSession } from '../../context/session';
import type { PermissionRequest } from '../../types/messages';

interface PermissionDialogProps {
  permission: PermissionRequest;
}

const PermissionItem: Component<PermissionDialogProps> = (props) => {
  const session = useSession();
  const [expanded, setExpanded] = createSignal(false);

  const handleResponse = (response: 'once' | 'always' | 'reject') => {
    session.respondToPermission(props.permission.id, response);
  };

  return (
    <div class="permission-item">
      <div class="permission-header">
        <span class="permission-icon">🔐</span>
        <span class="permission-title">Permission Required</span>
      </div>
      
      <div class="permission-content">
        <p class="permission-message">
          {props.permission.message || `The assistant wants to use: ${props.permission.toolName}`}
        </p>
        
        <button
          class="permission-details-toggle"
          onClick={() => setExpanded(!expanded())}
        >
          {expanded() ? 'Hide details' : 'Show details'}
        </button>
        
        <Show when={expanded()}>
          <div class="permission-details">
            <div class="permission-tool">
              <strong>Tool:</strong> {props.permission.toolName}
            </div>
            <div class="permission-args">
              <strong>Arguments:</strong>
              <pre>{JSON.stringify(props.permission.args, null, 2)}</pre>
            </div>
          </div>
        </Show>
      </div>
      
      <div class="permission-actions">
        <button
          class="permission-button permission-button-reject"
          onClick={() => handleResponse('reject')}
        >
          Reject
        </button>
        <button
          class="permission-button permission-button-once"
          onClick={() => handleResponse('once')}
        >
          Allow Once
        </button>
        <button
          class="permission-button permission-button-always"
          onClick={() => handleResponse('always')}
        >
          Always Allow
        </button>
      </div>
    </div>
  );
};

export const PermissionDialog: Component = () => {
  const session = useSession();
  
  const permissions = () => session.permissions();
  const hasPermissions = () => permissions().length > 0;

  return (
    <Show when={hasPermissions()}>
      <div class="permission-overlay">
        <div class="permission-dialog">
          <For each={permissions()}>
            {(permission) => <PermissionItem permission={permission} />}
          </For>
        </div>
      </div>
    </Show>
  );
};
