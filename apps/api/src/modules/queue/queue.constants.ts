export const SYNAPSE_QUEUES = {
  MESSAGE_PROCESSING: 'message-processing',
  AI_RESPONSE: 'ai-response',
  OUTBOUND_MESSAGE: 'outbound-message'
} as const;

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2_000
  },
  removeOnComplete: {
    age: 60 * 60 * 24,
    count: 1_000
  },
  removeOnFail: false
} as const;
