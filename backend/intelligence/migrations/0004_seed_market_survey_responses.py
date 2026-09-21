from django.db import migrations
from django.utils.dateparse import parse_datetime

# The first two responses to the "what should your waste pay you?" survey
# (Formasty form pub_ef7ed217e8f34da992c8545a048a35e2), fetched directly from
# Formasty and seeded here as a data migration so they land in production on
# the next deploy without needing shell access to run a one-off script.
# Re-running this migration is a no-op (get_or_create keyed on external_id),
# so it's safe if it ever needs to run again.
SUBMISSIONS = [
    {
        "external_id": "sub_idempotency_f9717b0d137f060083d3b0e69730153cf99da5b1791ff97f",
        "role": "household",
        "materials": ["rubbers", "bottles", "paper", "cans", "glass", "mixed", "ewaste"],
        "area": "Adenta",
        "current_disposal": "dump_free",
        "price_now_ghs": 100,
        "anchor30_reaction": "small_maybe",
        "min_payout_range": "30_49",
        "pricing_structure_pref": "flat",
        "weighing_trust": "no_trust",
        "payment_pref": "wallet_33_next_day",
        "track_a_fee_range": "11_20",
        "volume": {"rubbers": "1", "bottles": "gt3", "other": "2to3"},
        "ewaste_expectations": {"phone": "10_29", "tv": "30_99", "cables": "10_29", "appliance": "30_99"},
        "open_feedback": "When I know I will get value for it",
        "submitted_at": "2026-09-07T09:56:26.383Z",
    },
    {
        "external_id": "sub_idempotency_9fb4db29083421abe212655dfdcd92c1bebdc40716fdf6b7",
        "role": "household",
        "materials": ["rubbers", "bottles", "cans", "mixed"],
        "area": "Madina",
        "current_disposal": "dump_free",
        "price_now_ghs": 0,
        "anchor30_reaction": "fair",
        "min_payout_range": "30_49",
        "pricing_structure_pref": "whichever",
        "weighing_trust": "photo_ai",
        "payment_pref": "wallet_30",
        "track_a_fee_range": "11_20",
        "volume": {"rubbers": "2to3", "bottles": "2to3", "other": "gt3"},
        "ewaste_expectations": {"phone": "10_29", "tv": "100plus", "cables": "10_29", "appliance": "30_99"},
        "open_feedback": "When I get good value or know that at least my waste can earn me something",
        "submitted_at": "2026-09-07T06:00:34.148Z",
    },
]


def seed_responses(apps, schema_editor):
    MarketSurveyResponse = apps.get_model("intelligence", "MarketSurveyResponse")
    for entry in SUBMISSIONS:
        entry = dict(entry)
        raw_answers = {k: v for k, v in entry.items() if k != "external_id"}
        entry["submitted_at"] = parse_datetime(entry["submitted_at"])
        MarketSurveyResponse.objects.get_or_create(
            external_id=entry.pop("external_id"),
            defaults={**entry, "raw_answers": raw_answers, "source": "formasty"},
        )


def remove_seeded_responses(apps, schema_editor):
    MarketSurveyResponse = apps.get_model("intelligence", "MarketSurveyResponse")
    MarketSurveyResponse.objects.filter(
        external_id__in=[s["external_id"] for s in SUBMISSIONS]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("intelligence", "0003_marketsurveyresponse"),
    ]

    operations = [
        migrations.RunPython(seed_responses, remove_seeded_responses),
    ]
