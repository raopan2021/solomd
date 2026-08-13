/**
 * Custom CSS theme injection.
 *
 * Lets the user point SoloMD at any .css file on disk; we read it via Tauri
 * and inject as a <style id="solomd-custom-theme"> element. Re-applying
 * replaces the previous content. Empty path removes the style element.
 */

import { invoke } from '@tauri-apps/api/core';
import { useToastsStore } from '../stores/toasts';
import { useI18n } from '../i18n';

const STYLE_ID = 'solomd-custom-theme';

interface FileReadResult {
  content: string;
  encoding: string;
  language: string;
  had_bom: boolean;
}

// Matches either `background-attachment: fixed` or a `background` shorthand
// that contains `fixed` (the app shell is overflow:hidden and never scrolls,
// so a fixed backdrop only causes flicker when dragging splitters).
const FIXED_ATTACHMENT_RE = /background-attachment\s*:\s*fixed|background\s*:[^;{}]*\bfixed\b/i;

export async function loadCustomTheme(path: string): Promise<void> {
  if (!path) {
    removeCustomTheme();
    return;
  }
  try {
    const result = await invoke<FileReadResult>('read_file', { path });
    applyCss(result.content);
    if (FIXED_ATTACHMENT_RE.test(result.content)) {
      // App forces `background-attachment: scroll !important` to avoid this,
      // but the theme author may still wonder why `fixed` doesn't apply.
      const { t } = useI18n();
      useToastsStore().warning(t('settings.customCssFixedWarning'), 5000);
    }
  } catch (e) {
    console.error('Failed to load custom theme:', e);
    removeCustomTheme();
  }
}

function applyCss(css: string) {
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = css;
}

export function removeCustomTheme() {
  const el = document.getElementById(STYLE_ID);
  if (el) el.remove();
}
