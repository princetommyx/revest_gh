from django.db import migrations
from django.utils.dateparse import parse_datetime

# Three more responses to the "what should your waste pay you?" survey,
# same pattern as 0006: raw Formasty answer payloads with a frozen field map,
# so the migration cannot change what it wrote to databases that already ran
# it when intelligence.formasty.FIELD_MAP next evolves.
#
# This batch is the one that broke assumptions rather than confirming them:
#
# * The first response from outside Greater Accra (Navrongo, Upper East).
# * The first from an institution rather than a household.
# * The first "too small" verdict on the GHS 30 sack anchor.
# * A volume answer of "none" ("I don't have this"), which no bucket map
#   recognised and which was therefore being dropped from the averages
#   instead of counting as the zero it is - see 0-valued 'none' in
#   VOLUME_SACKS_PER_WEEK, and unknown_answers() which now reports this
#   class of drift rather than leaving it to be noticed.
# * A material key of "metal", likewise unmapped.
SUBMISSIONS = [
    {
        "id": "e838643f-17f9-4412-9368-77d96b13e0cc",
        "createdAt": "2026-09-09T19:57:46.585Z",
        "quizScore": 0,
        "leadTier": "unqualified",
        "effectiveValues": {
            "f_role": "institution",
            "f_materials": ["rubbers"],
            "f_volume": {"rubbers": "1", "bottles": "lt1", "other": "lt1"},
            "f_current": "pay_someone",
            "f_price_now": 0,
            "f_anchor30": "too_small",
            "f_min_payout": "lt10",
            "f_structure": "whichever",
            "f_weighing": "photo_ai",
            "f_payment": "cash_27",
            "f_ewaste": {"phone": "free", "tv": "free", "cables": "free", "appliance": "free"},
            "f_track_a": "1_5",
            "f_open": "Ujjjj",
            "f_area": "Adabraka",
        },
    },
    {
        "id": "1045a294-88d8-4019-88b0-7edad8d64c94",
        "createdAt": "2026-09-09T18:02:14.828Z",
        "quizScore": 0,
        "leadTier": "unqualified",
        "effectiveValues": {
            "f_role": "household",
            "f_materials": ["rubbers", "cans", "bottles", "metal", "paper", "mixed"],
            "f_volume": {"rubbers": "1", "bottles": "1", "other": "1"},
            "f_current": "burn",
            "f_price_now": 0,
            "f_anchor30": "fair",
            "f_min_payout": "free_ok",
            "f_structure": "no_pref",
            "f_weighing": "no_trust",
            "f_payment": "cash_only",
            "f_ewaste": {"phone": "100plus", "tv": "100plus", "cables": "100plus", "appliance": "100plus"},
            "f_track_a": "6_10",
            "f_open": "The smell",
            "f_area": "Navrongo",
        },
    },
    {
        "id": "e17a24a9-0306-4294-b0aa-7eeb2f39625b",
        "createdAt": "2026-09-09T15:53:01.701Z",
        "quizScore": 0,
        "leadTier": "unqualified",
        "effectiveValues": {
            "f_role": "household",
            "f_materials": ["rubbers", "cans", "mixed"],
            "f_volume": {"rubbers": "none", "bottles": "none", "other": "lt1"},
            "f_current": "pay_someone",
            "f_price_now": 0,
            "f_anchor30": "very_good",
            "f_min_payout": "free_ok",
            "f_structure": "per_kg",
            "f_weighing": "collector_scale",
            "f_payment": "wallet_30",
            "f_ewaste": {"phone": "free", "tv": "lt10", "cables": "10_29", "appliance": "10_29"},
            "f_track_a": "gt20",
            "f_open": "Money",
            "f_area": "Achiaman",
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
        "quiz_score": submission.get("quizScore"),
        "lead_tier": submission.get("leadTier") or "",
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
        ("intelligence", "0012_survey_response_scoring"),
    ]

    operations = [
        migrations.RunPython(seed_responses, remove_seeded_responses),
    ]
