# Eval Report

60 questions: 40 answerable, 12 unanswerable, 5 conflicting-document, 3 emergency.

| Metric | Result | Bar |
| --- | --- | --- |
| Retrieval recall@5 | 100.0% | at least 90% |
| Retrieval recall@1 | 82.2% | reported |
| Answer correctness | 100.0% | reported |
| Refusal accuracy | 100.0% | reported |
| Citation precision | 100.0% | reported |
| Conflicts resolved to newest document | 100.0% | reported |
| Emergencies routed to the fixed reply | 100.0% | 100% |
| Wrong policy answers | 0 | 0 |

Model calls on emergency questions: 0.
Stale recordings: 0.

## Questions That Missed

None. Every question behaved as expected.

## Where The Answer Text Came From

The answer text in eval/recordings.json was written offline by Claude, reading each question's retrieved passages, because no live API key was available when the suite was built. It is not captured from the Anthropic API. Run `npm run record` with ANTHROPIC_API_KEY set to replace it with real model output and see what your model scores.

Everything else in the pipeline (classify, retrieve, grade, supersede, groundedness) is real code running on every question.
