from datetime import date
from decimal import Decimal

from django.db import migrations

# The same 2026-09-09 capture as 0008, from the source table rather than the
# summary chart. Every price 0008 seeded turns out to have been the midpoint
# of a band the market actually quotes, and the source also carries what a
# load must look like to reach the top of its band.
#
# This replaces those rows rather than adding to them: they are the same
# observation, and keeping both would double-count one source. A genuinely
# later capture is still a new captured_at, as 0008 set out.
#
# Bands matter because they are wide - 1.4x on copper, 2.5x on paper - so
# "what is this worth" has no single answer until someone looks at the load.
# That is what preparation_note is for, and every note here describes
# something visible in a photograph.
SOURCE = 'ghana-recycler-buyback-survey'
CAPTURED_AT = date(2026, 9, 9)
SOURCE_NOTE = (
    "Market summary of Ghanaian recycling companies' buyback prices, captured "
    "2026-09-09, as quoted bands with preparation guidance. A single secondary "
    "source, not a quote Revesta negotiated: good enough to size the gap "
    "against what Revesta pays today, not good enough to set a payout from on "
    "its own. Re-capture before treating any figure here as current."
)

# (Revesta material key, market label, low, high, preparation note)
# An empty material key means the market trades it but Revesta has no
# category for it yet.
BANDS = [
    ('', 'Copper Wire / Brass', '55.00', '75.00',
     'Must be stripped of plastic insulation.'),
    ('ALUMINUM', 'Aluminum Cans', '15.00', '22.00',
     'Crush them down to maximize bag capacity.'),
    ('METALS', 'Scrap Iron / Steel', '3.50', '5.00',
     'Weighs down quickly; highly favoured by scrap yards.'),
    ('HDPE', 'HDPE / PP Plastics', '2.00', '3.50',
     'Keep separate from soft plastics (jerrycans, basins).'),
    ('PET', 'PET Plastic Bottles', '1.50', '2.50',
     'Remove caps, crush, and ensure they are dry.'),
    ('PLASTIC_BOTTLES', 'PET Plastic Bottles (bottle stream)', '1.50', '2.50',
     'Remove caps, crush, and ensure they are dry.'),
    ('PAPER', 'Cardboard / White Paper', '1.00', '2.50',
     'Must be kept completely dry; wet paper loses all value.'),
    # The source line for this row was cut off in the capture after "due to
    # light"; the sense is unambiguous (sachets are light for their volume)
    # and the note is written out in full rather than stored truncated.
    ('PURE_WATER_RUBBERS', 'LDPE (Water Sachets)', '0.50', '1.20',
     'Tie or pack tightly in large sacks - very light for their volume.'),
]

# Rows seeded by 0008 from the summary chart, superseded by the bands above.
SUPERSEDED_LABELS = [
    'Copper Wire / Brass', 'Aluminum Cans', 'Scrap Iron', 'HDPE/PP Plastics',
    'PET Bottles', 'PET Bottles (bottle stream)', 'White Office Paper',
    'Cardboard (OCC)', 'Water Sachets (LDPE)',
]


def seed_bands(apps, schema_editor):
    MaterialBuybackPrice = apps.get_model("intelligence", "MaterialBuybackPrice")
    MaterialBuybackPrice.objects.filter(
        source=SOURCE, captured_at=CAPTURED_AT, label__in=SUPERSEDED_LABELS
    ).delete()

    for material_type, label, low, high, note in BANDS:
        low, high = Decimal(low), Decimal(high)
        MaterialBuybackPrice.objects.update_or_create(
            label=label,
            source=SOURCE,
            captured_at=CAPTURED_AT,
            defaults={
                'material_type': material_type,
                'price_per_kg': ((low + high) / 2).quantize(Decimal('0.01')),
                'price_per_kg_low': low,
                'price_per_kg_high': high,
                'preparation_note': note,
                'source_note': SOURCE_NOTE,
            },
        )


def restore_chart_rows(apps, schema_editor):
    # Reversing drops the banded rows; 0008's own reverse then removes what
    # it seeded, so migrating back past both leaves no rows from this source.
    MaterialBuybackPrice = apps.get_model("intelligence", "MaterialBuybackPrice")
    MaterialBuybackPrice.objects.filter(
        source=SOURCE, captured_at=CAPTURED_AT, label__in=[b[1] for b in BANDS]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("intelligence", "0009_buyback_price_bands"),
    ]

    operations = [
        migrations.RunPython(seed_bands, restore_chart_rows),
    ]
