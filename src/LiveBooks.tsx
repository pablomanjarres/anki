import { useEffect, useState, type FormEvent } from 'react';
import { BookOpen, Check, ChevronDown, Minus, Plus, Trash2, Upload } from 'lucide-react';
import { api, type Book } from './api';
import { Status } from './LiveShared';

const blankBook = { title: '', author: '', cortexBookId: '' };
const blankHighlight = { text: '', locator: '', note: '' };

export function LiveBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [cortexBooks, setCortexBooks] = useState<{ id: string; title: string }[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [newBook, setNewBook] = useState(blankBook);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState('');
  const [location, setLocation] = useState('');
  const [highlight, setHighlight] = useState(blankHighlight);
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
    try { const book = await api.createBook(newBook); await load(); setSelectedId(book.id); setCreating(false); setLibraryOpen(false); setNewBook(blankBook); setMessage('Book added.'); }
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
    try { await api.addHighlight(selected.id, highlight); await load(); setHighlight(blankHighlight); setMessage('Highlight added.'); }
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

  return <div className="live-books soft-live-books">
    <div className="soft-books-intro"><span>Your library</span><h1>Read your way.</h1><p>Cards follow the pages you have actually read.</p></div>

    {error && (books.length > 0 || creating) && <div className="live-inline-error" role="alert">{error}</div>}
    {message && <div className="live-success" role="status"><Check size={16} /> {message}</div>}
    {!books.length && (loading || (!creating && error)) && <Status loading={loading} error={error} retry={() => void load()} />}

    {!loading && !error && !books.length && !creating && <section className="soft-books-empty">
      <div><span>Start here</span><h2>Your reading starts a new deck.</h2><p>Add a PDF or EPUB to track your place and create cards from pages you have read.</p>
        <button type="button" onClick={() => setCreating(true)}><Plus size={18} /> Add a book</button></div>
      <img src="/design/star.webp" alt="Smiling golden star" />
    </section>}

    {selected && <>
      <section className="soft-book-hero" aria-label="Current book">
        <div className="soft-book-hero-copy"><span>Currently reading</span><h2>{selected.title}</h2><p>{selected.author || 'Author not set'}</p>
          <div className="soft-book-page-token"><strong>{selected.currentPage || selected.location || '—'}</strong><span>{selected.currentPage ? 'current\npage' : selected.location ? 'EPUB\nlocation' : 'set your\nplace'}</span></div>
        </div>
        <button className="soft-book-switch" type="button" aria-expanded={libraryOpen} aria-controls="live-library-panel" onClick={() => setLibraryOpen(value => !value)}><BookOpen size={15} /> Your books <ChevronDown size={14} /></button>
        <img src="/design/moon.webp" alt="Smiling lavender moon" />
      </section>
      {libraryOpen && <div className="soft-library-panel" id="live-library-panel"><label htmlFor="live-book-select">Choose a book</label><select id="live-book-select" value={selected.id} onChange={event => { setSelectedId(event.target.value); setMessage(''); setLibraryOpen(false); }}>
        {books.map(book => <option key={book.id} value={book.id}>{book.title}</option>)}
      </select><button type="button" onClick={() => { setCreating(value => !value); setLibraryOpen(false); }}><Plus size={16} /> Add a book</button></div>}
    </>}

    {creating && <form className="soft-book-create" onSubmit={event => void addBook(event)}><h2>Add a book</h2>
      <label>Link to Cortex book (optional)<select value={newBook.cortexBookId} onChange={event => { const chosen = cortexBooks.find(book => book.id === event.target.value); setNewBook(value => ({ ...value, cortexBookId: event.target.value, title: chosen?.title || value.title })); }}><option value="">Custom book</option>{cortexBooks.map(book => <option key={book.id} value={book.id}>{book.title}</option>)}</select></label>
      <label>Title<input required value={newBook.title} onChange={event => setNewBook(value => ({ ...value, title: event.target.value }))} /></label>
      <label>Author<input value={newBook.author} onChange={event => setNewBook(value => ({ ...value, author: event.target.value }))} /></label>
      <div className="soft-book-create-actions"><button type="submit" disabled={busy}>Add book</button><button type="button" onClick={() => setCreating(false)}>Cancel</button></div>
    </form>}

    {selected && <div className="soft-books-workspace">
      <section className="soft-book-checkpoint" aria-labelledby="live-checkpoint-heading"><div className="soft-book-section-heading"><h2 id="live-checkpoint-heading">Reading checkpoint</h2><BookOpen size={19} /></div><p>Only pages up to your checkpoint can become cards.</p>
        <form onSubmit={event => void saveCheckpoint(event)}><div className="soft-page-stepper"><button type="button" aria-label="Previous PDF page" disabled={busy || !page || Number(page) <= 1} onClick={() => setPage(value => String(Math.max(1, (Number(value) || 1) - 1)))}><Minus size={19} /></button>
          <label htmlFor="live-book-page"><span>PDF page</span><input id="live-book-page" type="number" min="1" inputMode="numeric" value={page} onChange={event => setPage(event.target.value)} placeholder="—" /></label>
          <button type="button" aria-label="Next PDF page" disabled={busy} onClick={() => setPage(value => String((Number(value) || 0) + 1))}><Plus size={19} /></button></div>
          <label className="soft-epub-location" htmlFor="live-book-location">EPUB location <input id="live-book-location" type="number" min="1" inputMode="numeric" value={location} onChange={event => setLocation(event.target.value)} placeholder="Location number" /></label>
          <button className="soft-book-save" type="submit" disabled={busy || (!page && !location.trim())}>Save checkpoint <Check size={18} /></button>
        </form>
      </section>

      <section className="soft-book-material" aria-labelledby="live-material-heading"><div className="soft-book-section-heading"><h2 id="live-material-heading">Source material</h2><span>{selected.highlightCount || 0} highlights</span></div>
        <p className="soft-book-file">{selected.fileName || 'No file uploaded yet'}</p>
        <label className="soft-book-upload"><Upload size={19} /> Upload PDF or EPUB<input type="file" accept=".pdf,.epub,application/pdf,application/epub+zip" disabled={busy} onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ''; }} /></label>
        <form onSubmit={event => void saveHighlight(event)}><h3>Add a highlight</h3>{!selected.currentPage && !selected.location && <p className="live-form-help">Save a reading checkpoint before adding highlights.</p>}
          <label>Passage<textarea required rows={3} value={highlight.text} onChange={event => setHighlight(value => ({ ...value, text: event.target.value }))} /></label>
          <div className="soft-book-form-row"><label>PDF page or EPUB location<input required type="number" min="1" inputMode="numeric" value={highlight.locator} onChange={event => setHighlight(value => ({ ...value, locator: event.target.value }))} /></label><label>Note<input value={highlight.note} onChange={event => setHighlight(value => ({ ...value, note: event.target.value }))} /></label></div>
          <button className="soft-book-highlight-save" type="submit" disabled={busy || (!selected.currentPage && !selected.location)}>Save highlight</button>
        </form>
        <button className="soft-book-delete" type="button" onClick={() => void removeBook()} disabled={busy}><Trash2 size={16} /> Delete book</button>
      </section>
    </div>}
  </div>;
}
