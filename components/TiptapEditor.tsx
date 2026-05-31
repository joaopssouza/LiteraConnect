'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { useRef } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon,
  Quote, List, ListOrdered, ImageIcon, Link2,
} from 'lucide-react';
import { uploadMedia } from '@/lib/supabase-storage';
import { cn } from '@/lib/utils';

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
}

const ToolbarBtn = ({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    title={title}
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    className={cn(
      'p-2 rounded-lg transition-all',
      active
        ? 'bg-brand-2 text-white shadow-sm'
        : 'text-[var(--text-main)]/60 hover:text-[var(--text-main)] hover:bg-[var(--border)]/40',
    )}
  >
    {children}
  </button>
);

export default function TiptapEditor({ content, onChange }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Desabilita extensões que não queremos expor ao usuário
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        bold: false,
        italic: false,
        blockquote: false,
        heading: {
          // Permite apenas H2 e H3 (via atalho), mas não exporemos botão
          levels: [2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-brand-2 underline hover:opacity-80 transition-opacity',
          rel: 'noopener noreferrer nofollow',
          target: '_blank',
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class:
          'min-h-[200px] outline-none text-[var(--text-main)] leading-relaxed text-lg prose prose-invert max-w-none focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  if (!editor) return null;

  return (
    <div className="flex flex-col gap-0">
      {/* Área de edição sem toolbar de estilo */}
      <EditorContent editor={editor} />
    </div>
  );
}
