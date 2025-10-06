"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { mintJWT, searchNotes, createNote, updateNote, deleteNote, getNote } from "@/lib/orionClient";
import RichTextEditor from "@/components/notes/RichTextEditor";
import { Plus, Search, Edit, Trash2, X, Save, Tag } from "lucide-react";

interface Note {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export default function NotesPage() {
  const { data: session } = useSession();
  const sub = session?.user?.email ?? "";
  
  // Search state
  const [q, setQ] = useState("");
  const [semantic, setSemantic] = useState(true);
  const [k, setK] = useState(8);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Array<{ id?: string; title?: string; snippet?: string }>>([]);

  // Editor state
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // My notes state
  const [myNotes, setMyNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);

  // Load user's notes on mount
  useEffect(() => {
    if (sub) {
      loadMyNotes();
    }
  }, [sub]);

  async function loadMyNotes() {
    if (!sub) return;
    try {
      setNotesLoading(true);
      const token = await mintJWT(sub);
      // This will be implemented in backend
      const res = await fetch(`/api/notes/user/${encodeURIComponent(sub)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyNotes(data.notes || []);
      }
    } catch (e) {
      console.error('Failed to load notes:', e);
    } finally {
      setNotesLoading(false);
    }
  }

  async function onSearch() {
    setSearchError(null);
    if (!q) return;
    if (!sub) { setSearchError("no_sub"); return; }
    if (encodeURIComponent(q).length > 2000) { setSearchError("query_too_long"); return; }
    try {
      setSearchLoading(true);
      const token = await mintJWT(sub);
      const res = await searchNotes(q, k, semantic, token);
      setSearchResults(res.items || []);
    } catch (e: any) {
      setSearchError(e?.message || "search_failed");
    } finally {
      setSearchLoading(false);
    }
  }

  function openNewNote() {
    setEditingNote(null);
    setNoteTitle("");
    setNoteContent("");
    setNoteTags([]);
    setShowEditor(true);
    setSaveError(null);
  }

  function openEditNote(note: Note) {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteTags(note.tags || []);
    setShowEditor(true);
    setSaveError(null);
  }

  function closeEditor() {
    setShowEditor(false);
    setEditingNote(null);
    setNoteTitle("");
    setNoteContent("");
    setNoteTags([]);
    setSaveError(null);
  }

  function addTag() {
    if (tagInput.trim() && !noteTags.includes(tagInput.trim())) {
      setNoteTags([...noteTags, tagInput.trim()]);
      setTagInput("");
    }
  }

  function removeTag(tag: string) {
    setNoteTags(noteTags.filter(t => t !== tag));
  }

  async function saveNote() {
    if (!sub) { setSaveError("no_sub"); return; }
    if (!noteTitle.trim()) { setSaveError("Title is required"); return; }
    if (!noteContent.trim()) { setSaveError("Content is required"); return; }

    try {
      setSaveLoading(true);
      setSaveError(null);
      const token = await mintJWT(sub);

      const noteData = {
        title: noteTitle.trim(),
        content: noteContent,
        tags: noteTags,
        user_email: sub
      };

      if (editingNote) {
        // Update existing note
        await updateNote(editingNote.id, noteData, token);
      } else {
        // Create new note
        await createNote(noteData, token);
      }

      // Reload notes and close editor
      await loadMyNotes();
      closeEditor();
    } catch (e: any) {
      setSaveError(e?.message || "save_failed");
    } finally {
      setSaveLoading(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!confirm('Delete this note? This cannot be undone.')) return;
    if (!sub) return;

    try {
      const token = await mintJWT(sub);
      await deleteNote(noteId, token);
      await loadMyNotes();
    } catch (e: any) {
      alert(`Failed to delete note: ${e?.message || 'Unknown error'}`);
    }
  }

  return (
    <main className="p-4 pb-24 max-w-screen-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Notes</h1>
        <button
          onClick={openNewNote}
          className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          New Note
        </button>
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {editingNote ? 'Edit Note' : 'New Note'}
              </h2>
              <button onClick={closeEditor} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Title</label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Note title..."
                  className="w-full rounded border px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-muted-foreground border-border focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Tags</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add tag..."
                    className="flex-1 rounded border px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-muted-foreground border-border focus:ring-2 focus:ring-ring focus:border-transparent"
                  />
                  <button
                    onClick={addTag}
                    className="rounded bg-gray-600 px-3 py-2 text-sm text-white hover:bg-gray-700"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {noteTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm"
                    >
                      <Tag size={14} />
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-red-600">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Rich Text Editor */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Content</label>
                <RichTextEditor
                  content={noteContent}
                  onChange={setNoteContent}
                  placeholder="Start writing your note..."
                />
              </div>

              {saveError && <p className="text-sm text-rose-600">Error: {saveError}</p>}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 p-4 border-t">
              <button
                onClick={closeEditor}
                className="rounded border px-4 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={saveNote}
                disabled={saveLoading || !noteTitle.trim() || !noteContent.trim()}
                className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Save size={16} />
                {saveLoading ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Section */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Search size={20} />
          Search Notes
        </h2>
        <div className="flex gap-2 items-center mb-2">
          <input
            className="flex-1 rounded border px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-muted-foreground border-border focus:ring-2 focus:ring-ring focus:border-transparent"
            placeholder="Search notes..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSearch()}
          />
        </div>
        <div className="flex items-center gap-3 mb-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={semantic} onChange={(e) => setSemantic(e.target.checked)} />
            Semantic
          </label>
          <label className="flex items-center gap-2">
            TopK
            <input type="range" min={1} max={25} value={k} onChange={(e) => setK(parseInt(e.target.value))} />
            <span className="w-6 text-right">{k}</span>
          </label>
          <button
            onClick={onSearch}
            disabled={!sub || searchLoading || !q}
            className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
          >
            {searchLoading ? "Searching..." : "Search"}
          </button>
        </div>

        {searchError && <p className="text-sm text-rose-600">Error: {searchError}</p>}

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-3">
            {searchResults.map((it, idx) => (
              <div key={it.id || idx} className="rounded border p-3 text-sm">
                <div className="font-medium">{it.title || `Result ${idx + 1}`}</div>
                <div className="opacity-80 whitespace-pre-wrap">{it.snippet || ""}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Notes Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">My Notes</h2>
        {notesLoading ? (
          <p className="text-sm opacity-70">Loading notes...</p>
        ) : myNotes.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {myNotes.map((note) => (
              <div key={note.id} className="rounded border p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg">{note.title}</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditNote(note)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      title="Edit note"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600"
                      title="Delete note"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {note.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs"
                      >
                        <Tag size={12} />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div
                  className="prose prose-sm max-w-none line-clamp-3"
                  dangerouslySetInnerHTML={{ __html: note.content }}
                />
                {note.updated_at && (
                  <p className="text-xs opacity-60 mt-2">
                    Updated: {new Date(note.updated_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className='text-sm opacity-70'>No notes yet. Click New Note to create one!</p>
        )}
      </div>
    </main>
  );
}

