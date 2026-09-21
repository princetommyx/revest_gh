"""
Normalisation of raw Formasty submissions into MarketSurveyResponse rows.

Formasty is where the "what should your waste pay you?" survey actually
lives (form mcp_form_1397d2204275ac5b53ffe56c, public id
pub_ef7ed217e8f34da992c8545a048a35e2); responses keep arriving there long
after any one import. Keeping the field mapping here - rather than inline
in whichever script happened to import a batch - means the next batch is a
command invocation instead of another hand-written data migration, and
means the seed migrations and the importer can't drift into disagreeing
about what "f_min_payout" maps to.

normalize_submission() is deliberately pure (no model access, no DB): it
turns one Formasty submission dict into a plain dict of MarketSurveyResponse
field values, so a data migration can call it against its own historical
model without importing the live one.
"""

from django.utils.dateparse import parse_datetime

SOURCE = 'formasty'

# Formasty field key -> MarketSurveyResponse field name. Everything the
# survey asks that we model explicitly; anything else still survives in
# raw_answers.
FIELD_MAP = {
    'f_role': 'role',
    'f_materials': 'materials',
    'f_area': 'area',
    'f_current': 'current_disposal',
    'f_price_now': 'price_now_ghs',
    'f_anchor30': 'anchor30_reaction',
    'f_min_payout': 'min_payout_range',
    'f_structure': 'pricing_structure_pref',
    'f_weighing': 'weighing_trust',
    'f_payment': 'payment_pref',
    'f_track_a': 'track_a_fee_range',
    'f_volume': 'volume',
    'f_ewaste': 'ewaste_expectations',
    'f_open': 'open_feedback',
}

# Fields whose model column is a CharField/TextField - a None or a number
# coming back from Formasty has to become '' or a string rather than blowing
# up on save.
_TEXT_FIELDS = {
    'role', 'area', 'current_disposal', 'anchor30_reaction', 'min_payout_range',
    'pricing_structure_pref', 'weighing_trust', 'payment_pref',
    'track_a_fee_range', 'open_feedback',
}


def normalize_submission(submission):
    """
    One Formasty submission (as returned by formasty_list_submissions /
    formasty_get_submission) -> a dict of MarketSurveyResponse field values.

    Raises ValueError if the submission has no id or no usable timestamp -
    without an id there's no way to keep re-imports idempotent, and without
    a timestamp the row can't be ordered or trended, so a half-formed row
    is worse than a loud failure at import time.
    """
    external_id = submission.get('id') or submission.get('submissionId')
    if not external_id:
        raise ValueError("Formasty submission has no id; cannot import idempotently.")

    answers = submission.get('effectiveValues') or submission.get('answers') or {}

    submitted_raw = submission.get('createdAt') or submission.get('submittedAt')
    submitted_at = parse_datetime(submitted_raw) if submitted_raw else None
    if submitted_at is None:
        raise ValueError(f"Formasty submission {external_id} has no parseable timestamp.")

    if not any(key in answers for key in FIELD_MAP):
        # Not a Formasty answer payload at all - most likely already-mapped
        # model fields being fed back in. Writing it would blank every
        # answer on an existing row, which is the one thing an idempotent
        # importer must never do, so refuse it loudly instead.
        raise ValueError(
            f"Formasty submission {external_id} has no recognised survey answers "
            f"(expected keys like {sorted(FIELD_MAP)[0]!r})."
        )

    values = {
        'external_id': external_id,
        'source': SOURCE,
        'submitted_at': submitted_at,
        'raw_answers': answers,
    }

    # Scoring lives on the submission itself rather than among the answers,
    # so raw_answers would not have preserved it.
    if isinstance(submission.get('quizScore'), int):
        values['quiz_score'] = submission['quizScore']
    if submission.get('leadTier'):
        values['lead_tier'] = str(submission['leadTier'])

    # Only answers actually present are written. A field the payload omits
    # is left alone rather than reset to a blank - on an update that would
    # quietly destroy an answer the respondent did give, and on a create the
    # model's own defaults ([] / {}) already cover it.
    for formasty_key, field in FIELD_MAP.items():
        if formasty_key not in answers:
            continue
        value = answers[formasty_key]
        if field in _TEXT_FIELDS:
            values[field] = '' if value is None else str(value)
        elif field == 'materials':
            values[field] = list(value or [])
        elif field in ('volume', 'ewaste_expectations'):
            values[field] = dict(value or {})
        else:
            values[field] = value

    return values


def upsert_submission(model, submission):
    """
    Write one normalised submission through `model` (the live
    MarketSurveyResponse, or a historical one inside a migration).
    Idempotent on external_id, so re-running an import - or re-running a
    seed migration - updates in place instead of duplicating a respondent.

    Returns (obj, created).
    """
    values = normalize_submission(submission)
    external_id = values.pop('external_id')
    return model.objects.update_or_create(external_id=external_id, defaults=values)
