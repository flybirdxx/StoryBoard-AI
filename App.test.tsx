// Temporary test file to diagnose white screen issue
import React from 'react';

const TestApp: React.FC = () => {
  console.log('TestApp rendering...');
  return (
    <div style={{ padding: '20px', backgroundColor: '#0f111a', color: 'white', minHeight: '100vh' }}>
      <h1>测试应用</h1>
      <p>如果你看到这个，说明 React 正常工作</p>
      <p>检查控制台查看日志</p>
    </div>
  );
};

export default TestApp;

