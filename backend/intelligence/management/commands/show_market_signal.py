import json

from django.core.management.base import BaseCommand

from intelligence.buyback import (
    COLLECTION_MARGIN,
    FLAT_RATE_MATERIALS,
    buyback_rates,
    refresh_buyback_rates,
    price_band,
    quality_pricing_active,
    sack_economics,
    unbounded_payout_per_kg,
    unmapped_materials,
)
from intelligence.market_signal import market_signal
from logistics.pricing import (
    BAG_SIZE_RATES,
    SACK_FLAT_RATE,
    calculate_track_b_earnings,
    survey_adjusted_sack_rate,
    survey_adjusted_track_a_rate,
)


class Command(BaseCommand):
    """
    Print what the survey responses currently say, and what they are
    actually doing to prices right now.

    Exists because the signal is otherwise invisible: it is applied deep
    inside calculate_track_b_earnings, and "is the survey moving the sack
    rate yet, and by how much?" should be answerable without opening a
    Django shell in production.
    """

    help = "Show the market signal derived from Formasty survey responses, and its effect on pricing."

    def add_arguments(self, parser):
        parser.add_argument('--json', action='store_true', help="Print the raw signal as JSON.")

    def handle(self, *args, **options):
        signal = market_signal(refresh=True)
        if not signal:
            self.stdout.write(self.style.ERROR("No market signal available."))
            return

        if options['json']:
            self.stdout.write(json.dumps(signal, indent=2, sort_keys=True))
            return

        self.stdout.write(self.style.MIGRATE_HEADING("Market survey signal"))
        self.stdout.write(f"  responses          : {signal['sample_size']}")
        if signal['sufficient']:
            self.stdout.write(self.style.SUCCESS("  applied to pricing : yes"))
        else:
            self.stdout.write(self.style.WARNING(
                f"  applied to pricing : no (needs {signal['min_sample_size']})"
            ))
        self.stdout.write(f"  GHS30/sack score   : {signal['anchor30_score']} (1.0 = everyone loved it)")
        self.stdout.write(f"  call-out floor     : GHS {signal['callout_floor_ghs']}")
        self.stdout.write(f"  medium-sack haulage: GHS {signal['track_a_medium_fee_ghs']}")
        self.stdout.write(f"  e-waste expected   : {signal['ewaste_expectations_ghs']}")
        self.stdout.write(f"  weekly sacks       : {signal['weekly_sacks']}")
        self.stdout.write(f"  material mix       : {signal['material_mix']}")
        self.stdout.write(f"  areas              : {signal['top_areas']}")

        self.stdout.write(self.style.MIGRATE_HEADING("Effect on live prices"))
        sack = survey_adjusted_sack_rate()
        self.stdout.write(f"  sack payout        : GHS {SACK_FLAT_RATE} -> GHS {sack}")
        for size in ('SMALL', 'MEDIUM', 'LARGE', 'XLARGE'):
            self.stdout.write(
                f"  track A {size:<7}    : GHS {BAG_SIZE_RATES[size]} -> GHS {survey_adjusted_track_a_rate(size)}"
            )

        self.report_buyback(sack)

    def report_buyback(self, sack_rate):
        rates = refresh_buyback_rates() or buyback_rates()
        if not rates:
            self.stdout.write(self.style.WARNING("No buyback prices captured yet."))
            return

        self.stdout.write(self.style.MIGRATE_HEADING(
            f"Per-kg payouts vs recycler gate prices (Revesta keeps {COLLECTION_MARGIN:.0%})"
        ))
        self.stdout.write(f"  {'material':<20} {'gate':>8} {'could pay':>10} {'pays now':>10} {'gap':>8}")
        for material in sorted(rates):
            if material in FLAT_RATE_MATERIALS:
                # Paid per sack, not per kilogram - comparing a flat sack
                # payout against a per-kg column reads as a GHS 29 kilo.
                # Their economics are the sack section below.
                continue
            gate = rates[material]
            target = unbounded_payout_per_kg(material)
            paying = calculate_track_b_earnings(material, 1)
            gap = target - paying
            line = f"  {material:<20} {gate:>8} {target:>10} {paying:>10} {gap:>+8}"
            # Flag the materials where the gap is bigger than the payout
            # itself - those are not a tuning question, they are a rate
            # that was never right.
            self.stdout.write(self.style.ERROR(line) if gap > paying else line)

        self.stdout.write(self.style.MIGRATE_HEADING("Condition-based pricing"))
        from logistics.pricing import FALLBACK_RATES

        for material in sorted(rates):
            if material in FLAT_RATE_MATERIALS:
                continue
            current = FALLBACK_RATES.get(material)
            if current is None:
                continue
            band = price_band(material)
            band_text = f"GHS {band[0]}-{band[1]}/kg" if band else "no band"
            active, reason = quality_pricing_active(material, current)
            style = self.style.SUCCESS if active else self.style.WARNING
            self.stdout.write(f"  {material:<20} band {band_text}")
            self.stdout.write(style(f"    {'active' if active else 'INERT'}: {reason}"))

        unmapped = unmapped_materials()
        if unmapped:
            self.stdout.write(self.style.MIGRATE_HEADING("Traded here, but Revesta has no category for it"))
            for label, price in unmapped:
                self.stdout.write(self.style.WARNING(f"  {label}: GHS {price}/kg at the gate"))

        self.stdout.write(self.style.MIGRATE_HEADING("Flat-rate sack economics"))
        for material, economics in sack_economics(sack_rate).items():
            verdict = 'clears' if economics['clears'] else 'LOSES MONEY'
            style = self.style.SUCCESS if economics['clears'] else self.style.ERROR
            self.stdout.write(style(
                f"  {material}: pays GHS {economics['sack_payout_ghs']} per sack, "
                f"gate value GHS {economics['buyback_per_kg_ghs']}/kg"
            ))
            self.stdout.write(
                f"    break-even sack weight : {economics['break_even_kg']} kg"
            )
            self.stdout.write(
                f"    actual sack weight     : {economics['sack_kg']} kg ({economics['sack_kg_source']})"
            )
            self.stdout.write(style(
                f"    margin per sack        : GHS {economics['margin_ghs']} - {verdict}"
            ))
