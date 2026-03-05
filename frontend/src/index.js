import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Basic global styles
const style = document.createElement('style');
style.textContent = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100% { box-shadow: 0 0 0 3px rgba(22,163,74,0.2); } 50% { box-shadow: 0 0 0 6px rgba(22,163,74,0.1); } }
  input:focus, select:focus { border-color: #4f46e5 !important; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
  button:hover { opacity: 0.9; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #f1f5f9; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
`;
document.head.appendChild(style);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
