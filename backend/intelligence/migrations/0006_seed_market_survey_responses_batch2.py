from django.db import migrations
from django.utils.dateparse import parse_datetime

# The next four responses to the "what should your waste pay you?" survey
# (Formasty form pub_ef7ed217e8f34da992c8545a048a35e2), pulled straight from
# Formasty and seeded here for the same reason as 0004: they land in
# production on the next deploy without anyone needing shell access.
#
# Stored as the raw Formasty answer payload rather than as pre-mapped model
# fields, with a frozen copy of the field map below. That is deliberate for
# a migration - intelligence.formasty.FIELD_MAP will keep evolving as the
# survey does, and a migration that re-reads it would quietly change what it
# wrote to already-migrated databases. Ongoing imports go through
# `manage.py import_formasty_submissions` instead of growing another one of
# these files.
SUBMISSIONS = [
    {
        "id": "4702f1d2-a9aa-4feb-9cce-0d00c918bca1",
        "createdAt": "2026-09-09T13:45:10.198Z",
        "effectiveValues": {
            "f_role": "household",
            "f_materials": ["mixed"],
            "f_volume": {"rubbers": "lt1", "bottles": "lt1", "other": "1"},
            "f_current": "pay_someone",
            "f_price_now": 0,
            "f_anchor30": "very_good",
            "f_min_payout": "20_29",
            "f_structure": "no_pref",
            "f_weighing": "collector_scale",
            "f_payment": "wallet_33_next_day",
            "f_ewaste": {"phone": "free", "tv": "free", "cables": "free", "appliance": "free"},
            "f_track_a": "already_pay",
            "f_open": "Good pay",
            "f_area": "Tema, comm 25",
        },
    },
    {
        "id": "2af51b26-1a73-4537-b946-79c1ffb7159f",
        "createdAt": "2026-09-08T13:55:24.516Z",
        "effectiveValues": {
            "f_role": "household",
            "f_materials": ["rubbers"],
            "f_volume": {"rubbers": "1", "bottles": "1", "other": "1"},
            "f_current": "burn",
            "f_price_now": 0,
            "f_anchor30": "very_good",
            "f_min_payout": "lt10",
            "f_structure": "no_pref",
            "f_weighing": "no_trust",
            "f_payment": "cash_only",
            "f_ewaste": {"phone": "lt10", "tv": "lt10", "cables": "lt10", "appliance": "lt10"},
            "f_track_a": "zero",
            "f_open": "money",
            "f_area": "Medina",
        },
    },
    {
        "id": "774476ea-0dbf-4c73-80b2-dce6b8d3672c",
        "createdAt": "2026-09-08T10:37:06.706Z",
        "effectiveValues": {
            "f_role": "household",
            "f_materials": ["rubbers", "mixed", "bottles", "glass", "cans"],
            "f_volume": {"rubbers": "lt1", "bottles": "lt1", "other": "1"},
            "f_current": "give_free",
            "f_price_now": 50,
            "f_anchor30": "small_maybe",
            "f_min_payout": "50plus",
            "f_structure": "flat",
            "f_weighing": "no_trust",
            "f_payment": "cash_27",
            "f_ewaste": {"phone": "30_99", "tv": "30_99", "cables": "30_99", "appliance": "30_99"},
            "f_track_a": "gt20",
            "f_open": "Money",
            "f_area": "Madina",
        },
    },
    {
        "id": "d9f9aadd-17b6-4535-9846-637bab10fb67",
        "createdAt": "2026-09-07T19:12:26.800Z",
        "effectiveValues": {
            "f_role": "household",
            "f_materials": ["rubbers", "bottles"],
            "f_volume": {"rubbers": "1", "bottles": "lt1", "other": "lt1"},
            "f_current": "give_free",
            "f_price_now": 0,
            "f_anchor30": "fair",
            "f_min_payout": "10_19",
            "f_structure": "flat",
            "f_weighing": "depot",
            "f_payment": "wallet_33_next_day",
            "f_ewaste": {"phone": "30_99", "tv": "100plus", "cables": "10_29", "appliance": "30_99"},
            "f_track_a": "gt20",
            "f_area": "Spintex",
        },
    },
]

# Frozen snapshot of intelligence.formasty.FIELD_MAP as of this migration.
FIELD_MAP = {
    "f_role": "role",
    "f_materials": "materials",
    "f_area": "area",
    "f_current": "current_disposal",
    "f_price_now": "price_now_ghs",
    "f_anchor30": "anchor30_reaction",
    "f_min_payout": "min_payout_range",
    "f_structure": "pricing_structure_pref",
    "f_weighing": "weighing_trust",
    "f_payment": "payment_pref",
    "f_track_a": "track_a_fee_range",
    "f_volume": "volume",
    "f_ewaste": "ewaste_expectations",
    "f_open": "open_feedback",
}

TEXT_FIELDS = {
    "role", "area", "current_disposal", "anchor30_reaction", "min_payout_range",
    "pricing_structure_pref", "weighing_trust", "payment_pref",
    "track_a_fee_range", "open_feedback",
}


def _values_for(submission):
    answers = submission["effectiveValues"]
    values = {
        "source": "formasty",
        "submitted_at": parse_datetime(submission["createdAt"]),
        "raw_answers": answers,
        "materials": [],
        "volume": {},
        "ewaste_expectations": {},
    }
    for key, field in FIELD_MAP.items():
        if key not in answers:
            continue
        value = answers[key]
        if field in TEXT_FIELDS:
            values[field] = "" if value is None else str(value)
        elif field == "materials":
            values[field] = list(value or [])
        elif field in ("volume", "ewaste_expectations"):
            values[field] = dict(value or {})
        else:
            values[field] = value
    return values


def seed_responses(apps, schema_editor):
    MarketSurveyResponse = apps.get_model("intelligence", "MarketSurveyResponse")
    for submission in SUBMISSIONS:
        MarketSurveyResponse.objects.update_or_create(
            external_id=submission["id"], defaults=_values_for(submission)
        )


def remove_seeded_responses(apps, schema_editor):
    MarketSurveyResponse = apps.get_model("intelligence", "MarketSurveyResponse")
    MarketSurveyResponse.objects.filter(
        external_id__in=[s["id"] for s in SUBMISSIONS]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("intelligence", "0005_pricequote"),
    ]

    operations = [
        migrations.RunPython(seed_responses, remove_seeded_responses),
    ]
