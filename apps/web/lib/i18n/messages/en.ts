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

  onboarding: {
    eyebrow:       'Workspace setup',

    intro: {
      title:       'Let’s teach Synapse about your business.',
      summary:     'We collect a small operational profile once. Synapse and every module you install will use it to ground responses, route work and stay on-brand.',
      bullet1:     'Takes 5 to 10 minutes',
      bullet2:     'Resumes if you step away',
      bullet3:     'Editable later from settings',
      cta:         'Start setup',
      legal:       'Your inputs are only used to configure your workspace. No third-party sharing.',
    },

    mode: {
      title:       'How would you like to set things up?',
      summary:     'Pick whichever feels right. You can switch modes mid-way.',
      interview: {
        label:     'Intelligent interview',
        hint:      'Recommended',
        body:      'Answer a short guided conversation. Synapse infers the rest.',
        effort:    '5 minutes · conversational',
      },
      manual: {
        label:     'Manual form',
        body:      'Fill the operational profile yourself, section by section.',
        effort:    '10 minutes · structured',
      },
      continue:    'Continue',
    },

    sections: {
      business:      'Business',
      communication: 'Communication',
      operational:   'Operations',
      goals:         'Goals',
    },

    progress: {
      title:       'Profile sections',
      completed:   'Completed',
      pending:     'Pending',
      stepOf:      'Step {n} of {total}',
    },

    interview: {
      objective:        'Understanding your business',
      hint:             'Synapse will only ask questions related to your business setup.',
      placeholder:      'Type your answer…',
      send:             'Send',
      audioUpload:      'Upload audio',
      offTopicNotice:   'This setup only collects information required to configure your workspace.',
      autosaveSaving:   'Saving…',
      autosaveSaved:    'Saved {when}',
      autosaveOffline:  'Offline — answers will sync when you reconnect.',
      complete:         'Interview complete',
      reviewCta:        'Review summary',
      backToMode:       'Switch to manual form',
      questionFallback: 'What else should we capture?',
    },

    manual: {
      title:        'Manual profile setup',
      hint:         'Each section saves as you go. You can come back to any section before submitting.',
      next:         'Next section',
      prev:         'Previous',
      submit:       'Generate summary',
      autosaveSaved:'Saved {when}',
      requiredHint: 'Required',
      optionalHint: 'Optional',
      addItem:      'Add',
      removeItem:   'Remove',
      fields: {
        businessName:          'Business name',
        businessType:          'Business type',
        businessDescription:   'What the business does',
        productsServices:      'Products or services',
        targetAudience:        'Target audience',
        website:               'Website',
        socialMedia:           'Social media',
        notes:                 'Notes',
        communicationTone:     'Communication tone',
        preferredLanguages:    'Preferred languages',
        customerSupportStyle:  'Customer support style',
        salesBehavior:         'Sales behaviour',
        generalGoals:          'General goals',
      },
      placeholders: {
        businessName:         'Example: Acme Health',
        businessType:         'Example: Health clinic, SaaS, retail…',
        businessDescription:  'Example: We help mid-sized clinics manage scheduling and patient comms.',
        productsServices:     'Add a product or service',
        targetAudience:       'Example: Clinic operators in Brazil and Portugal',
        website:              'https://example.com',
        socialMedia:          'Add a profile URL',
        notes:                'Anything else Synapse should keep in mind?',
        communicationTone:    'Example: Direct, warm, professional',
        preferredLanguages:   'Add a language (e.g. pt-BR, en)',
        customerSupportStyle: 'Example: Structured triage with empathic openers.',
        salesBehavior:        'Example: Consultative, asks two qualifying questions first.',
        generalGoals:         'Add a goal',
      },
    },

    validation: {
      title:        'Review your operational profile',
      summary:      'Synapse turned your answers into the profile below. Approve to activate it, or edit any section.',
      sections: {
        business:      'Business summary',
        communication: 'Communication summary',
        operational:   'Operational summary',
        notes:         'Additional notes',
      },
      missingFields:  'Some required fields are still missing',
      approve:        'Approve and unlock workspace',
      edit:           'Edit information',
      regenerate:     'Regenerate summary',
      reject:         'Reject summary',
      approving:      'Activating workspace…',
      approved:       'Workspace profile successfully created.',
      redirect:       'Taking you to the workspace…',
      rejectReason:   'Optional — tell us what to change',
    },

    errors: {
      forbidden:     'You don’t have permission to set up this workspace.',
      generic:       'Something went wrong. Please retry.',
      offline:       'Offline. Your last answer will sync when you reconnect.',
    },
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
