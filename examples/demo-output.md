# Demo Output

Six runs of `npm run ask`, replayed from the committed recordings. The corpus is synthetic. Answer text comes from the recordings described in `eval/report.md`.

## 1. Answered with citations: a fee

Question: How much is a standard doctor visit?

```text
Status: answered

A standard family medicine visit of up to 15 minutes costs $95.

Sources:
- Consultation Fees, Standard Fees (effective 2026-01-01) [fees-consultations#standard-fees]

Trace:
- classify: in_scope (default)
- retrieve: fees-consultations#standard-fees, insurance-and-rebates#sliding-scale-fees, prescriptions-and-repeats#script-only-requests, appointment-booking#choosing-a-doctor, referral-rules#referrals-from-outside-doctors
- grade: coverage 100% (needs 40%) -> answer
- answer: drafted with citations
- groundedness: kept 1, stripped 0
- finalize: answered
```

Model calls: 1

## 2. Answered with citations: two facts from one section

Question: How much does parking cost at the Central clinic?

```text
Status: answered

Patients get 2 hours of free parking when they have their ticket validated at reception. After that parking costs $6 per hour, up to a daily maximum of $30.

Sources:
- Parking at Central, Quay Street Car Park (effective 2025-11-01) [parking-central#quay-street-car-park]

Trace:
- classify: in_scope (default)
- retrieve: parking-central#quay-street-car-park, parking-central#accessible-parking, parking-central#bikes, parking-northshore-westbrook#drop-off, about-harbourside#our-locations
- grade: coverage 100% (needs 40%) -> answer
- answer: drafted with citations
- groundedness: kept 2, stripped 0
- finalize: answered
```

Model calls: 1

## 3. Answered with citations: no referral needed

Question: Do I need a referral to see a physiotherapist?

```text
Status: answered

You can book physiotherapy at any of our three clinics without a referral.

Sources:
- Physiotherapy and Allied Health, Self Referral (effective 2026-02-01) [physiotherapy-and-allied-health#self-referral]

Trace:
- classify: in_scope (default)
- retrieve: physiotherapy-and-allied-health#self-referral, referral-rules#referrals-from-outside-doctors, locations-westbrook#address-and-services, cancellation-policy#notice-required, referral-rules#specialist-referrals
- grade: coverage 100% (needs 40%) -> answer
- answer: drafted with citations
- groundedness: kept 1, stripped 0
- finalize: answered
```

Model calls: 1

## 4. Refusal: the documents do not say

Question: How much does an MRI scan cost at your clinics?

```text
Status: refused

We could not find the answer to that in our documents, so we are not going to guess. Please call us on 1-800-555-0100 (weekdays, 7:30am to 5:30pm) or email hello@harbourside.example.

Trace:
- classify: in_scope (default)
- retrieve: locations-westbrook#community-fee-scale, child-and-family-services#immunization-clinic, about-harbourside#our-locations, about-harbourside#who-we-are, fees-consultations#fee-changes
- grade: coverage 67% (needs 40%) -> answer
- answer: model said the answer is not in the documents
- refuse: model_declined
```

Model calls: 1

## 5. Conflict resolved to the newest document

Question: What is the fee if I cancel my appointment late?

```text
Status: answered

A late cancellation fee of $45 applies when we receive less than the required notice.

Sources:
- Cancellation and Missed Appointment Policy, Late Cancellation Fee (effective 2026-03-01) [cancellation-policy#late-cancellation-fee]

Trace:
- classify: in_scope (default)
- retrieve: cancellation-policy-2024#late-cancellation-fee, cancellation-policy#late-cancellation-fee, cancellation-policy-update-2025#late-cancellation-fee, cancellation-policy-2024#telehealth-appointments, cancellation-policy#telehealth-appointments
- grade: dropped outdated cancellation-policy-2024#late-cancellation-fee, cancellation-policy-update-2025#late-cancellation-fee, cancellation-policy-2024#telehealth-appointments
- grade: coverage 100% (needs 40%) -> answer
- answer: drafted with citations
- groundedness: kept 1, stripped 0
- finalize: answered
```

Outdated chunks removed before answering: cancellation-policy-2024#late-cancellation-fee, cancellation-policy-update-2025#late-cancellation-fee, cancellation-policy-2024#telehealth-appointments

Model calls: 1

## 6. Emergency: fixed safety reply, model never called

Question: I have crushing chest pain and my left arm feels numb. Can I get an appointment today?

```text
Status: emergency

This could be an emergency. Please call 911 now, or your local emergency number, and do not wait for a reply here. If you are thinking about harming yourself, call or text 988. We are not an emergency service and we cannot help urgently by message.

Trace:
- classify: emergency (emergency_phrase)
- safety_reply: fixed emergency message, model not called
```

Model calls: 0
