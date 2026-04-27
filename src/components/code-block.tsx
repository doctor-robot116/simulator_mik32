import React, { useEffect, useRef, useState } from "react";
import hljs from "highlight.js/lib/core";
import c from "highlight.js/lib/languages/c";
import { Check, Copy } from "lucide-react";
import { Button } from "./ui/button";

hljs.registerLanguage("c", c);

interface CodeBlockProps {
  code: string;
  title?: string;
}

export function CodeBlock({ code, title }: CodeBlockProps) {
  const codeRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (codeRef.current) {
      delete codeRef.current.dataset.highlighted;
      hljs.highlightElement(codeRef.current);
    }
  }, [code]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-6 rounded-lg border border-border bg-[#282c34] overflow-hidden">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#3e4451] bg-[#21252b]">
          <span className="text-xs font-medium text-gray-300">{title}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-white hover:bg-[#3e4451]"
            onClick={copyToClipboard}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      )}
      {!title && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-6 w-6 text-gray-400 hover:text-white hover:bg-[#3e4451]"
          onClick={copyToClipboard}
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      )}
      <div className="overflow-x-auto p-4">
        <pre className="!m-0 !p-0">
          <code ref={codeRef} className="language-c text-sm">
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
}
