import React, { useState } from 'react';
import { usePluginAction, usePluginData } from '@paperclipai/plugin-sdk/ui';

interface ScaffoldStatus {
  ready: boolean;
  message: string;
  updatedAt?: string;
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'grid',
    gap: 20,
    color: '#111827',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
  },
  card: {
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    padding: 20,
    background: '#ffffff',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
  },
  muted: {
    margin: 0,
    color: '#4b5563',
    lineHeight: 1.5
  },
  button: {
    border: 'none',
    borderRadius: 12,
    padding: '12px 16px',
    background: '#111827',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer'
  },
  meta: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 8
  }
};

export function GitHubSyncSettingsPage(): React.JSX.Element {
  const status = usePluginData<ScaffoldStatus>('scaffold.status', {});
  const markReady = usePluginAction('scaffold.markReady');
  const [submitting, setSubmitting] = useState(false);

  async function handleClick() {
    setSubmitting(true);
    try {
      await markReady({});
      status.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.page}>
      <section style={styles.card}>
        <h2 style={{ marginTop: 0 }}>GitHub Sync</h2>
        <p style={styles.muted}>
          This scaffold verifies that a settings-page plugin can mount inside Paperclip, talk to a worker,
          and run end-to-end automation in a disposable Paperclip instance.
        </p>
      </section>

      <section style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Scaffold status</h3>
        {status.loading ? <p style={styles.muted}>Loading scaffold status…</p> : null}
        {status.data ? (
          <>
            <p style={styles.muted}>{status.data.message}</p>
            {status.data.updatedAt ? <div style={styles.meta}>Last updated: {new Date(status.data.updatedAt).toLocaleString()}</div> : null}
          </>
        ) : null}
        <button type="button" onClick={handleClick} style={styles.button} disabled={submitting}>
          {submitting ? 'Updating…' : 'Run scaffold action'}
        </button>
      </section>
    </div>
  );
}

export default GitHubSyncSettingsPage;
