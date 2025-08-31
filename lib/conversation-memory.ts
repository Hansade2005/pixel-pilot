// Conversation memory service for AI App Builder
// This service provides a way to store and retrieve conversation history

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  projectId: string;
}

export interface ConversationSummary {
  id: string;
  projectId: string;
  summary: string;
  keyPoints: string[];
  createdAt: Date;
  updatedAt: Date;
}

// In-memory conversation memory - in production, this would be stored in a database
const conversationHistory: ConversationMessage[] = [];
const conversationSummaries: ConversationSummary[] = [];

export class ConversationMemory {
  // Add a message to the conversation history
  static addMessage(projectId: string, role: 'user' | 'assistant', content: string): ConversationMessage {
    const message: ConversationMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
      projectId
    };
    
    conversationHistory.push(message);
    return message;
  }
  
  // Get recent conversation history for a project
  static getRecentHistory(projectId: string, limit: number = 10): ConversationMessage[] {
    return conversationHistory
      .filter(msg => msg.projectId === projectId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
      .reverse(); // Return in chronological order
  }
  
  // Get conversation history within a time range
  static getHistoryByTimeRange(projectId: string, startTime: Date, endTime: Date): ConversationMessage[] {
    return conversationHistory
      .filter(msg => 
        msg.projectId === projectId &&
        msg.timestamp >= startTime &&
        msg.timestamp <= endTime
      )
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
  
  // Save a conversation summary
  static saveSummary(projectId: string, summary: string, keyPoints: string[]): ConversationSummary {
    const existingSummary = conversationSummaries.find(s => s.projectId === projectId);
    
    if (existingSummary) {
      // Update existing summary
      existingSummary.summary = summary;
      existingSummary.keyPoints = keyPoints;
      existingSummary.updatedAt = new Date();
      return existingSummary;
    } else {
      // Create new summary
      const newSummary: ConversationSummary = {
        id: `summary_${projectId}`,
        projectId,
        summary,
        keyPoints,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      conversationSummaries.push(newSummary);
      return newSummary;
    }
  }
  
  // Get conversation summary for a project
  static getSummary(projectId: string): ConversationSummary | undefined {
    return conversationSummaries.find(s => s.projectId === projectId);
  }
  
  // Clear conversation history for a project
  static clearHistory(projectId: string): void {
    const index = conversationHistory.findIndex(msg => msg.projectId === projectId);
    if (index !== -1) {
      conversationHistory.splice(index, 1);
    }
  }
  
  // Get all messages
  static getAllMessages(): ConversationMessage[] {
    return [...conversationHistory];
  }
  
  // Get all summaries
  static getAllSummaries(): ConversationSummary[] {
    return [...conversationSummaries];
  }
}

// Export the conversation memory service
export const conversationMemoryService = new ConversationMemory();