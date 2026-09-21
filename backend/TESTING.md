# Running the backend tests

The suite runs against a throwaway SQLite database. It needs no Redis, no
Postgres, and no API keys — nothing in it reaches a real service.

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # first time only
pip install -r requirements.txt

DEBUG=True \
SECRET_KEY=local-test-key \
DATABASE_URL='sqlite:///test.sqlite3' \
python manage.py test
```

`SECRET_KEY` is required because settings refuse to start without one when
`DEBUG` is off; the value is irrelevant here. `DATABASE_URL` keeps the run
off whatever database your environment is otherwise pointed at.

One app at a time:

```bash
python manage.py test logistics
python manage.py test wallet.tests.WithdrawalGuardTests
```

CI runs the same command on every push touching `backend/`
(`.github/workflows/backend-tests.yml`), plus a
`makemigrations --check` so a model change without its migration fails
there rather than on deploy.

Note: the `backend/venv/` directory committed to this repo is someone's
macOS virtualenv and has no working interpreter on Linux. Create your own
as above rather than trying to use it.

## What is covered

| App | Focus |
| --- | --- |
| `logistics` | The pickup state machine (`PENDING → ACCEPTED → ARRIVED → COMPLETED`), who may advance it, cancellation and refunds, and payout arithmetic with monetization both on and off. |
| `wallet` | The shape of `wallet/me/`, wallet privacy, and every guard that can refuse a withdrawal (PIN, balance, per-transaction and daily limits, frozen wallet, new-account and PIN-change cooldowns, KYC, the global kill switch). |
| `chat` | Unread counts per contact, and the read-marking that clears them — including that one user cannot clear another's inbox. |
| `market` | Listing visibility: the lat/lon radius filter the Home feed depends on, material filtering, and that blocking hides listings both ways. |
| `users`, `intelligence` | Pre-existing coverage. |

Several tests exist to pin a specific bug that shipped. Those carry a
`Regression:` note explaining what broke, so nobody "cleans up" the guard
later without knowing what it was for.
