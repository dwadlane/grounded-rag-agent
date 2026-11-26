/**
 * A tiny domain lexicon. Both documents and questions are mapped through it, so
 * "price", "cost" and "charge" all land on the same term. Replace it with your
 * own vocabulary (or drop it and rely on a real embedder).
 */
export const LEXICON: Record<string, string> = {
  cost: "fee",
  price: "fee",
  charge: "fee",
  video: "telehealth",
  virtual: "telehealth",
  physio: "physiotherapy",
  physiotherapist: "physiotherapy",
  therapist: "physiotherapy",
  script: "prescription",
  scan: "imaging",
  mri: "imaging",
  xray: "imaging",
  children: "child",
  kid: "child",
  toddler: "child",
  closing: "close",
  opening: "open",
  hour: "open",
  pay: "payment",
  insurer: "insurance",
  insurance: "insurance",
  doctor: "doctor",
  physician: "doctor",
  gp: "doctor",
  copy: "record",
  records: "record",
};
