from django.core.management.base import BaseCommand

from intelligence.vision import (
    MAX_WEIGHT_CORRECTION,
    MIN_CONFUSION_COUNT,
    confusion_warnings,
    corrected_weight_kg,
    vision_accuracy,
)


class Command(BaseCommand):
    """
    How well the waste-analysis model is actually doing, measured against
    scale weights and disposer corrections rather than against its own
    confidence.

    Worth having as its own command because the answer is otherwise
    invisible: the correction is applied silently inside the analysis
    response, and "is the model reading light, and by how much?" should not
    require a production shell.
    """

    help = "Show the waste-analysis model's measured accuracy and the correction it earns."

    def handle(self, *args, **options):
        accuracy = vision_accuracy(refresh=True)
        if not accuracy:
            self.stdout.write(self.style.ERROR("No accuracy data available."))
            return

        self.stdout.write(self.style.MIGRATE_HEADING("Waste analysis track record"))
        self.stdout.write(f"  predictions logged : {accuracy['predictions_logged']}")
        self.stdout.write(f"  weighed afterwards : {accuracy['weight_sample_size']}")

        if accuracy['weight_sufficient']:
            self.stdout.write(self.style.SUCCESS("  correcting weights : yes"))
        else:
            self.stdout.write(self.style.WARNING(
                f"  correcting weights : no (needs {accuracy['min_weight_sample']})"
            ))

        ratio = accuracy['weight_ratio']
        if ratio:
            direction = 'light' if ratio > 1 else 'heavy'
            self.stdout.write(
                f"  actual vs predicted: {ratio}x - the model reads {direction} "
                f"by {abs(1 - ratio) * 100:.0f}%"
            )
            for material, material_ratio in sorted(accuracy['weight_ratio_by_material'].items()):
                self.stdout.write(f"    {material:<22} {material_ratio}x")
        else:
            self.stdout.write("  actual vs predicted: - (nothing weighed yet)")

        self.stdout.write(self.style.MIGRATE_HEADING("Material corrections by disposers"))
        self.stdout.write(f"  submissions seen   : {accuracy['material_observations']}")
        self.stdout.write(f"  materials changed  : {accuracy['material_corrections']}")
        if accuracy['correction_rate'] is not None:
            self.stdout.write(
                f"  correction rate    : {accuracy['correction_rate'] * 100:.0f}%"
                "  (agreement is not counted as confirmation)"
            )
        confusions = accuracy['confusions'] or {}
        if confusions:
            for pair, count in confusions.items():
                style = self.style.ERROR if count >= MIN_CONFUSION_COUNT else str
                line = f"  {pair:<28} {count}x"
                self.stdout.write(style(line) if callable(style) else line)
        else:
            self.stdout.write("  no corrections recorded yet")

        warnings = confusion_warnings()
        self.stdout.write(self.style.MIGRATE_HEADING("Fed back into the prompt"))
        if warnings:
            for warning in warnings:
                self.stdout.write(self.style.SUCCESS(f"  - {warning}"))
        else:
            self.stdout.write(self.style.WARNING(
                f"  nothing yet - a confusion needs {MIN_CONFUSION_COUNT} sightings to earn a line"
            ))

        if accuracy['weight_sufficient'] and ratio:
            self.stdout.write(self.style.MIGRATE_HEADING(
                f"Effect on a weight estimate (capped at +-{MAX_WEIGHT_CORRECTION:.0%})"
            ))
            for predicted in (2, 5, 10, 25):
                self.stdout.write(
                    f"  {predicted:>3} kg predicted -> {corrected_weight_kg(predicted)} kg used"
                )
