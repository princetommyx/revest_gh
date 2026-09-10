import json

from django.core.management.base import BaseCommand, CommandError

from intelligence.formasty import normalize_submission, upsert_submission
from intelligence.market_signal import market_signal, refresh_market_signal
from intelligence.models import MarketSurveyResponse


class Command(BaseCommand):
    """
    Import "what should your waste pay you?" survey responses from a
    Formasty submissions export.

    The first two responses were seeded as a data migration because there
    were two of them and no importer; that doesn't scale to a form that
    keeps collecting. Point this at a saved formasty_list_submissions
    response (or a bare JSON list of submissions) and it upserts on
    external_id, so importing the same export twice is a no-op and a
    re-export that includes older rows just refreshes them.

        python manage.py import_formasty_submissions --file submissions.json

    Refreshes the cached market signal on the way out, so the new responses
    reach pricing and the waste-analysis prompt immediately rather than
    whenever the cache happened to expire.
    """

    help = "Import Formasty survey submissions into MarketSurveyResponse."

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            required=True,
            help="Path to a JSON file: either a formasty_list_submissions response or a list of submissions.",
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help="Parse and report without writing anything.",
        )

    def handle(self, *args, **options):
        path = options['file']
        try:
            with open(path, encoding='utf-8') as fh:
                payload = json.load(fh)
        except (OSError, ValueError) as e:
            raise CommandError(f"Could not read {path}: {e}")

        submissions = self._extract_submissions(payload)
        if not submissions:
            raise CommandError(f"No submissions found in {path}.")

        created_count = updated_count = skipped_count = 0
        for submission in submissions:
            try:
                if options['dry_run']:
                    normalize_submission(submission)
                    self.stdout.write(f"  would import {submission.get('id')}")
                    continue
                _, created = upsert_submission(MarketSurveyResponse, submission)
            except ValueError as e:
                # One malformed submission shouldn't cost the whole batch -
                # the rest of the export is still good data, and the id of
                # the bad one is right here to go and look at.
                self.stderr.write(self.style.WARNING(f"  skipped: {e}"))
                skipped_count += 1
                continue
            if created:
                created_count += 1
            else:
                updated_count += 1

        if options['dry_run']:
            self.stdout.write(self.style.WARNING(
                f"Dry run: {len(submissions) - skipped_count} submission(s) parsed, nothing written."
            ))
            return

        signal = refresh_market_signal() or market_signal()
        self.stdout.write(self.style.SUCCESS(
            f"Imported {created_count} new and refreshed {updated_count} existing response(s)."
        ))
        if skipped_count:
            self.stdout.write(self.style.WARNING(f"Skipped {skipped_count} unusable submission(s)."))
        if signal:
            state = 'moving prices' if signal['sufficient'] else (
                f"not yet moving prices (needs {signal['min_sample_size']})"
            )
            self.stdout.write(
                f"Market signal now spans {signal['sample_size']} response(s) - {state}. "
                f"Sack rate GHS {signal['sack_rate_ghs']}, "
                f"call-out floor GHS {signal['callout_floor_ghs']}."
            )

    def _extract_submissions(self, payload):
        """
        Accepts the shapes an export actually arrives in: the raw MCP
        envelope ({"response": {"submissions": [...]}}), the inner response,
        or a plain list.
        """
        if isinstance(payload, list):
            return payload
        if isinstance(payload, dict):
            if 'response' in payload and isinstance(payload['response'], dict):
                payload = payload['response']
            if isinstance(payload.get('submissions'), list):
                return payload['submissions']
        return []
