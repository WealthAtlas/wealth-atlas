import { useNotification } from '@/app/components/providers/NotificationContext';
import { MemoryDraft, MemorySettingsView } from '@/app/components/views/MemorySettingsView';
import { useDatabaseReplaced } from '@/app/utils/useDatabaseReplaced';
import { Memory, MemoryKind } from '@/domain/entities/memory/Memory';
import { MemoryService } from '@/domain/services/MemoryService';
import { Logger } from '@/domain/utils/Logger';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export function MemorySettingsContainer() {
  const { notify } = useNotification();
  const service = useMemo(() => new MemoryService(), []);

  const [enabled, setEnabled] = useState(true);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [draft, setDraft] = useState<MemoryDraft | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  // Held in a ref so `load` does not depend on it and get rebuilt as the user
  // types: a sync pull can land mid-edit, and the row being edited must not be
  // replaced underneath them.
  const draftRef = useRef<MemoryDraft | undefined>(undefined);
  draftRef.current = draft;

  const load = useCallback(async () => {
    const [isEnabled, rows] = await Promise.all([service.isEnabled(), service.getMemories()]);
    setEnabled(isEnabled);
    // The list is safe to adopt regardless — an open editor holds its own copy of
    // the text — but a draft for a row that the pull deleted has nothing left to
    // save onto, so it is dropped rather than left to fail on submit.
    if (draftRef.current?.id !== undefined && !rows.some(row => row.id === draftRef.current?.id)) {
      setDraft(undefined);
    }
    setMemories(rows);
  }, [service]);

  useEffect(() => {
    load().catch(error => {
      Logger.error('Failed to load assistant memory:', error);
      notify('Could not load what the assistant remembers', 'error');
    });
  }, [load, notify]);

  useDatabaseReplaced(() => {
    load().catch(error => Logger.error('Failed to reload assistant memory:', error));
  });

  const onEnabledChange = useCallback(
    (next: boolean) => {
      setEnabled(next);
      service
        .setEnabled(next)
        .then(() =>
          notify(
            next ? 'The assistant will remember what you tell it' : 'Memory turned off',
            'success'
          )
        )
        .catch(error => {
          Logger.error('Failed to save the memory switch:', error);
          notify('Could not change the memory setting', 'error');
          setEnabled(!next);
        });
    },
    [service, notify]
  );

  const onAdd = useCallback(() => {
    setDraft({ id: undefined, kind: MemoryKind.Context, text: '' });
  }, []);

  const onEdit = useCallback((memory: Memory) => {
    setDraft({ id: memory.id, kind: memory.kind, text: memory.text });
  }, []);

  const onDraftSave = useCallback(async () => {
    if (!draft) return;
    setIsSaving(true);
    try {
      if (draft.id === undefined) {
        await service.createMemory(draft.kind, draft.text);
      } else {
        const existing = memories.find(memory => memory.id === draft.id);
        if (!existing) throw new Error('That memory no longer exists');
        await service.updateMemory({ ...existing, kind: draft.kind, text: draft.text });
      }
      setDraft(undefined);
      await load();
      notify('Memory saved', 'success');
    } catch (error) {
      Logger.error('Failed to save a memory:', error);
      notify(error instanceof Error ? error.message : 'Could not save that memory', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [draft, memories, service, load, notify]);

  const onDelete = useCallback(
    async (memory: Memory) => {
      if (memory.id === undefined) return;
      setIsSaving(true);
      try {
        await service.deleteMemory(memory.id);
        if (draftRef.current?.id === memory.id) setDraft(undefined);
        await load();
        notify('Memory deleted', 'success');
      } catch (error) {
        Logger.error('Failed to delete a memory:', error);
        notify('Could not delete that memory', 'error');
      } finally {
        setIsSaving(false);
      }
    },
    [service, load, notify]
  );

  return (
    <MemorySettingsView
      enabled={enabled}
      memories={memories}
      draft={draft}
      isSaving={isSaving}
      onEnabledChange={onEnabledChange}
      onAdd={onAdd}
      onEdit={onEdit}
      onDraftChange={setDraft}
      onDraftSave={() => void onDraftSave()}
      onDraftCancel={() => setDraft(undefined)}
      onDelete={memory => void onDelete(memory)}
    />
  );
}
