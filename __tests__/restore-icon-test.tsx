// Test component to verify restore icon functionality
import React from 'react';
import { Undo2, Redo2 } from 'lucide-react';

// Mock ExpandableUserMessage component for testing
const ExpandableUserMessage = ({ content, messageId, onRevert, showRestore = false }: { content: string, messageId: string, onRevert: (messageId: string) => void, showRestore?: boolean }) => {
  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRevert(messageId);
  };
  
  const renderIconButton = () => {
    if (showRestore) {
      return (
        <button
          onClick={handleIconClick}
          className="absolute -top-2 -left-2 bg-background border border-border rounded-full p-1.5 shadow-sm hover:bg-muted transition-colors"
          title="Restore to this version"
        >
          <Redo2 className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
        </button>
      );
    }
    
    return (
      <button
        onClick={handleIconClick}
        className="absolute -top-2 -left-2 bg-background border border-border rounded-full p-1.5 shadow-sm hover:bg-muted transition-colors"
        title="Revert to this version"
      >
        <Undo2 className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
      </button>
    );
  };
  
  return (
    <div className="relative">
      <div className="bg-primary text-primary-foreground px-4 py-3 rounded-2xl rounded-br-md">
        <p className="text-sm chat-message-content whitespace-pre-wrap">
          {content}
        </p>
      </div>
      {renderIconButton()}
    </div>
  );
};

// Test the component
const TestRestoreIcon = () => {
  const [showRestore, setShowRestore] = React.useState(false);
  
  const handleRevert = (messageId: string) => {
    if (showRestore) {
      console.log(`Restoring to message ${messageId}`);
      // Perform restore logic
      setShowRestore(false);
    } else {
      console.log(`Reverting to message ${messageId}`);
      // Perform revert logic
      setShowRestore(true);
    }
  };
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Restore Icon Test</h1>
      <div className="mb-4">
        <ExpandableUserMessage 
          content="This is a test message that should show the revert icon initially"
          messageId="test-message-1"
          onRevert={handleRevert}
          showRestore={false}
        />
      </div>
      <div className="mb-4">
        <ExpandableUserMessage 
          content="This is a test message that should show the restore icon after revert"
          messageId="test-message-2"
          onRevert={handleRevert}
          showRestore={showRestore}
        />
      </div>
      <button 
        onClick={() => setShowRestore(!showRestore)}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Toggle Restore Icon
      </button>
    </div>
  );
};

export default TestRestoreIcon;