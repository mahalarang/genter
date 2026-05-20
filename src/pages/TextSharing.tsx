import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Send, Copy, Pencil, Trash2, X, CheckCheck, User, Clock, FileText, Wifi } from "lucide-react";
import type { TextItem } from "@/lib/types";

// ─── helpers ────────────────────────────────────────────────────────────────

function summarize(text: string, maxLen = 120): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > maxLen ? flat.slice(0, maxLen) + "…" : flat;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

// ─── TextSharing page ────────────────────────────────────────────────────────

const TextSharing: React.FC = () => {
  const [items, setItems] = useState<TextItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");

  // Detail popup
  const [selected, setSelected] = useState<TextItem | null>(null);
  const [copied, setCopied] = useState(false);

  // Edit mode (inside popup)
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  // Add form
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── fetch ────────────────────────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/texts");
      const data: TextItem[] = await res.json();
      setItems(data.slice().reverse()); // newest first
    } catch (err) {
      console.error("Failed fetching texts", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    const timer = setInterval(fetchItems, 10_000); // poll every 10 s
    return () => clearInterval(timer);
  }, [fetchItems]);

  // ── filter ───────────────────────────────────────────────────────────────
  const filtered = items.filter((i) => i.title.toLowerCase().includes(query.toLowerCase()));

  // ── add text ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e: { title?: string; content?: string } = {};
    if (!formTitle.trim()) e.title = "Title is required";
    if (!formContent.trim()) e.content = "Content is required";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/texts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: formTitle, content: formContent }),
      });
      const newItem: TextItem = await res.json();
      setItems((prev) => [newItem, ...prev]);
      setFormTitle("");
      setFormContent("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── copy ─────────────────────────────────────────────────────────────────
  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── delete ───────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (deleteTarget === null) return;
    await fetch(`/api/texts/${deleteTarget}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== deleteTarget));
    setDeleteTarget(null);
    setSelected(null);
  };

  // ── edit save ─────────────────────────────────────────────────────────────
  const handleEditSave = async () => {
    if (!selected) return;
    await fetch(`/api/texts/${selected.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle, content: editContent }),
    });
    const updated = { ...selected, title: editTitle, content: editContent };
    setItems((prev) => prev.map((i) => (i.id === selected.id ? updated : i)));
    setSelected(updated);
    setIsEditing(false);
  };

  // ── auto-grow textarea ────────────────────────────────────────────────────
  const autoGrow = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground shrink-0">
              <Wifi size={20} />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight leading-none">Text Sharing</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Share text across devices on the same network instantly</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              id="search-texts"
              type="text"
              placeholder="Search by title…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Cards ── */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-4 animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-4/5" />
                <div className="flex gap-2 pt-1">
                  <div className="h-3 bg-muted rounded w-16" />
                  <div className="h-3 bg-muted rounded w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
            <FileText size={40} strokeWidth={1.2} />
            <p className="text-sm">{query ? `No results for "${query}"` : "No texts yet — paste something below!"}</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((item) => (
              <button
                key={item.id}
                id={`text-card-${item.id}`}
                onClick={() => {
                  setSelected(item);
                  setIsEditing(false);
                  setCopied(false);
                }}
                className="text-left rounded-xl border bg-card p-4 hover:border-primary/50 hover:shadow-md transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-3">{summarize(item.content)}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User size={11} />
                    {item.name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {formatTime(item.timestamp)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* ── Add form (sticky bottom) ── */}
      <div className="sticky bottom-0 z-10 border-t bg-card/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 py-3 space-y-2">
          {/* Title field */}
          <div>
            <input
              id="form-title"
              type="text"
              placeholder="Title *"
              value={formTitle}
              onChange={(e) => {
                setFormTitle(e.target.value);
                if (errors.title) setErrors((p) => ({ ...p, title: undefined }));
              }}
              className={`w-full px-3 py-2 rounded-lg border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60 ${errors.title ? "border-destructive" : ""}`}
            />
            {errors.title && <p className="text-destructive text-xs mt-1">{errors.title}</p>}
          </div>

          {/* Content + submit row */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <textarea
                id="form-content"
                ref={textareaRef}
                rows={2}
                placeholder="Paste or type your text here… *"
                value={formContent}
                onChange={(e) => {
                  setFormContent(e.target.value);
                  autoGrow(e);
                  if (errors.content) setErrors((p) => ({ ...p, content: undefined }));
                }}
                className={`w-full px-3 py-2 rounded-lg border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60 resize-none min-h-[72px] max-h-48 overflow-y-auto ${errors.content ? "border-destructive" : ""}`}
              />
              {errors.content && <p className="text-destructive text-xs mt-1">{errors.content}</p>}
            </div>
            <button
              id="submit-text"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="shrink-0 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 h-[72px]"
            >
              {isSubmitting ? (
                <span className="animate-spin inline-block w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full" />
              ) : (
                <Send size={16} />
              )}
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Detail / View popup ── */}
      {selected && !deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelected(null);
              setIsEditing(false);
            }
          }}
        >
          <div className="relative bg-card border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Popup header */}
            <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b gap-3">
              {isEditing ? (
                <input
                  id="edit-title-input"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 text-base font-semibold bg-background border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              ) : (
                <h2 className="font-bold text-base leading-snug flex-1 pr-2">{selected.title}</h2>
              )}
              <button
                id="close-popup"
                onClick={() => {
                  setSelected(null);
                  setIsEditing(false);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
              >
                <X size={18} />
              </button>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-4 px-5 py-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <User size={12} />
                {selected.name}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {formatTime(selected.timestamp)}
              </span>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {isEditing ? (
                <textarea
                  id="edit-content-textarea"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full min-h-[200px] bg-background border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              ) : (
                <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans wrap-break-word">{selected.content}</pre>
              )}
            </div>

            {/* Action bar */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t">
              {isEditing ? (
                <>
                  <button
                    id="edit-cancel-btn"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 rounded-lg text-sm border hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    id="edit-save-btn"
                    onClick={handleEditSave}
                    className="px-3 py-1.5 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary-hover transition-colors font-medium"
                  >
                    Save
                  </button>
                </>
              ) : (
                <>
                  {/* Copy */}
                  <button
                    id="copy-btn"
                    title="Copy content"
                    onClick={() => handleCopy(selected.content)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border hover:bg-muted transition-colors"
                  >
                    {copied ? <CheckCheck size={15} className="text-green-500" /> : <Copy size={15} />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  {/* Edit */}
                  <button
                    id="edit-btn"
                    title="Edit"
                    onClick={() => {
                      setEditTitle(selected.title);
                      setEditContent(selected.content);
                      setIsEditing(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border hover:bg-muted transition-colors"
                  >
                    <Pencil size={15} />
                    Edit
                  </button>
                  {/* Delete */}
                  <button
                    id="delete-btn"
                    title="Delete"
                    onClick={() => setDeleteTarget(selected.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 size={15} />
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm popup ── */}
      {deleteTarget !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteTarget(null);
          }}
        >
          <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-bold text-base mb-2">Delete this text?</h3>
            <p className="text-sm text-muted-foreground mb-6">This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button
                id="delete-cancel-btn"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                id="delete-confirm-btn"
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive-hover transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer className="w-full text-center py-4 border-t bg-muted/20 text-muted-foreground text-xs mt-auto">
        Made by{" "}
        <a href="#" className="font-medium hover:text-foreground transition-colors">
          @johnmahalarang
        </a>
      </footer>
    </div>
  );
};

export default TextSharing;
