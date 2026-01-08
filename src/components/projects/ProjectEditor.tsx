import { useEffect, useMemo, useCallback, useRef } from 'react';
import { BlockNoteEditor, PartialBlock } from '@blocknote/core';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

interface ProjectEditorProps {
  initialContent?: unknown[];
  onChange?: (content: unknown[]) => void;
  editable?: boolean;
}

export function ProjectEditor({ initialContent, onChange, editable = true }: ProjectEditorProps) {
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const editor = useMemo(() => {
    const content = initialContent && initialContent.length > 0 
      ? initialContent as PartialBlock[]
      : undefined;

    return BlockNoteEditor.create({
      initialContent: content,
    });
  }, []);

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
        theme="light"
      />
    </div>
  );
}
