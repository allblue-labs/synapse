/**
 * English (en) message dictionary — the canonical source.
 *
 * The shape of this file (the `Messages` type) is what every other locale
 * must match. Add new keys here first, then translate them everywhere else.
 */
export const en = {
  language: {
    label:    'Language',
    system:   'System',
    en:       'English',
    'pt-br':  'Português',
  },

  theme: {
    label:  'Theme',
    light:  'Light',
    dark:   'Dark',
    system: 'System',
  },

  common: {
    signIn:        'Sign in',
    signOut:       'Sign out',
    getStarted:    'Get started',
    backHome:      'Back home',
    settings:      'Settings',
    search:        'Search',
    save:          'Save changes',
    saving:        'Signing in…',
    forgot:        'Forgot?',
    contact:       'Contact us',
    requestAccess: 'Request access',
  },

  publicNav: {
    modules:    'Modules',
    features:   'Features',
    pricing:    'Pricing',
    docs:       'Docs',
    signIn:     'Sign in',
    getStarted: 'Get started',
  },

  appNav: {
    overview: 'Overview',
    modules:  'Modules',
    agents:   'Agents',
    activity: 'Activity',
    account:  'My Account',
  },

  login: {
    welcomeBack:   'Welcome back',
    intro:         'Sign in to continue to your workspace.',
    workEmail:     'Work email',
    password:      'Password',
    submit:        'Sign in to Synapse',
    noAccount:     'New to Synapse?',
    legalPrefix:   'By signing in, you agree to our',
    terms:         'Terms',
    legalAnd:      '&',
    privacy:       'Privacy Policy',
    errorInvalid:  'Invalid email or password.',
    errorNetwork:  'Could not reach the server. Please try again.',
    errorGeneric:  'Login failed. Please try again.',
  },
} as const;

/**
 * Recursively widen literal string types in `T` to plain `string` while
 * keeping the object shape (keys + nesting) intact.
 *
 * `as const` on `en` is convenient for autocomplete and exhaustiveness
 * checks, but without widening it would force every other locale to use
 * the *exact same* English strings (TS would reject "Idioma" because the
 * type says "Language").
 */
type Widen<T> =
  T extends string  ? string :
  T extends number  ? number :
  T extends boolean ? boolean :
  T extends object  ? {[K in keyof T]: Widen<T[K]>} :
  T;

export type Messages = Widen<typeof en>;
