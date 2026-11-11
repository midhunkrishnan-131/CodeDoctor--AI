export interface ParsedSection {
  title: string;
  content: string;
}

export interface ParsedDiagnosis {
  raw: string;
  sections: ParsedSection[];
  extractedCode?: string;
  hasCorrectedCode: boolean;
  isLogicMode: boolean;
}

export function extractPythonCode(markdown: string): string | undefined {
  // 1. Look for explicit ```python or ```py code blocks
  const pythonMatches = Array.from(markdown.matchAll(/```(?:python|py)\s*\n([\s\S]*?)```/gi));
  if (pythonMatches.length > 0) {
    // Pick the longest python block (which is the full solution, not tiny snippets)
    const sorted = pythonMatches.map(m => m[1].trim()).sort((a, b) => b.length - a.length);
    return sorted[0];
  }

  // 2. Fallback to generic code blocks that contain def, import, or return
  const genericMatches = Array.from(markdown.matchAll(/```\s*\n([\s\S]*?)```/g));
  for (const m of genericMatches) {
    const content = m[1].trim();
    if (content.includes('def ') || content.includes('import ') || content.includes('return ')) {
      return content;
    }
  }

  return undefined;
}

export function parseAiDiagnosis(rawMarkdown: string, mode: 'complete_answer' | 'logic_suggestion'): ParsedDiagnosis {
  const isLogicMode = mode === 'logic_suggestion';
  const extracted = extractPythonCode(rawMarkdown);

  const lines = rawMarkdown.split('\n');
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection = { title: 'Overview', content: '' };

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      if (currentSection.content.trim()) {
        sections.push(currentSection);
      }
      currentSection = {
        title: headingMatch[1].trim(),
        content: ''
      };
    } else {
      currentSection.content += line + '\n';
    }
  }

  if (currentSection.content.trim()) {
    sections.push(currentSection);
  }

  return {
    raw: rawMarkdown,
    sections: sections.length > 0 ? sections : [{ title: 'Diagnosis', content: rawMarkdown }],
    extractedCode: !isLogicMode ? extracted : undefined,
    hasCorrectedCode: !isLogicMode && Boolean(extracted),
    isLogicMode
  };
}
