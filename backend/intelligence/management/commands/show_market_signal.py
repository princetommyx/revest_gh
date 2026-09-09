import json

from django.core.management.base import BaseCommand

from intelligence.market_signal import market_signal
from logistics.pricing import (
    BAG_SIZE_RATES,
    SACK_FLAT_RATE,
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
