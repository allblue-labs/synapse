import type {Messages} from './en';

/**
 * Brazilian Portuguese (pt-br) — must match the shape of `en` exactly.
 * The `Messages` annotation makes drift a compile-time error: forget a
 * key here and the build fails.
 */
export const ptBr: Messages = {
  language: {
    label:    'Idioma',
    system:   'Sistema',
    en:       'English',
    'pt-br':  'Português',
  },

  theme: {
    label:  'Tema',
    light:  'Claro',
    dark:   'Escuro',
    system: 'Sistema',
  },

  common: {
    signIn:        'Entrar',
    signOut:       'Sair',
    getStarted:    'Começar',
    backHome:      'Voltar ao início',
    settings:      'Configurações',
    search:        'Buscar',
    save:          'Salvar alterações',
    saving:        'Entrando…',
    forgot:        'Esqueceu?',
    contact:       'Fale conosco',
    requestAccess: 'Solicitar acesso',
  },

  publicNav: {
    modules:    'Módulos',
    features:   'Recursos',
    pricing:    'Preços',
    docs:       'Documentação',
    signIn:     'Entrar',
    getStarted: 'Começar',
  },

  appNav: {
    overview: 'Visão geral',
    modules:  'Módulos',
    agents:   'Agentes',
    activity: 'Atividade',
    account:  'Minha conta',
  },

  login: {
    welcomeBack:   'Bem-vindo de volta',
    intro:         'Entre para continuar no seu workspace.',
    workEmail:     'E-mail corporativo',
    password:      'Senha',
    submit:        'Entrar no Synapse',
    noAccount:     'Novo no Synapse?',
    legalPrefix:   'Ao entrar, você concorda com nossos',
    terms:         'Termos',
    legalAnd:      'e',
    privacy:       'Política de Privacidade',
    errorInvalid:  'E-mail ou senha inválidos.',
    errorNetwork:  'Não foi possível conectar ao servidor. Tente novamente.',
    errorGeneric:  'Falha no login. Tente novamente.',
  },
};
