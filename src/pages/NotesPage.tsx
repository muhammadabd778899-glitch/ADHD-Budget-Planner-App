import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { Badge, Disclosure, EmptyState, InlineNotice } from '@/components/ui/Feedback';
import { Field, FormErrorSummary, Select, TextInput, Textarea } from '@/components/ui/Form';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAppData } from '@/state/AppDataProvider';
import type { Note, NoteKind } from '@/domain/types';
import { formatMonth, monthKey, todayISO } from '@/lib/dates';

const EMPTY_NOTES: Note[] = [];

type KindFilter = 'all' | NoteKind;

const KIND_LABELS: Record<NoteKind, string> = {
  'brain-dump': 'Brain dump',
  month: 'Month note',
};

export function NotesPage() {
  const { snapshot, actions, busy } = useAppData();
  const baseId = useId();
  const notes = snapshot?.notes ?? EMPTY_NOTES;
  const locale = snapshot?.settings.locale ?? 'en-US';
  const [kind, setKind] = useState<NoteKind>('brain-dump');
  const [month, setMonth] = useState(monthKey(todayISO()));
  const [text, setText] = useState('');
  const [filter, setFilter] = useState<KindFilter>('all');
  const [editing, setEditing] = useState<Note | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Note | null>(null);

  const activeNotes = notes.filter((note) => !note.archived);
  const archivedNotes = notes.filter((note) => note.archived);
  const visibleNotes = activeNotes.filter((note) => filter === 'all' || note.kind === filter);

  function resetComposer() {
    setEditing(null);
    setKind('brain-dump');
    setMonth(monthKey(todayISO()));
    setText('');
    setErrors({});
    setFormErrors([]);
  }

  function startEdit(note: Note) {
    setEditing(note);
    setKind(note.kind);
    setMonth(note.month ?? monthKey(todayISO()));
    setText(note.text);
    setErrors({});
    setFormErrors([]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const summaries: string[] = [];
    if (!text.trim()) {
      nextErrors.text = 'Write something first.';
      summaries.push(nextErrors.text);
    }
    if (text.trim().length > 4000) {
      nextErrors.text = 'Keep the note under 4000 characters.';
      summaries.push(nextErrors.text);
    }
    if (kind === 'month' && !month) {
      nextErrors.month = 'Choose a month.';
      summaries.push(nextErrors.month);
    }
    setErrors(nextErrors);
    setFormErrors(summaries);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const input = { kind, month: kind === 'month' ? month : null, text };
      if (editing) await actions.updateNote(editing.id, input);
      else await actions.createNote(input);
      resetComposer();
    } catch {
      // Provider toast keeps the draft intact.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Think"
        title="Brain dump & month notes"
        description="Some money thoughts are not transactions. Put them here first, then decide what they mean later."
      />

      <InlineNotice tone="info" title="Nothing here changes your plan">
        Notes are free text. They are not spending, income, or advice. They are simply a place to
        clear your head, and they stay on this device.
      </InlineNotice>

      <div className="notes-grid">
        <Card>
          <CardHeader
            eyebrow={editing ? 'Editing' : 'New note'}
            title={editing ? 'Update this note' : 'Write it down'}
            description="A brain dump can be a list, a worry, or an idea. A month note belongs to one month."
          />
          <CardBody>
            <form onSubmit={handleSubmit} noValidate className="stack">
              <FormErrorSummary errors={formErrors} />
              <div className="form-grid form-grid--2">
                <Field label="Note type" htmlFor={`${baseId}-kind`}>
                  <Select
                    id={`${baseId}-kind`}
                    value={kind}
                    onChange={(event) => setKind(event.target.value as NoteKind)}
                  >
                    <option value="brain-dump">Brain dump</option>
                    <option value="month">Month note</option>
                  </Select>
                </Field>
                {kind === 'month' ? (
                  <Field label="Month" htmlFor={`${baseId}-month`} error={errors.month} required>
                    <TextInput
                      id={`${baseId}-month`}
                      type="month"
                      value={month}
                      onChange={(event) => setMonth(event.target.value)}
                      invalid={Boolean(errors.month)}
                    />
                  </Field>
                ) : null}
              </div>
              <Field
                label="Note"
                htmlFor={`${baseId}-text`}
                error={errors.text}
                hint="Up to 4000 characters."
                required
              >
                <Textarea
                  id={`${baseId}-text`}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  rows={6}
                  maxLength={4000}
                  placeholder="What is on your mind about money right now?"
                  autoFocus
                  invalid={Boolean(errors.text)}
                  aria-describedby={errors.text ? `${baseId}-text-error` : undefined}
                />
              </Field>
              <div className="inline-actions">
                <Button type="submit" loading={submitting || busy} icon="plus">
                  {editing ? 'Save changes' : 'Save note'}
                </Button>
                {editing ? (
                  <Button variant="ghost" onClick={resetComposer} disabled={submitting}>
                    Cancel edit
                  </Button>
                ) : null}
              </div>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            eyebrow="Notes"
            title={filter === 'all' ? 'Everything' : KIND_LABELS[filter]}
            description="Pinned notes stay at the top. Archive one when it is no longer useful without losing it."
            action={
              <Select
                value={filter}
                onChange={(event) => setFilter(event.target.value as KindFilter)}
                aria-label="Filter notes"
              >
                <option value="all">All notes</option>
                <option value="brain-dump">Brain dumps</option>
                <option value="month">Month notes</option>
              </Select>
            }
          />
          <CardBody>
            {visibleNotes.length === 0 ? (
              <EmptyState
                icon="spark"
                title={
                  activeNotes.length === 0 ? 'Nothing written yet' : 'Nothing matches that filter'
                }
                description={
                  activeNotes.length === 0
                    ? 'Use the form to clear your head. You can always edit or archive a note later.'
                    : 'Try another note type, or write something new.'
                }
              />
            ) : (
              <ul className="notes-list">
                {visibleNotes.map((note) => (
                  <li className="note-card" key={note.id}>
                    <div className="note-card__head">
                      <div className="note-card__meta">
                        <Badge tone={note.kind === 'month' ? 'info' : 'neutral'}>
                          {KIND_LABELS[note.kind]}
                        </Badge>
                        {note.kind === 'month' && note.month ? (
                          <span>{formatMonth(`${note.month}-01`, locale)}</span>
                        ) : null}
                        {note.pinned ? <Badge tone="accent">Pinned</Badge> : null}
                        {note.sample ? <Badge tone="info">Sample</Badge> : null}
                      </div>
                      <div className="inline-actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          icon="flag"
                          aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
                          aria-pressed={note.pinned}
                          onClick={() => void actions.setNotePinned(note.id, !note.pinned)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          icon="edit"
                          aria-label="Edit note"
                          onClick={() => startEdit(note)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          icon="trash"
                          aria-label="Archive note"
                          onClick={() => setArchiveTarget(note)}
                        />
                      </div>
                    </div>
                    <p className="note-card__text">{note.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {archivedNotes.length > 0 ? (
        <Card>
          <CardHeader
            title="Archived notes"
            description="Kept for reference. Restore one to put it back in the list."
          />
          <CardBody>
            <ul className="notes-list">
              {archivedNotes.map((note) => (
                <li className="note-card note-card--archived" key={note.id}>
                  <div className="note-card__head">
                    <div className="note-card__meta">
                      <Badge tone="neutral">{KIND_LABELS[note.kind]}</Badge>
                      {note.kind === 'month' && note.month ? (
                        <span>{formatMonth(`${note.month}-01`, locale)}</span>
                      ) : null}
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void actions.restoreNote(note.id)}
                      disabled={busy}
                    >
                      Restore
                    </Button>
                  </div>
                  <p className="note-card__text">{note.text}</p>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="How notes fit" />
        <CardBody>
          <Disclosure summary="Why keep notes next to a budget?">
            <p className="muted-copy">
              A budget only understands numbers. Notes keep the reason behind them: a bill you are
              worried about, a goal you are saving for, or something you want to remember next
              month. Harbor never reads them, sends them anywhere, or turns them into transactions.
            </p>
          </Disclosure>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={archiveTarget !== null}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => {
          if (archiveTarget) {
            void actions
              .archiveNote(archiveTarget.id)
              .then(() => setArchiveTarget(null))
              .catch(() => undefined);
          }
        }}
        title="Archive this note?"
        description="It leaves your main list but stays available under archived notes. You can restore it any time."
        confirmLabel="Archive note"
        busy={busy}
      />
    </div>
  );
}
