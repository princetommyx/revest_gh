"""
Turns MarketSurveyResponse rows into numbers the rest of the app can price
and prompt with.

Until now the survey answers sat in a table nothing read: pricing still ran
on the constants in logistics/pricing.py, and the waste-analysis prompt in
market/ai_views.py described materials with no idea which ones Ghanaian
households actually hold or in what quantity. This module is the bridge -
it collapses the free-text/bucketed survey answers into a small set of
figures (what a sack has to pay before someone bothers calling, what people
will pay to have mixed rubbish taken, what they expect for a dead phone)
and hands them to pricing and to the model prompt.

Two deliberate safeguards, because survey answers are stated intent, not
observed behaviour:

* MIN_SAMPLE_SIZE - below this many responses the signal reports
  sufficient=False and every consumer keeps its existing constant. A
  handful of answers is an anecdote, and an anecdote should not move a
  live payout.
* MAX_SHIFT - even with enough responses, the signal can only move a price
  by this fraction of the rule-based constant. If the survey says a sack
  should pay GHS 80, the price moves toward it by a bounded step and the
  gap shows up in the admin/rollup instead of a payout tripling overnight
  on the strength of six people.

Everything here is read-only and failure-tolerant: market_signal() returns
None rather than raising, so an unavailable database or an unexpected answer
shape degrades to "price exactly as before", never to a 500 on a disposer's
price estimate.
"""

import logging
from collections import Counter, defaultdict

from django.core.cache import cache

logger = logging.getLogger(__name__)

CACHE_KEY = 'intelligence.market_signal.v1'
CACHE_TTL_SECONDS = 15 * 60

# Below this many survey responses, nothing here is allowed to move a price.
MIN_SAMPLE_SIZE = 5

# Hard ceiling on how far the survey may pull any price away from the
# rule-based constant it is adjusting.
MAX_SHIFT = 0.25

# The offer the survey actually tested ("Revesta would pay GHS 30 for one
# full sack of pure water rubbers"), and the flat sack payout in
# logistics/pricing.py it corresponds to. The reactions to this exact
# number are what make the answers usable as a price signal at all.
SACK_ANCHOR_GHS = 30.0

# The medium-sack haulage fee the survey asked about ("how much would you
# pay to have one medium sack carried away"), matching BAG_SIZE_RATES
# ['MEDIUM'] in logistics/pricing.py.
TRACK_A_MEDIUM_ANCHOR_GHS = 10.0

# --- Bucket -> GHS midpoints -------------------------------------------
# Each survey bucket becomes the middle of its range. Open-ended top
# buckets ("GHS 50 or more") are scored a little above their floor rather
# than at it: the answer says "at least 50", so 50 would systematically
# under-read that group.

MIN_PAYOUT_GHS = {
    'free_ok': 0.0,
    'lt10': 7.0,
    '10_19': 14.5,
    '20_29': 24.5,
    '30_49': 39.5,
    '50plus': 60.0,
}

# 'already_pay' has no number attached - the respondent pays for haulage
# today but never said how much - so it is left out of the average and
# counted separately as evidence that a paid tier already exists for them.
TRACK_A_FEE_GHS = {
    'zero': 0.0,
    '1_5': 3.0,
    '6_10': 8.0,
    '11_20': 15.5,
    'gt20': 25.0,
}

EWASTE_GHS = {
    'free': 0.0,
    'lt10': 7.0,
    '10_29': 19.5,
    '30_99': 64.5,
    '100plus': 130.0,
}

VOLUME_SACKS_PER_WEEK = {
    'lt1': 0.5,
    '1': 1.0,
    '2to3': 2.5,
    'gt3': 4.0,
}

# How well the GHS 30/sack anchor landed, 0 (rejected) to 1 (enthusiastic).
# 'fair' sits at ANCHOR_TARGET below: an offer people call fair is an offer
# that needs no correction, so the whole scale is read relative to it.
ANCHOR30_SCORE = {
    'too_small': 0.0,
    'small_maybe': 0.35,
    'fair': 0.6,
    'good': 0.8,
    'very_good': 1.0,
}
ANCHOR_TARGET = ANCHOR30_SCORE['fair']

# Payment answers that mean "cash, now" rather than "more money, later".
INSTANT_CASH_CHOICES = {'cash_27', 'cash_only'}
WALLET_CHOICES = {'wallet_30', 'wallet_33_next_day'}


def _mean(values):
    values = [v for v in values if v is not None]
    return sum(values) / len(values) if values else None


def _rate(responses, predicate):
    """Share of responses matching predicate, or None when there are none."""
    if not responses:
        return None
    return sum(1 for r in responses if predicate(r)) / len(responses)


def clamp_to_shift(base, target, max_shift=MAX_SHIFT):
    """
    Pull `base` toward `target`, but never further than max_shift of base.
    Returns a float. The bound is what makes it safe for a survey of a few
    dozen people to touch a live payout at all.
    """
    if target is None:
        return base
    low = base * (1 - max_shift)
    high = base * (1 + max_shift)
    return min(high, max(low, target))


def compute_market_signal():
    """
    Aggregate every MarketSurveyResponse into one signal dict. Hits the DB;
    callers should normally use market_signal() for the cached version.
    """
    from .models import MarketSurveyResponse

    responses = list(MarketSurveyResponse.objects.all())
    sample_size = len(responses)

    anchor_score = _mean([ANCHOR30_SCORE.get(r.anchor30_reaction) for r in responses])
    payout_floor = _mean([MIN_PAYOUT_GHS.get(r.min_payout_range) for r in responses])
    track_a_fee = _mean([TRACK_A_FEE_GHS.get(r.track_a_fee_range) for r in responses])
    price_now = _mean([r.price_now_ghs for r in responses if r.price_now_ghs is not None])

    # What a sack should pay, read off the reaction to the GHS 30 anchor:
    # a crowd that finds 30 "small" pulls the rate up, one that finds it
    # "very good" lets it ease down. The 0.5 factor keeps the correction
    # gentler than the raw sentiment gap.
    if anchor_score is None:
        sack_rate = SACK_ANCHOR_GHS
    else:
        sack_rate = SACK_ANCHOR_GHS * (1 + 0.5 * (ANCHOR_TARGET - anchor_score))
    sack_rate = clamp_to_shift(SACK_ANCHOR_GHS, sack_rate)

    ewaste_buckets = defaultdict(list)
    for r in responses:
        for item, bucket in (r.ewaste_expectations or {}).items():
            value = EWASTE_GHS.get(bucket)
            if value is not None:
                ewaste_buckets[item].append(value)
    ewaste_expectations = {item: round(_mean(vals), 2) for item, vals in ewaste_buckets.items()}

    volume_buckets = defaultdict(list)
    for r in responses:
        for key, bucket in (r.volume or {}).items():
            value = VOLUME_SACKS_PER_WEEK.get(bucket)
            if value is not None:
                volume_buckets[key].append(value)
    weekly_sacks = {key: round(_mean(vals), 2) for key, vals in volume_buckets.items()}

    material_counts = Counter()
    for r in responses:
        material_counts.update(r.materials or [])

    area_counts = Counter(r.area.strip().title() for r in responses if r.area)

    return {
        'sample_size': sample_size,
        'sufficient': sample_size >= MIN_SAMPLE_SIZE,
        'min_sample_size': MIN_SAMPLE_SIZE,
        'max_shift': MAX_SHIFT,

        # Pricing figures
        'sack_rate_ghs': round(sack_rate, 2),
        'sack_anchor_ghs': SACK_ANCHOR_GHS,
        'anchor30_score': round(anchor_score, 3) if anchor_score is not None else None,
        'callout_floor_ghs': round(payout_floor, 2) if payout_floor is not None else None,
        'track_a_medium_fee_ghs': round(track_a_fee, 2) if track_a_fee is not None else None,
        'reported_price_now_ghs': round(price_now, 2) if price_now is not None else None,
        'ewaste_expectations_ghs': ewaste_expectations,

        # Behavioural rates - not prices, but they decide which experience
        # to show (flat quote vs weigh-in, cash vs wallet, photo estimate
        # vs a scale).
        'flat_pricing_rate': _rate(responses, lambda r: r.pricing_structure_pref == 'flat'),
        'photo_ai_trust_rate': _rate(responses, lambda r: r.weighing_trust == 'photo_ai'),
        'no_weighing_trust_rate': _rate(responses, lambda r: r.weighing_trust == 'no_trust'),
        'instant_cash_rate': _rate(responses, lambda r: r.payment_pref in INSTANT_CASH_CHOICES),
        'wallet_rate': _rate(responses, lambda r: r.payment_pref in WALLET_CHOICES),
        'track_a_paying_today_rate': _rate(responses, lambda r: r.track_a_fee_range == 'already_pay'),
        'track_a_refusal_rate': _rate(responses, lambda r: r.track_a_fee_range == 'zero'),

        # Context for the model prompt
        'weekly_sacks': weekly_sacks,
        'material_mix': dict(material_counts.most_common()),
        'top_areas': dict(area_counts.most_common(5)),
    }


def market_signal(refresh=False):
    """
    Cached compute_market_signal(). Returns None - never raises - if the
    signal can't be produced, so every caller can treat "no signal" and
    "signal not yet trustworthy" the same way: keep the constant.
    """
    if not refresh:
        cached = cache.get(CACHE_KEY)
        if cached is not None:
            return cached
    try:
        signal = compute_market_signal()
    except Exception as e:
        logger.warning(f"Could not compute market signal: {e}")
        return None
    try:
        cache.set(CACHE_KEY, signal, CACHE_TTL_SECONDS)
    except Exception as e:
        logger.warning(f"Could not cache market signal: {e}")
    return signal


def refresh_market_signal():
    """Recompute and re-cache immediately - called after an import."""
    return market_signal(refresh=True)


def priced_signal():
    """
    The signal only when it is allowed to move money: enough responses to
    be more than an anecdote. Pricing code calls this rather than
    market_signal() so the sample-size gate lives in exactly one place.
    """
    signal = market_signal()
    if signal and signal.get('sufficient'):
        return signal
    return None


# Human-readable names for the material keys the survey uses, so the prompt
# block reads as a sentence about real households rather than as a dump of
# form values.
MATERIAL_LABELS = {
    'rubbers': 'pure water rubbers (sachets)',
    'bottles': 'plastic bottles',
    'paper': 'paper and cardboard',
    'cans': 'tins and aluminium cans',
    'glass': 'glass bottles',
    'mixed': 'mixed household rubbish, nothing sorted',
    'ewaste': 'old electronics - phones, TVs, cables, fans',
}

VOLUME_LABELS = {
    'rubbers': 'pure water rubbers',
    'bottles': 'plastic bottles',
    'other': 'everything else mixed',
}


def prompt_context():
    """
    A short block of ground truth about Revesta's actual disposers, to drop
    into the waste-analysis prompt.

    The model was previously classifying Ghanaian household waste with no
    idea what Ghanaian households actually put out - so a bag of sachets
    got the same generic prior as a bale of PET. This is the survey talking
    to the model: which materials really show up, roughly how much of them
    per week, and what people expect a dead phone to be worth.

    Deliberately carries no GHS figure for the recyclables themselves. The
    prompt tells the model not to state prices (Revesta computes those
    server-side from material/weight); handing it a price table here would
    reintroduce exactly the drift that was taken out of that prompt. The
    e-waste expectations are the one exception and are framed as what
    *people expect*, because "a dead phone is worth something" is a
    classification cue, not a quote.

    Returns None when there aren't enough responses to say anything -
    callers then send the prompt exactly as it was before.
    """
    signal = priced_signal()
    if not signal:
        return None

    lines = []

    mix = signal.get('material_mix') or {}
    if mix:
        total = signal['sample_size']
        named = ', '.join(
            f"{MATERIAL_LABELS.get(key, key)} ({count}/{total})"
            for key, count in list(mix.items())[:5]
        )
        lines.append(f"- Materials disposers actually report holding, most common first: {named}.")

    weekly = signal.get('weekly_sacks') or {}
    if weekly:
        named = ', '.join(
            f"{VOLUME_LABELS.get(key, key)} ~{value} sacks/week"
            for key, value in weekly.items()
        )
        lines.append(f"- Typical household output: {named}. Loads are sacks, not industrial bales.")

    areas = signal.get('top_areas') or {}
    if areas:
        # Semicolons, not commas: respondents type areas like "Tema, comm 25"
        # themselves, and a comma-joined list of those reads as twice as many
        # places as there are.
        lines.append(f"- Collected mostly around: {'; '.join(areas)} (Greater Accra).")

    ewaste = signal.get('ewaste_expectations_ghs') or {}
    if ewaste:
        named = ', '.join(f"{item} ~GHS {value:g}" for item, value in ewaste.items())
        lines.append(
            "- Disposers expect real money for e-waste (their own stated expectations, "
            f"for your judgement of value only, never to be repeated as a price): {named}."
        )

    # Where the money actually is, per kilogram. Ranked, never priced: the
    # prompt forbids the model to state a price, and the ranking is the part
    # that changes its behaviour anyway - it says where careful
    # identification pays off (aluminium cans against steel tins) and where
    # it barely matters (paper grades).
    from .buyback import preparation_guidance, value_tiers

    tiers = value_tiers()
    if tiers:
        named = ', '.join(f"{key} ({tier})" for key, tier in tiers)
        lines.append(
            f"- Value per kg at Ghanaian recyclers, highest first: {named}. "
            "Spend your precision where the value is - telling aluminium from "
            "other metals matters far more than grading paper."
        )

    no_trust = signal.get('no_weighing_trust_rate')
    if no_trust is not None and no_trust > 0:
        lines.append(
            f"- {round(no_trust * 100)}% do not trust weighing at all, so a confident "
            "sack/bag count matters as much as your kilogram estimate."
        )

    guidance = preparation_guidance()
    if guidance:
        lines.append(
            "- What buyers here pay extra for, by material - judge the "
            f"\"prepared\" flag against the rule for the material you identify: {guidance}"
        )

    if not lines:
        return None

    return (
        "LOCAL MARKET CONTEXT (from {n} real disposer survey responses in Ghana - "
        "use it as a prior when the image is ambiguous, never to override what you "
        "can actually see):\n{lines}"
    ).format(n=signal['sample_size'], lines='\n'.join(lines))


def pricing_basis(prompt_grounded=False):
    """
    A compact, safe-to-return description of what shaped a quote: how many
    survey responses stood behind it, whether they were allowed to move the
    price yet, and whether they also grounded the model's classification.

    Returned to the client and stored on the Prediction row. Kept small and
    free of raw respondent text - it goes out over the API, and an
    open-feedback answer is somebody's own words about their household.
    """
    signal = market_signal()
    if not signal:
        return {'source': 'rule_based', 'survey_responses': 0, 'survey_applied': False}
    return {
        'source': 'survey_adjusted' if signal['sufficient'] else 'rule_based',
        'survey_responses': signal['sample_size'],
        'survey_applied': bool(signal['sufficient']),
        'prompt_grounded': bool(prompt_grounded),
        'sack_rate_ghs': signal['sack_rate_ghs'] if signal['sufficient'] else SACK_ANCHOR_GHS,
        'max_shift': MAX_SHIFT,
    }
