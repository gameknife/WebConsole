// Edit modal for a game's metadata + cover art. Text entry is keyboard/mouse
// (a config task, not a gamepad flow); Escape closes it without leaking to the
// global QAM/menu handler. On save it patches metadata, uploads the cover if a
// new file was chosen, and invalidates the relevant React Query caches.

import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

import { updateMetadata, uploadCover } from '@/api/games';
import type { Game } from '@/api/types';

interface GameEditModalProps {
  game: Game;
  onClose: () => void;
}

export function GameEditModal({ game, onClose }: GameEditModalProps) {
  const queryClient = useQueryClient();
  const [nameCn, setNameCn] = useState(game.nameCn);
  const [name, setName] = useState(game.name);
  const [description, setDescription] = useState(game.description);
  const [tags, setTags] = useState(game.tags.join(', '));
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  const onPickCover = (file: File | undefined) => {
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateMetadata(game.id, {
        name,
        nameCn,
        description,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
      if (coverFile) await uploadCover(game.id, coverFile);

      await queryClient.invalidateQueries({ queryKey: ['game', game.id] });
      await queryClient.invalidateQueries({ queryKey: ['games'] });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      // Keep keystrokes (esp. Escape/arrows) inside the form; don't let the
      // global gamepad/keyboard handler act on them.
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') onClose();
      }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        className="glass w-full max-w-lg rounded-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-xl font-bold text-text-0">编辑游戏信息</h2>

        <div className="flex gap-4">
          {/* Cover */}
          <div className="shrink-0">
            <div
              className="overflow-hidden rounded-md bg-bg-2"
              style={{ width: 96, aspectRatio: 'var(--tile-ratio)' }}
            >
              {(coverPreview || game.cover) && (
                <img
                  src={coverPreview || game.cover}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <label className="mt-2 block cursor-pointer rounded-md bg-white/10 px-2 py-1 text-center text-xs font-semibold text-text-1 hover:bg-white/20">
              选择封面
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPickCover(e.target.files?.[0])}
              />
            </label>
          </div>

          {/* Fields */}
          <div className="flex flex-1 flex-col gap-3">
            <Field label="中文名">
              <input
                ref={firstFieldRef}
                value={nameCn}
                onChange={(e) => setNameCn(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="原名">
              <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
            </Field>
            <Field label="标签（逗号分隔）">
              <input value={tags} onChange={(e) => setTags(e.target.value)} className="input" />
            </Field>
          </div>
        </div>

        <Field label="描述">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="input resize-none"
          />
        </Field>

        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-semibold text-text-1 hover:bg-white/5"
          >
            取消
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-md bg-accent px-5 py-2 text-sm font-bold text-bg-0 disabled:opacity-60"
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-3 block first:mt-0">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-dim">
        {label}
      </span>
      {children}
    </label>
  );
}
