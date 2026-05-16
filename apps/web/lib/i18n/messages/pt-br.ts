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

  onboarding: {
    eyebrow:       'Configuração do workspace',

    intro: {
      title:       'Vamos ensinar o Synapse sobre o seu negócio.',
      summary:     'Coletamos um perfil operacional uma única vez. O Synapse e todos os módulos que você instalar vão usá-lo para fundamentar respostas, rotear trabalho e manter o tom.',
      bullet1:     'Leva de 5 a 10 minutos',
      bullet2:     'Retoma se você sair',
      bullet3:     'Editável depois pelas configurações',
      cta:         'Iniciar configuração',
      legal:       'Suas respostas são usadas apenas para configurar o workspace. Sem compartilhamento com terceiros.',
    },

    mode: {
      title:       'Como você prefere configurar?',
      summary:     'Escolha o que parecer melhor. Você pode trocar de modo no meio do caminho.',
      interview: {
        label:     'Entrevista inteligente',
        hint:      'Recomendado',
        body:      'Responda a uma conversa guiada e curta. O Synapse infere o restante.',
        effort:    '5 minutos · conversacional',
      },
      manual: {
        label:     'Formulário manual',
        body:      'Preencha o perfil operacional você mesmo, seção por seção.',
        effort:    '10 minutos · estruturado',
      },
      continue:    'Continuar',
    },

    sections: {
      business:      'Negócio',
      communication: 'Comunicação',
      operational:   'Operação',
      goals:         'Objetivos',
    },

    progress: {
      title:       'Seções do perfil',
      completed:   'Concluídas',
      pending:     'Pendentes',
      stepOf:      'Etapa {n} de {total}',
    },

    interview: {
      objective:        'Entendendo o seu negócio',
      hint:             'O Synapse só faz perguntas relacionadas à configuração do seu workspace.',
      placeholder:      'Digite sua resposta…',
      send:             'Enviar',
      audioUpload:      'Enviar áudio',
      offTopicNotice:   'Esta configuração coleta apenas informações necessárias para o seu workspace.',
      autosaveSaving:   'Salvando…',
      autosaveSaved:    'Salvo {when}',
      autosaveOffline:  'Offline — as respostas serão sincronizadas quando você voltar a se conectar.',
      complete:         'Entrevista concluída',
      reviewCta:        'Revisar resumo',
      backToMode:       'Trocar para formulário manual',
      questionFallback: 'O que mais devemos registrar?',
    },

    manual: {
      title:        'Configuração manual do perfil',
      hint:         'Cada seção é salva enquanto você preenche. Volte para qualquer seção antes de enviar.',
      next:         'Próxima seção',
      prev:         'Anterior',
      submit:       'Gerar resumo',
      autosaveSaved:'Salvo {when}',
      requiredHint: 'Obrigatório',
      optionalHint: 'Opcional',
      addItem:      'Adicionar',
      removeItem:   'Remover',
      fields: {
        businessName:          'Nome do negócio',
        businessType:          'Tipo do negócio',
        businessDescription:   'O que o negócio faz',
        productsServices:      'Produtos ou serviços',
        targetAudience:        'Público-alvo',
        website:               'Site',
        socialMedia:           'Redes sociais',
        notes:                 'Notas',
        communicationTone:     'Tom de comunicação',
        preferredLanguages:    'Idiomas preferidos',
        customerSupportStyle:  'Estilo de atendimento ao cliente',
        salesBehavior:         'Comportamento de vendas',
        generalGoals:          'Objetivos gerais',
      },
      placeholders: {
        businessName:         'Exemplo: Clínica Aurora',
        businessType:         'Exemplo: Clínica de saúde, SaaS, varejo…',
        businessDescription:  'Exemplo: Ajudamos clínicas a gerenciar agendamentos e comunicação com pacientes.',
        productsServices:     'Adicionar um produto ou serviço',
        targetAudience:       'Exemplo: Operadores de clínica no Brasil e Portugal',
        website:              'https://exemplo.com',
        socialMedia:          'Adicionar uma URL de perfil',
        notes:                'Alguma observação que o Synapse deva manter em mente?',
        communicationTone:    'Exemplo: Direto, acolhedor, profissional',
        preferredLanguages:   'Adicionar um idioma (ex.: pt-BR, en)',
        customerSupportStyle: 'Exemplo: Triagem estruturada com aberturas empáticas.',
        salesBehavior:        'Exemplo: Consultivo, faz duas perguntas de qualificação primeiro.',
        generalGoals:         'Adicionar um objetivo',
      },
    },

    validation: {
      title:        'Revise seu perfil operacional',
      summary:      'O Synapse transformou suas respostas no perfil abaixo. Aprove para ativá-lo, ou edite qualquer seção.',
      sections: {
        business:      'Resumo do negócio',
        communication: 'Resumo de comunicação',
        operational:   'Resumo operacional',
        notes:         'Notas adicionais',
      },
      missingFields:  'Alguns campos obrigatórios ainda estão pendentes',
      approve:        'Aprovar e liberar o workspace',
      edit:           'Editar informações',
      regenerate:     'Regenerar resumo',
      reject:         'Rejeitar resumo',
      approving:      'Ativando workspace…',
      approved:       'Perfil do workspace criado com sucesso.',
      redirect:       'Levando você ao workspace…',
      rejectReason:   'Opcional — conte o que devemos mudar',
    },

    errors: {
      forbidden:     'Você não tem permissão para configurar este workspace.',
      generic:       'Algo deu errado. Tente novamente.',
      offline:       'Offline. Sua última resposta será sincronizada quando você voltar.',
    },
  },
};
