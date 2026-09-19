import { useEffect, useState, type FormEvent } from 'react';
import { BookOpen, Check, Plus, Trash2, Upload } from 'lucide-react';
import { api, type Book } from './api';
import { Status } from './LiveShared';

export function LiveBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [cortexBooks, setCortexBooks] = useState<{ id: string; title: string }[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [newBook, setNewBook] = useState({ title: '', author: '', cortexBookId: '' });
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState('');
  const [location, setLocation] = useState('');
  const [highlight, setHighlight] = useState({ text: '', locator: '', note: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const selected = books.find(book => book.id === selectedId) || books[0];

  async function load() {
    setLoading(true); setError('');
    try { const result = await api.books(); setBooks(result.books); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load books.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => { api.cortexBooks().then(result => setCortexBooks(result.books)).catch(() => setCortexBooks([])); }, []);
  useEffect(() => { if (selected) { setPage(selected.currentPage ? String(selected.currentPage) : ''); setLocation(selected.location || ''); } }, [selected?.id, selected?.currentPage, selected?.location]);

  async function addBook(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try { const book = await api.createBook(newBook); await load(); setSelectedId(book.id); setCreating(false); setNewBook({ title: '', author: '', cortexBookId: '' }); setMessage('Book added.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not add book.'); }
    finally { setBusy(false); }
  }
  async function saveCheckpoint(event: FormEvent) {
    event.preventDefault(); if (!selected) return;
    const nextPage = page ? Number(page) : undefined;
    if (nextPage !== undefined && (!Number.isInteger(nextPage) || nextPage < 1)) { setError('Enter a valid page number.'); return; }
    if (location.trim() && (!Number.isInteger(Number(location)) || Number(location) < 1)) { setError('Enter a valid EPUB location number.'); return; }
    setBusy(true); setError(''); setMessage('');
    try { await api.updateBook(selected.id, { currentPage: nextPage, location: location.trim() || undefined }); await load(); setMessage(nextPage ? `Saved at page ${nextPage}.` : 'Reading location saved.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save reading progress.'); }
    finally { setBusy(false); }
  }
  async function upload(file: File) {
    if (!selected) return;
    setBusy(true); setError(''); setMessage('');
    try { await api.uploadBook(selected.id, file); await load(); setMessage(`${file.name} uploaded.`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not upload the book.'); }
    finally { setBusy(false); }
  }
  async function saveHighlight(event: FormEvent) {
    event.preventDefault(); if (!selected) return;
    setBusy(true); setError(''); setMessage('');
    try { await api.addHighlight(selected.id, highlight); await load(); setHighlight({ text: '', locator: '', note: '' }); setMessage('Highlight added.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save highlight.'); }
    finally { setBusy(false); }
  }
  async function removeBook() {
    if (!selected || !window.confirm(`Delete “${selected.title}” and its file and highlights?`)) return;
    setBusy(true); setError(''); setMessage('');
    try { await api.deleteBook(selected.id); setSelectedId(''); await load(); setMessage('Book deleted.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not delete book.'); }
    finally { setBusy(false); }
  }

  return <div className="pocket-books live-books"><div className="pocket-heading"><span>Your library</span><h1>Read at your pace.</h1><p>Cards only use pages you have reached.</p></div>
    <div className="live-library-actions"><select aria-label="Choose book" value={selected?.id || ''} onChange={event => { setSelectedId(event.target.value); setMessage(''); }}><option value="" disabled>Select a book</option>{books.map(book => <option key={book.id} value={book.id}>{book.title}</option>)}</select><button className="live-action" type="button" onClick={() => setCreating(value => !value)}><Plus size={18} /> Add book</button></div>
    {error && <div className="live-inline-error" role="alert">{error}</div>}{message && <div className="live-success" role="status"><Check size={16} /> {message}</div>}
    {creating && <form className="live-editor" onSubmit={event => void addBook(event)}><h2>Add a book</h2><label>Link to Cortex book (optional)<select value={newBook.cortexBookId} onChange={event => { const chosen = cortexBooks.find(book => book.id === event.target.value); setNewBook(value => ({ ...value, cortexBookId: event.target.value, title: chosen?.title || value.title })); }}><option value="">Custom book</option>{cortexBooks.map(book => <option key={book.id} value={book.id}>{book.title}</option>)}</select></label><label>Title<input required value={newBook.title} onChange={event => setNewBook(value => ({ ...value, title: event.target.value }))} /></label><label>Author<input value={newBook.author} onChange={event => setNewBook(value => ({ ...value, author: event.target.value }))} /></label><button className="live-action" type="submit" disabled={busy}>Add book</button></form>}
    {!books.length && <Status loading={loading} error={error} retry={() => void load()} />}
    {!loading && !error && !books.length && !creating && <div className="live-empty">Add a PDF or EPUB to start tracking your reading.</div>}
    {selected && <div className="pocket-books-layout"><section className="pocket-book-feature"><div className="pocket-book-art"><BookOpen size={58} strokeWidth={1} /><span>{selected.title.slice(0, 2).toUpperCase()}</span></div><div className="pocket-book-details"><span>Currently reading</span><h2>{selected.title}</h2><p>{selected.author || 'Author not set'}</p><div className="pocket-book-stats"><span><strong>{selected.currentPage || '—'}</strong> current page</span><span><strong>{selected.highlightCount || 0}</strong> highlights</span></div></div></section>
      <section className="pocket-checkpoint"><span className="pocket-section-kicker">Reading checkpoint</span><h2>Where did you stop?</h2><p>New cards can use this page and earlier pages.</p><form onSubmit={event => void saveCheckpoint(event)}><label htmlFor="live-book-page">Current PDF page</label><div><input id="live-book-page" type="number" min="1" value={page} onChange={event => setPage(event.target.value)} /><button type="submit" disabled={busy}>Save page</button></div><label htmlFor="live-book-location">EPUB location number</label><input id="live-book-location" type="number" min="1" value={location} onChange={event => setLocation(event.target.value)} placeholder="128" /><button className="live-secondary" type="submit" disabled={busy}>Save location</button></form></section>
      <section className="live-book-extras"><div className="pocket-section-head"><h2>Source material</h2><span>{selected.fileName || 'No file yet'}</span></div><label className="live-upload"><Upload size={20} /> Upload PDF or EPUB<input type="file" accept=".pdf,.epub,application/pdf,application/epub+zip" disabled={busy} onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ''; }} /></label>
        <form onSubmit={event => void saveHighlight(event)}><h3>Add a highlight</h3><label>Passage<textarea required rows={3} value={highlight.text} onChange={event => setHighlight(value => ({ ...value, text: event.target.value }))} /></label><div className="live-form-row"><label>PDF page or EPUB location number<input required type="number" min="1" value={highlight.locator} onChange={event => setHighlight(value => ({ ...value, locator: event.target.value }))} /></label><label>Note<input value={highlight.note} onChange={event => setHighlight(value => ({ ...value, note: event.target.value }))} /></label></div><button className="live-action" type="submit" disabled={busy}>Save highlight</button></form><button className="live-danger" type="button" onClick={() => void removeBook()} disabled={busy}><Trash2 size={16} /> Delete book</button>
      </section></div>}
  </div>;
}
