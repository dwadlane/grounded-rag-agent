/** Everything clinic specific lives here, so a new company only edits this file and the corpus. */
export interface AgentMessages {
  emergency: string;
  outOfScope: string;
  refusal: string;
}

export const DEFAULT_MESSAGES: AgentMessages = {
  emergency:
    "This could be an emergency. Please call 911 now, or your local emergency number, and do not wait for a reply here. If you are thinking about harming yourself, call or text 988. We are not an emergency service and we cannot help urgently by message.",
  outOfScope:
    "We can only answer questions about Harbourside Outpatient Clinics, such as hours, fees, bookings and policies. We cannot give medical advice or help with other topics. For medical advice please speak to a clinician, or call us on 1-800-555-0100.",
  refusal:
    "We could not find the answer to that in our documents, so we are not going to guess. Please call us on 1-800-555-0100 (weekdays, 7:30am to 5:30pm) or email hello@harbourside.example.",
};

export interface AgentConfig {
  messages: AgentMessages;
  /** How many chunks to retrieve and show the model. */
  topK: number;
  /** Minimum share of the question's content terms that the retrieved chunks must contain. */
  minCoverage: number;
  /** Minimum share of an answer sentence's content terms found in its cited chunks. */
  minSupport: number;
}

export const DEFAULT_CONFIG: AgentConfig = {
  messages: DEFAULT_MESSAGES,
  topK: 5,
  minCoverage: 0.4,
  minSupport: 0.6,
};
