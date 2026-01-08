import { useCallback, useRef, useEffect } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import { PartialBlock } from '@blocknote/core';
import { useTheme } from 'next-themes';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/shadcn/style.css';

interface ProjectEditorProps {
  initialContent?: unknown[];
  onChange?: (content: unknown[]) => void;
  editable?: boolean;
}

export function ProjectEditor({ initialContent, onChange, editable = true }: ProjectEditorProps) {
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const { resolvedTheme } = useTheme();

  const content = initialContent && initialContent.length > 0 
    ? initialContent as PartialBlock[]
    : undefined;

  const editor = useCreateBlockNote({
    initialContent: content,
  });

  // Handle content changes with debounce
  const handleChange = useCallback(() => {
    if (!onChange) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      const blocks = editor.document;
      onChange(blocks);
    }, 500);
  }, [editor, onChange]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-[500px] [&_.bn-container]:bg-transparent [&_.bn-editor]:min-h-[500px]">
      <BlockNoteView 
        editor={editor} 
        editable={editable}
        onChange={handleChange}
        theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      />
    </div>
  );
}
