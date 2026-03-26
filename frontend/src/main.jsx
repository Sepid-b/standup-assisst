import React from 'react';
import ReactDOM from 'react-dom/client';
import { FluentProvider, teamsLightTheme } from '@fluentui/react-components';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <FluentProvider theme={teamsLightTheme} style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <App />
    </FluentProvider>
  </React.StrictMode>
);
