import React from 'react';
import { createRoot } from 'react-dom/client';
import { ChatUI } from './ChatUI';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<ChatUI />);
}
