'use client';
import { useMemo } from 'react';
import { treeSourceCode } from '@/lib/source-tree';

const KEYWORDS = new Set([
  'import', 'export', 'default', 'function', 'const', 'let', 'var', 'return',
  'if', 'else', 'for', 'while', 'continue', 'break', 'switch', 'case',
  'type', 'interface', 'new', 'await', 'async', 'from', 'as', 'typeof', 'in', 'of'
]);

const BUILTINS = new Set([
  'Math', 'Array', 'String', 'ResizeObserver', 'HTMLCanvasElement',
  'CanvasRenderingContext2D', 'requestAnimationFrame', 'cancelAnimationFrame',
  'useRef', 'useEffect', 'useMemo', 'useState', 'useCallback'
]);

function tokenizeLine(code: string) {
  const commentIdx = code.indexOf('//');
  if (commentIdx !== -1 && !code.slice(0, commentIdx).includes("'") && !code.slice(0, commentIdx).includes('"')) {
    const codePart = code.slice(0, commentIdx);
    const commentPart = code.slice(commentIdx);
    return (
      <>
        {tokenizeTokens(codePart)}
        <span className="syntax-comment">{commentPart}</span>
      </>
    );
  }
  return tokenizeTokens(code);
}

function tokenizeTokens(code: string) {
  const regex = /('(\\.|[^'])*'|"(\\.|[^"])*"|`(\\.|[^`])*`)|([a-zA-Z_$][a-zA-Z0-9_$]*)|(\b\d+(\.\d+)?\b)|([^\s\w]+|\s+)/g;
  const elements: React.ReactNode[] = [];
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(code)) !== null) {
    const [raw, str, , , , id, num] = match;
    if (str) {
      elements.push(<span key={key++} className="syntax-str">{str}</span>);
    } else if (id) {
      if (KEYWORDS.has(id)) {
        elements.push(<span key={key++} className="syntax-kw">{id}</span>);
      } else if (BUILTINS.has(id)) {
        elements.push(<span key={key++} className="syntax-type">{id}</span>);
      } else {
        elements.push(<span key={key++}>{id}</span>);
      }
    } else if (num) {
      elements.push(<span key={key++} className="syntax-num">{num}</span>);
    } else {
      elements.push(<span key={key++}>{raw}</span>);
    }
  }
  return elements;
}

export default function CodeStream({
  motion,
  styleLabel,
  styleName,
}: {
  motion: boolean;
  styleLabel: string;
  styleName: string;
}) {
  const renderedBlock = useMemo(() => {
    return treeSourceCode.map((line, idx) => (
      <div key={idx} className="code-row">
        <span className="line-number">{String(idx + 1).padStart(3, '0')}</span>
        <code>{tokenizeLine(line)}</code>
      </div>
    ));
  }, []);

  return (
    <div className="terminal" aria-label="실제 크리스마스 트리 소스 코드 스트리밍 터미널">
      <div className="terminal-bar">
        <span className="terminal-title">
          <b className="dots">● ● ●</b>
          <span className="file-tab">app/tree.tsx</span>
          <span className="file-info">· {treeSourceCode.length} lines · {styleName}</span>
        </span>
        <span className="running">
          <i /> {motion ? 'streaming' : 'paused'} <span>· TypeScript</span>
        </span>
      </div>
      <div className="code-lines" aria-hidden="true">
        <div className="code-scroll-track">
          <div className="code-block">{renderedBlock}</div>
          <div className="code-block" aria-hidden="true">{renderedBlock}</div>
        </div>
      </div>
    </div>
  );
}
