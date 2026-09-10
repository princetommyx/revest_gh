from datetime import date
from decimal import Decimal

from django.db import migrations

# Observed Ghanaian buyback/gate prices - what recyclers and scrap dealers
# pay per kilogram - captured 2026-09-09 from a market summary of recycling
# companies in Ghana and their waste prices.
#
# Seeded rather than left to be typed into the admin because these are the
# first hard numbers the codebase has ever had for the supply side: until
# now every Track B fallback rate in logistics/pricing.py was a figure with
# no stated origin. Re-running is a no-op (keyed on label + source +
# captured_at), and a later capture is a new set of rows with a newer
# captured_at rather than an edit to these - the point is to keep the
# history, so a payout that drifted can be traced to the price that moved.
SOURCE = 'ghana-recycler-buyback-survey'
CAPTURED_AT = date(2026, 9, 9)
SOURCE_NOTE = (
    "Market summary of Ghanaian recycling companies' buyback prices, captured "
    "2026-09-09. A single secondary source, not a quote Revesta negotiated: "
    "good enough to size the gap against what Revesta pays today, not good "
    "enough to set a payout from on its own. Re-capture before treating any "
    "figure here as current."
)

# (Revesta material key, market's own label, GHS/kg)
# An empty material key means the market trades it but Revesta has no
# category for it yet.
PRICES = [
    ('', 'Copper Wire / Brass', '65.00'),
    ('ALUMINUM', 'Aluminum Cans', '18.50'),
    ('METALS', 'Scrap Iron', '4.25'),
    ('HDPE', 'HDPE/PP Plastics', '2.75'),
    ('PET', 'PET Bottles', '2.00'),
    ('PLASTIC_BOTTLES', 'PET Bottles (bottle stream)', '2.00'),
    ('PAPER', 'White Office Paper', '2.00'),
    ('PAPER', 'Cardboard (OCC)', '1.40'),
    ('PURE_WATER_RUBBERS', 'Water Sachets (LDPE)', '0.85'),
]


def seed_prices(apps, schema_editor):
    MaterialBuybackPrice = apps.get_model("intelligence", "MaterialBuybackPrice")
    for material_type, label, price in PRICES:
        MaterialBuybackPrice.objects.update_or_create(
            label=label,
            source=SOURCE,
            captured_at=CAPTURED_AT,
            defaults={
                'material_type': material_type,
                'price_per_kg': Decimal(price),
                'source_note': SOURCE_NOTE,
            },
        )


def remove_seeded_prices(apps, schema_editor):
    MaterialBuybackPrice = apps.get_model("intelligence", "MaterialBuybackPrice")
    MaterialBuybackPrice.objects.filter(source=SOURCE, captured_at=CAPTURED_AT).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("intelligence", "0007_materialbuybackprice"),
    ]

    operations = [
        migrations.RunPython(seed_prices, remove_seeded_prices),
    ]
