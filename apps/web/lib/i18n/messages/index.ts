import type {Locale} from '../types';
import {en, type Messages} from './en';
import {ptBr} from './pt-br';

export type {Messages};

/** Bundle of all dictionaries, keyed by locale. */
export const MESSAGES: Readonly<Record<Locale, Messages>> = {
  'en':    en,
  'pt-br': ptBr,
};

// ─── Type-safe key paths ──────────────────────────────────────────────
//
// Builds the union of dot-notation paths for every leaf string in the
// dictionary, so `t('login.workEmail')` is autocompleted and typo-checked.
//
// e.g. for { common: { signIn: '…' } } the path is 'common.signIn'.
//

type Primitive = string | number | boolean;

type DotPaths<T> = T extends Primitive
  ? never
  : {
      [K in keyof T & string]:
        T[K] extends Primitive
          ? K
          : T[K] extends object
            ? `${K}.${DotPaths<T[K]>}`
            : never;
    }[keyof T & string];

export type MessageKey = DotPaths<Messages>;

/**
 * Walk a dot-notation path through a dictionary. Returns the key itself
 * (with a dev-only warning) if the path is missing — this should never
 * happen because `MessageKey` is type-checked, but a runtime fallback
 * keeps the UI from rendering blank if a future code path slips through.
 */
export function resolveMessage(messages: Messages, key: MessageKey): string {
  const parts = key.split('.');
  let cursor: unknown = messages;
  for (const p of parts) {
    if (cursor && typeof cursor === 'object' && p in (cursor as Record<string, unknown>)) {
      cursor = (cursor as Record<string, unknown>)[p];
    } else {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(`[i18n] missing key: ${key}`);
      }
      return key;
    }
  }
  return typeof cursor === 'string' ? cursor : key;
}
