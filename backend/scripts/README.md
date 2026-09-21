# Diagnostic scripts

Manual, one-off scripts for poking at a running system: does Hubtel accept
our credentials, does this Gemini key work, why is that listing filter
returning the wrong rows. They are debugging tools, not tests.

They used to live in `backend/` named `test_*.py`, which meant Django's test
runner discovered them and **imported** them on every `manage.py test` run.
Importing them ran them, because their work was all at module level. So a
full test run would:

- send a real OTP SMS to a live Ghanaian number (`check_hubtel.py`)
- spend Gemini quota on a live API call (`check_gemini_key.py`, `check_ai_draft.py`)
- write rows to whatever database was configured (`check_filter_bug.py`)

Three of them also failed on import against a stale local database, which is
how this was noticed at all - the other two ran silently every time.

Two things stop that now: they are named `check_*` rather than `test_*` so no
test discovery will match them, and each one's body sits inside `main()`
behind an `if __name__ == "__main__"` guard, so importing one does nothing.

## Running one

They talk to live services and real databases, so run them deliberately,
from `backend/`, with the environment you actually mean to hit:

```
python scripts/check_hubtel.py
```

Several need `DJANGO_SETTINGS_MODULE` and call `django.setup()` themselves.
Check what a script does before running it: some send messages, some write
rows, and none of them ask first.

## Adding one

Keep the `check_` prefix, put the work inside `main()`, and leave the guard
in place. Anything that should run in CI belongs in an app's `tests.py` as a
real `TestCase` instead - see `intelligence/tests.py`.
