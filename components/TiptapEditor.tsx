'use client';

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { uploadToStorage } from '@/lib/storage';
import { BoldIcon, ItalicIcon, UnderlineIcon, Heading1, Heading2, ImageIcon, LinkIcon, List, Quote } from 'lucide-react';
import { useCallback, useState } from 'react';

export default function TiptapEditor({ 
  content, 
  onChange 
}: { 
  content: string; 
  onChange: (html: string) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = useCallback(async (file: File, editor: any) => {
    try {
      setIsUploading(true);
      const url = await uploadToStorage(file, 'post-images');
      editor.chain().focus().setImage({ src: url }).run();
    } catch (error) {
      console.error('Failed to upload image', error);
      alert('Erro ao enviar imagem.');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Bold,
      Italic,
      Underline,
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: true }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] text-[var(--text-main)]',
      }
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const addImage = () => {
    if (!editor) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      if (input.files?.length) {
        await handleImageUpload(input.files[0], editor);
      }
    };
    input.click();
  };

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return <div className="min-h-[400px] flex items-center justify-center text-[var(--text-main)]/40 font-medium">Carregando Editor...</div>;
  }

  return (
    <div className="w-full flex flex-col border border-[var(--border)] rounded-2xl overflow-hidden bg-[var(--surface)] shadow-2xl transition-colors">
      
      {/* Menu Principal (Toolbar) */}
      <div className="flex flex-wrap items-center gap-1.5 p-3 border-b border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)]/60 shrink-0">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded-lg hover:bg-[var(--border)] transition-all ${editor.isActive('bold') ? 'bg-[var(--border)] text-brand-2 shadow-sm' : ''}`}
          title="Negrito"
        >
          <BoldIcon size={20} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded-lg hover:bg-[var(--border)] transition-all ${editor.isActive('italic') ? 'bg-[var(--border)] text-brand-2 shadow-sm' : ''}`}
          title="Itálico"
        >
          <ItalicIcon size={20} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-2 rounded-lg hover:bg-[var(--border)] transition-all ${editor.isActive('underline') ? 'bg-[var(--border)] text-brand-2 shadow-sm' : ''}`}
          title="Sublinhado"
        >
          <UnderlineIcon size={20} />
        </button>

        <div className="w-px h-6 bg-[var(--border)] mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 rounded-lg hover:bg-[var(--border)] transition-all ${editor.isActive('heading', { level: 1 }) ? 'bg-[var(--border)] text-brand-2 shadow-sm' : ''}`}
          title="Título 1"
        >
          <Heading1 size={20} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded-lg hover:bg-[var(--border)] transition-all ${editor.isActive('heading', { level: 2 }) ? 'bg-[var(--border)] text-brand-2 shadow-sm' : ''}`}
          title="Título 2"
        >
          <Heading2 size={20} />
        </button>
        
        <div className="w-px h-6 bg-[var(--border)] mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded-lg hover:bg-[var(--border)] transition-all ${editor.isActive('bulletList') ? 'bg-[var(--border)] text-brand-2 shadow-sm' : ''}`}
          title="Lista"
        >
          <List size={20} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded-lg hover:bg-[var(--border)] transition-all ${editor.isActive('blockquote') ? 'bg-[var(--border)] text-brand-2 shadow-sm' : ''}`}
          title="Citação"
        >
          <Quote size={20} />
        </button>
        
        <div className="w-px h-6 bg-[var(--border)] mx-1" />

        <button
          onClick={setLink}
          className={`p-2 rounded-lg hover:bg-[var(--border)] transition-all ${editor.isActive('link') ? 'bg-[var(--border)] text-brand-2 shadow-sm' : ''}`}
          title="Adicionar Link"
        >
          <LinkIcon size={20} />
        </button>

        <button
          onClick={addImage}
          disabled={isUploading}
          className="px-4 py-2 disabled:opacity-50 rounded-xl hover:bg-brand-2 hover:text-white transition-all ml-auto flex items-center gap-2 text-sm font-bold border border-transparent hover:shadow-lg"
          title="Upload Imagem"
        >
          <ImageIcon size={18} /> <span className="hidden sm:inline">{isUploading ? 'Enviando...' : 'Imagem'}</span>
        </button>
      </div>

      {/* Bubble Menu */}
      {editor && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex bg-[var(--bg-main)] border border-[var(--border)] text-[var(--text-main)] rounded-xl shadow-2xl overflow-hidden p-1 gap-1">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded-lg hover:bg-[var(--border)] transition-colors ${editor.isActive('bold') ? 'text-brand-2' : ''}`}
          >
            <BoldIcon size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded-lg hover:bg-[var(--border)] transition-colors ${editor.isActive('italic') ? 'text-brand-2' : ''}`}
          >
            <ItalicIcon size={16} />
          </button>
          <button
            onClick={setLink}
            className={`p-2 rounded-lg hover:bg-[var(--border)] transition-colors ${editor.isActive('link') ? 'text-brand-2' : ''}`}
          >
            <LinkIcon size={16} />
          </button>
        </BubbleMenu>
      )}

      {/* Área de Edição */}
      <div className="p-4 sm:p-10 bg-[var(--bg-main)] flex-1 overflow-y-auto cursor-text" onClick={() => editor.commands.focus()}>
        <div className="max-w-4xl mx-auto bg-[var(--surface)] min-h-full p-8 sm:p-12 shadow-inner rounded-3xl border border-[var(--border)]">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
