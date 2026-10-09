import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="markdown-body">
      {parseMarkdown(content)}
    </div>
  );
};

function parseMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLanguage = '';
  let codeBuffer: string[] = [];
  let tableBuffer: string[] = [];
  let listBuffer: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushList = () => {
    if (listBuffer) {
      if (listBuffer.type === 'ul') {
        elements.push(
          <ul key={`ul-${elements.length}`}>
            {listBuffer.items.map((item, idx) => (
              <li key={idx}>{renderInline(item)}</li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`ol-${elements.length}`}>
            {listBuffer.items.map((item, idx) => (
              <li key={idx}>{renderInline(item)}</li>
            ))}
          </ol>
        );
      }
      listBuffer = null;
    }
  };

  const flushTable = () => {
    if (tableBuffer.length >= 2) {
      const rows = tableBuffer.map(r => r.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1));
      const headers = rows[0];
      const dataRows = rows.slice(2); // Skip separator row

      elements.push(
        <div key={`table-${elements.length}`} style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={i}>{renderInline(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci}>{renderInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    tableBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code Block Delimiter
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        const codeText = codeBuffer.join('\n');
        elements.push(
          <CodeBlock
            key={`code-${elements.length}`}
            code={codeText}
            language={codeLanguage || 'code'}
          />
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        flushList();
        flushTable();
        inCodeBlock = true;
        codeLanguage = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Tables
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      flushList();
      tableBuffer.push(line.trim());
      continue;
    } else if (tableBuffer.length > 0) {
      flushTable();
    }

    // Headings
    if (line.startsWith('### ')) {
      flushList();
      elements.push(<h3 key={`h3-${elements.length}`}>{renderInline(line.slice(4))}</h3>);
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      elements.push(<h2 key={`h2-${elements.length}`}>{renderInline(line.slice(3))}</h2>);
      continue;
    }
    if (line.startsWith('# ')) {
      flushList();
      elements.push(<h1 key={`h1-${elements.length}`}>{renderInline(line.slice(2))}</h1>);
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      flushList();
      elements.push(<blockquote key={`bq-${elements.length}`}>{renderInline(line.slice(2))}</blockquote>);
      continue;
    }

    // Lists
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const content = line.trim().slice(2);
      if (!listBuffer || listBuffer.type !== 'ul') {
        flushList();
        listBuffer = { type: 'ul', items: [content] };
      } else {
        listBuffer.items.push(content);
      }
      continue;
    }

    const numListMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
    if (numListMatch) {
      const content = numListMatch[2];
      if (!listBuffer || listBuffer.type !== 'ol') {
        flushList();
        listBuffer = { type: 'ol', items: [content] };
      } else {
        listBuffer.items.push(content);
      }
      continue;
    }

    flushList();

    // Regular paragraph or empty line
    if (line.trim()) {
      elements.push(<p key={`p-${elements.length}`}>{renderInline(line)}</p>);
    }
  }

  flushList();
  flushTable();

  if (inCodeBlock && codeBuffer.length > 0) {
    elements.push(
      <CodeBlock
        key={`code-${elements.length}`}
        code={codeBuffer.join('\n')}
        language={codeLanguage || 'text'}
      />
    );
  }

  return elements;
}

function renderInline(text: string): React.ReactNode {
  // Simple regex for bold, inline code, and links
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    // Check for inline code `...`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      parts.push(
        <code key={keyIdx++} className="inline-code">
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Check for bold **...**
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      parts.push(
        <strong key={keyIdx++}>
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Check for italic *...*
    const italicMatch = remaining.match(/^\*([^*]+)\*/);
    if (italicMatch) {
      parts.push(
        <em key={keyIdx++}>
          {italicMatch[1]}
        </em>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Plain text until next token
    const nextSpecial = remaining.search(/[`*]/);
    if (nextSpecial === -1) {
      parts.push(remaining);
      break;
    } else if (nextSpecial > 0) {
      parts.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    } else {
      // Single stray symbol
      parts.push(remaining[0]);
      remaining = remaining.slice(1);
    }
  }

  return parts;
}

const CodeBlock: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block-wrapper">
      <div className="code-header">
        <span>{language.toUpperCase() || 'CODE'}</span>
        <button className="copy-btn" onClick={handleCopy} title="Copy code">
          {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="code-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
};
