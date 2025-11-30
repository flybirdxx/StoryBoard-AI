import React from 'react';
import ReactDOM from 'react-dom/client';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App';

console.log('index.tsx loaded');
console.log('React version:', React.version);

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Could not find root element to mount to");
  document.body.innerHTML = '<div style="padding:20px;color:red;background:#fff;">错误：找不到 root 元素</div>';
  throw new Error("Could not find root element to mount to");
}

console.log('Root element found, creating root...');
const root = ReactDOM.createRoot(rootElement);

console.log('Rendering app...');
try {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
  console.log('App rendered successfully');
} catch (error) {
  console.error('Error rendering app:', error);
  rootElement.innerHTML = `<div style="padding:20px;color:red;background:#fff;">
    <h1>渲染错误</h1>
    <pre>${error instanceof Error ? error.message : String(error)}</pre>
    <p>请查看控制台获取详细信息</p>
  </div>`;
}