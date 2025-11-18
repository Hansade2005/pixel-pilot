import React from 'react';

export default function TestSitePage() {
  const iframeSrc = '/testsite/index.html';

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <iframe
        src={iframeSrc}
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="Uploaded Test Site"
      />
    </div>
  );
}