/**
 * Text Search Utilities
 * Helper functions for full-text search operations
 */

export interface SearchOptions {
  caseSensitive?: boolean;
  fuzzy?: boolean;
  maxDistance?: number; // Levenshtein distance for fuzzy matching
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Check if query matches value with fuzzy matching
 */
export function fuzzyMatch(
  query: string, 
  value: string, 
  options: SearchOptions = {}
): boolean {
  const { caseSensitive = false, maxDistance = 2 } = options;

  const normalizedQuery = caseSensitive ? query : query.toLowerCase();
  const normalizedValue = caseSensitive ? value : value.toLowerCase();

  // Exact match
  if (normalizedValue.includes(normalizedQuery)) {
    return true;
  }

  // Word-level fuzzy matching
  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);
  const valueWords = normalizedValue.split(/\s+/).filter(Boolean);

  for (const queryWord of queryWords) {
    let matched = false;
    
    for (const valueWord of valueWords) {
      // Check if within edit distance
      const distance = levenshteinDistance(queryWord, valueWord);
      if (distance <= maxDistance) {
        matched = true;
        break;
      }

      // Check prefix match
      if (valueWord.startsWith(queryWord) || queryWord.startsWith(valueWord)) {
        matched = true;
        break;
      }
    }

    if (!matched) {
      return false; // At least one word must match
    }
  }

  return true;
}

/**
 * Calculate relevance score for a match
 * Higher score = more relevant
 */
export function calculateRelevance(
  query: string,
  value: string,
  options: SearchOptions = {}
): number {
  const { caseSensitive = false } = options;

  const normalizedQuery = caseSensitive ? query : query.toLowerCase();
  const normalizedValue = caseSensitive ? value : value.toLowerCase();

  let score = 0;

  // Exact match: highest score
  if (normalizedValue === normalizedQuery) {
    return 100;
  }

  // Starts with query
  if (normalizedValue.startsWith(normalizedQuery)) {
    score += 80;
  }

  // Contains query as whole
  if (normalizedValue.includes(normalizedQuery)) {
    score += 50;
  }

  // Word matching
  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);
  const valueWords = normalizedValue.split(/\s+/).filter(Boolean);

  let matchedWords = 0;
  for (const queryWord of queryWords) {
    for (const valueWord of valueWords) {
      // Exact word match
      if (valueWord === queryWord) {
        score += 20;
        matchedWords++;
        break;
      }

      // Prefix match
      if (valueWord.startsWith(queryWord)) {
        score += 10;
        matchedWords++;
        break;
      }

      // Contains match
      if (valueWord.includes(queryWord)) {
        score += 5;
        matchedWords++;
        break;
      }

      // Fuzzy match
      const distance = levenshteinDistance(queryWord, valueWord);
      if (distance <= 2) {
        score += Math.max(0, 5 - distance * 2);
        matchedWords++;
        break;
      }
    }
  }

  // Boost if all query words matched
  if (queryWords.length > 0 && matchedWords === queryWords.length) {
    score += 20;
  }

  // Boost by match percentage
  const matchPercentage = queryWords.length > 0 ? matchedWords / queryWords.length : 0;
  score += matchPercentage * 10;

  return Math.min(score, 100); // Cap at 100
}

/**
 * Highlight matching terms in text
 */
export function highlightMatches(
  text: string,
  query: string,
  options: SearchOptions = {}
): string {
  const { caseSensitive = false } = options;

  if (!query || !text) return text;

  const queryWords = query.split(/\s+/).filter(Boolean);
  let highlightedText = text;

  for (const word of queryWords) {
    const regex = new RegExp(
      `(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
      caseSensitive ? 'g' : 'gi'
    );

    highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
  }

  return highlightedText;
}

/**
 * Extract snippet around match
 */
export function extractSnippet(
  text: string,
  query: string,
  maxLength: number = 200,
  options: SearchOptions = {}
): string {
  const { caseSensitive = false } = options;

  if (!text || !query) return text.substring(0, maxLength);

  const normalizedText = caseSensitive ? text : text.toLowerCase();
  const normalizedQuery = caseSensitive ? query : query.toLowerCase();

  const matchIndex = normalizedText.indexOf(normalizedQuery);

  if (matchIndex === -1) {
    // No exact match, return beginning
    return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
  }

  // Calculate snippet bounds
  const halfLength = Math.floor(maxLength / 2);
  let start = Math.max(0, matchIndex - halfLength);
  let end = Math.min(text.length, matchIndex + normalizedQuery.length + halfLength);

  // Adjust to word boundaries
  if (start > 0) {
    const spaceIndex = text.lastIndexOf(' ', start);
    if (spaceIndex > 0) start = spaceIndex + 1;
  }

  if (end < text.length) {
    const spaceIndex = text.indexOf(' ', end);
    if (spaceIndex > 0) end = spaceIndex;
  }

  const prefix = start > 0 ? '...' : '';
  const suffix = end < text.length ? '...' : '';

  return prefix + text.substring(start, end) + suffix;
}

/**
 * Parse search query into tokens and operators
 */
export interface ParsedQuery {
  tokens: string[];
  phrases: string[];
  excluded: string[];
  operators: ('AND' | 'OR')[];
}

export function parseSearchQuery(query: string): ParsedQuery {
  const result: ParsedQuery = {
    tokens: [],
    phrases: [],
    excluded: [],
    operators: [],
  };

  // Extract phrases (quoted text)
  const phraseRegex = /"([^"]+)"/g;
  let match;
  while ((match = phraseRegex.exec(query)) !== null) {
    result.phrases.push(match[1]);
  }

  // Remove phrases from query
  let remainingQuery = query.replace(phraseRegex, '');

  // Extract excluded terms (prefixed with -)
  const excludeRegex = /-(\w+)/g;
  while ((match = excludeRegex.exec(remainingQuery)) !== null) {
    result.excluded.push(match[1]);
  }

  // Remove excluded terms
  remainingQuery = remainingQuery.replace(excludeRegex, '');

  // Extract operators
  if (remainingQuery.includes(' AND ')) {
    result.operators.push('AND');
  }
  if (remainingQuery.includes(' OR ')) {
    result.operators.push('OR');
  }

  // Extract remaining tokens
  remainingQuery = remainingQuery
    .replace(/ AND | OR /g, ' ')
    .trim();

  result.tokens = remainingQuery
    .split(/\s+/)
    .filter(token => token.length > 0);

  return result;
}
