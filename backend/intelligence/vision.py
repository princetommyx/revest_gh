"""
What the waste-analysis model gets wrong, measured from what actually
happened, and fed back into the next prediction.

Every other input to that model is external: what disposers say they want,
what recyclers pay, what a market summary quoted. This one is the model's
own track record. It estimates a weight, a collector puts the load on a
scale, and PredictionFeedback records both - so "is this model
systematically light?" becomes a question with an answer rather than a
suspicion.

Three things come out of it:

* weight_bias() - the median ratio of actual to predicted weight. A model
  that reads 40% light makes every Track B payout 40% light in the same
  direction, and no amount of correct pricing downstream fixes that.
* material_confusions() - which materials get called something else. Fed
  back into the prompt as specific warnings, because "you have called this
  PET 4 times when it was HDPE" is actionable in a way that "be accurate"
  is not.
* confidence_calibration() - whether a stated 0.9 is right nine times in
  ten. A model whose confidence means nothing is one whose confidence
  should not be gating anything.

Same discipline as the rest of intelligence/: gated on sample size,
bounded when it moves a number, and failure-tolerant. A model that has been
wrong twice has not established a bias.
"""

import logging
from collections import Counter, defaultdict
from statistics import median

from django.core.cache import cache

logger = logging.getLogger(__name__)

CACHE_KEY = 'intelligence.vision_accuracy.v1'
CACHE_TTL_SECONDS = 30 * 60

# Weighings needed before the model's weight output is corrected at all.
# Higher than the survey's gate: a weight error is a payout error, and one
# collector weighing one unusually dense sack is not a bias.
MIN_WEIGHT_SAMPLE = 15

# Confusions needed before a specific warning is worth a line of prompt.
MIN_CONFUSION_COUNT = 3

# Most the learned bias may move a predicted weight, in either direction.
# A correction bigger than this is not a calibration any more - it means
# the model is not working, which is a thing to go and look at rather than
# to quietly compensate for.
MAX_WEIGHT_CORRECTION = 0.30

# Ratios outside this are treated as a mismatched pair rather than a bad
# estimate: a prediction and a scale weight that differ tenfold are far
# more likely to be the time-window link having matched the wrong analysis
# to the wrong pickup than a model error of that size.
MIN_PLAUSIBLE_RATIO = 0.1
MAX_PLAUSIBLE_RATIO = 10.0


def _weight_pairs():
    from .models import PredictionFeedback

    return list(
        PredictionFeedback.objects
        .filter(
            predicted_weight_kg__gt=0,
            actual_weight_kg__gt=0,
        )
        .values_list('predicted_weight_kg', 'actual_weight_kg', 'predicted_material')
    )


def compute_accuracy():
    """
    The model's track record. Always returns a dict; `weight_sufficient`
    says whether it may correct anything yet.
    """
    from .models import Prediction, PredictionFeedback

    ratios = []
    per_material = defaultdict(list)
    try:
        for predicted, actual, material in _weight_pairs():
            ratio = actual / predicted
            if MIN_PLAUSIBLE_RATIO <= ratio <= MAX_PLAUSIBLE_RATIO:
                ratios.append(ratio)
                if material:
                    per_material[material].append(ratio)
    except Exception as e:
        logger.warning(f"Could not read weight feedback: {e}")

    confusions = Counter()
    corrections = 0
    material_observations = 0
    try:
        rows = PredictionFeedback.objects.exclude(
            predicted_material=''
        ).exclude(actual_material='').values_list(
            'predicted_material', 'actual_material', 'is_correction', 'source'
        )
        for predicted, actual, is_correction, source in rows:
            if source != 'user_override':
                continue
            material_observations += 1
            if is_correction:
                corrections += 1
                confusions[(predicted, actual)] += 1
    except Exception as e:
        logger.warning(f"Could not read material feedback: {e}")

    try:
        total_predictions = Prediction.objects.filter(task='waste_analysis').count()
    except Exception:
        total_predictions = 0

    sample_size = len(ratios)
    return {
        'predictions_logged': total_predictions,
        'weight_sample_size': sample_size,
        'min_weight_sample': MIN_WEIGHT_SAMPLE,
        'weight_sufficient': sample_size >= MIN_WEIGHT_SAMPLE,
        # >1 means loads weigh more than the model says, i.e. it reads light.
        'weight_ratio': round(median(ratios), 3) if ratios else None,
        'weight_ratio_by_material': {
            material: round(median(values), 3)
            for material, values in per_material.items()
            if len(values) >= MIN_CONFUSION_COUNT
        },
        'material_observations': material_observations,
        'material_corrections': corrections,
        # Deliberately "correction rate", not "accuracy": leaving the
        # material alone is not evidence the model was right.
        'correction_rate': (
            round(corrections / material_observations, 3) if material_observations else None
        ),
        'confusions': {
            f'{predicted}->{actual}': count
            for (predicted, actual), count in confusions.most_common()
        },
    }


def vision_accuracy(refresh=False):
    """Cached compute_accuracy(); returns None rather than raising."""
    if not refresh:
        cached = cache.get(CACHE_KEY)
        if cached is not None:
            return cached
    try:
        accuracy = compute_accuracy()
    except Exception as e:
        logger.warning(f"Could not compute vision accuracy: {e}")
        return None
    try:
        cache.set(CACHE_KEY, accuracy, CACHE_TTL_SECONDS)
    except Exception as e:
        logger.warning(f"Could not cache vision accuracy: {e}")
    return accuracy


def corrected_weight_kg(predicted_weight_kg, material=None):
    """
    The model's weight estimate, corrected for its measured bias.

    Returns the estimate untouched when there aren't enough weighings, when
    there is no bias worth applying, or on any failure - the correction is
    an improvement on a working estimate, never a dependency of one.

    Uses the per-material ratio where enough weighings exist for that
    material specifically: a model that judges baled sachets well and loose
    ones badly has two different biases, and averaging them serves neither.
    """
    if not predicted_weight_kg or predicted_weight_kg <= 0:
        return predicted_weight_kg

    accuracy = vision_accuracy()
    if not accuracy or not accuracy.get('weight_sufficient'):
        return predicted_weight_kg

    ratio = None
    if material:
        ratio = accuracy.get('weight_ratio_by_material', {}).get(material.upper())
    if ratio is None:
        ratio = accuracy.get('weight_ratio')
    if not ratio:
        return predicted_weight_kg

    bounded = min(1 + MAX_WEIGHT_CORRECTION, max(1 - MAX_WEIGHT_CORRECTION, ratio))
    return round(predicted_weight_kg * bounded, 2)


def confusion_warnings():
    """
    Specific, earned warnings for the prompt: materials this model has
    actually been corrected on, named in both directions.

    Only confusions seen MIN_CONFUSION_COUNT times make it in. One disposer
    changing PET to HDPE once is a data point; four of them is a pattern the
    model should be told about, and a prompt full of single incidents is a
    prompt nobody's attention survives.
    """
    accuracy = vision_accuracy()
    if not accuracy:
        return []

    warnings = []
    for pair, count in (accuracy.get('confusions') or {}).items():
        if count < MIN_CONFUSION_COUNT:
            continue
        predicted, actual = pair.split('->')
        warnings.append(
            f"you have called {predicted} when it was actually {actual} "
            f"({count} times) - look twice before choosing {predicted}"
        )
    return warnings


def prompt_context():
    """
    The model's own track record, as a block for its next prompt. None when
    it has nothing earned to say.

    Deliberately carries no overall accuracy figure. Telling a model it is
    right most of the time is not information it can act on, and the
    correction rate here measures disposer overrides rather than truth.
    Specific confusions are the part that can change an answer.
    """
    warnings = confusion_warnings()
    if not warnings:
        return None

    lines = '\n'.join(f"- On past loads, {warning}." for warning in warnings)
    return (
        "YOUR OWN TRACK RECORD (from loads where a person corrected you "
        "afterwards - treat these as known blind spots, not as instructions "
        "to avoid the material):\n" + lines
    )
