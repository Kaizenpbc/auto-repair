import React from 'react';
import { createRoot } from 'react-dom/client';
import WorkflowApp from './WorkflowApp';

console.log('main.tsx loaded');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found');
  throw new Error('Root element not found');
}

console.log('Root element found:', rootElement);

try {
  const root = createRoot(rootElement);
  console.log('Root created successfully');

  root.render(
    <React.StrictMode>
      <WorkflowApp />
    </React.StrictMode>
  );

  console.log('App rendered successfully');
} catch (error) {
  console.error('Failed to render app:', error);
  document.body.innerHTML = `<div style="padding: 20px;"><h1 style="color: red;">Error loading application</h1><pre>${error}</pre></div>`;
}