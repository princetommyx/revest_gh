from datetime import date
from decimal import Decimal

from django.core.cache import cache
from django.test import TestCase

from intelligence.buyback import (
    COLLECTION_MARGIN,
    buyback_rates,
    derived_payout_per_kg,
    sack_economics,
    unbounded_payout_per_kg,
    unmapped_materials,
    value_tiers,
)
from intelligence.formasty import normalize_submission, upsert_submission
from intelligence.market_signal import (
    MIN_SAMPLE_SIZE,
    MAX_SHIFT,
    SACK_ANCHOR_GHS,
    clamp_to_shift,
    compute_market_signal,
    market_signal,
    pricing_basis,
    prompt_context,
)
from intelligence.models import MarketSurveyResponse, MaterialBuybackPrice
from logistics.models import PickupRequest
from market.models import MaterialMarketPrice
from users.models import User
from logistics.pricing import (
    BAG_SIZE_RATES,
    SACK_FLAT_RATE,
    calculate_track_b_earnings,
    survey_adjusted_sack_rate,
    survey_adjusted_track_a_rate,
)

SUBMISSION = {
    "id": "sub-test-1",
    "createdAt": "2026-09-08T10:37:06.706Z",
    "effectiveValues": {
        "f_role": "household",
        "f_materials": ["rubbers", "bottles"],
        "f_volume": {"rubbers": "lt1", "bottles": "1", "other": "2to3"},
        "f_current": "give_free",
        "f_price_now": 50,
        "f_anchor30": "small_maybe",
        "f_min_payout": "50plus",
        "f_structure": "flat",
        "f_weighing": "no_trust",
        "f_payment": "cash_27",
        "f_ewaste": {"phone": "30_99", "tv": "100plus"},
        "f_track_a": "gt20",
        "f_open": "Money",
        "f_area": "Madina",
    },
}


def make_submission(index, **overrides):
    submission = {
        "id": f"sub-test-{index}",
        "createdAt": SUBMISSION["createdAt"],
        "effectiveValues": {**SUBMISSION["effectiveValues"], **overrides},
    }
    return submission


class SurveyDataTestCase(TestCase):
    """
    Starts from an empty survey table. The seed migrations put six real
    Formasty responses into every fresh database, which is exactly right for
    production and useless for a test that needs to assert what happens at
    four responses versus five.
    """

    def setUp(self):
        MarketSurveyResponse.objects.all().delete()
        cache.clear()
        self.seeded = 0

    def seed(self, count, **overrides):
        """Add `count` further distinct responses - never re-writing ones already seeded."""
        for _ in range(count):
            upsert_submission(MarketSurveyResponse, make_submission(self.seeded, **overrides))
            self.seeded += 1


class FormastyNormalizationTests(SurveyDataTestCase):
    def test_maps_every_survey_answer_onto_the_model(self):
        values = normalize_submission(SUBMISSION)

        self.assertEqual(values['external_id'], 'sub-test-1')
        self.assertEqual(values['role'], 'household')
        self.assertEqual(values['materials'], ['rubbers', 'bottles'])
        self.assertEqual(values['area'], 'Madina')
        self.assertEqual(values['current_disposal'], 'give_free')
        self.assertEqual(values['price_now_ghs'], 50)
        self.assertEqual(values['anchor30_reaction'], 'small_maybe')
        self.assertEqual(values['min_payout_range'], '50plus')
        self.assertEqual(values['pricing_structure_pref'], 'flat')
        self.assertEqual(values['weighing_trust'], 'no_trust')
        self.assertEqual(values['payment_pref'], 'cash_27')
        self.assertEqual(values['track_a_fee_range'], 'gt20')
        self.assertEqual(values['volume'], {'rubbers': 'lt1', 'bottles': '1', 'other': '2to3'})
        self.assertEqual(values['ewaste_expectations'], {'phone': '30_99', 'tv': '100plus'})
        self.assertEqual(values['open_feedback'], 'Money')
        self.assertEqual(values['raw_answers'], SUBMISSION['effectiveValues'])

    def test_missing_optional_answers_are_left_out_rather_than_blanked(self):
        submission = {
            "id": "sub-sparse",
            "createdAt": SUBMISSION["createdAt"],
            "effectiveValues": {"f_role": "household"},
        }
        values = normalize_submission(submission)

        self.assertEqual(values['role'], 'household')
        for absent in ('materials', 'volume', 'ewaste_expectations', 'open_feedback', 'area'):
            self.assertNotIn(absent, values)

    def test_a_payload_that_is_not_formasty_answers_is_refused(self):
        # An already-mapped row fed back in: importing it would blank every
        # answer on the existing response rather than refresh it.
        with self.assertRaises(ValueError):
            normalize_submission({
                "id": "sub-test-1",
                "createdAt": SUBMISSION["createdAt"],
                "effectiveValues": {"role": "household", "materials": ["rubbers"]},
            })

    def test_a_partial_reimport_does_not_erase_answers_it_omits(self):
        upsert_submission(MarketSurveyResponse, SUBMISSION)
        upsert_submission(MarketSurveyResponse, {
            "id": "sub-test-1",
            "createdAt": SUBMISSION["createdAt"],
            "effectiveValues": {"f_area": "Adenta"},
        })

        row = MarketSurveyResponse.objects.get(external_id='sub-test-1')
        self.assertEqual(row.area, 'Adenta')
        self.assertEqual(row.materials, ['rubbers', 'bottles'])
        self.assertEqual(row.volume, {'rubbers': 'lt1', 'bottles': '1', 'other': '2to3'})

    def test_rejects_a_submission_with_no_id(self):
        with self.assertRaises(ValueError):
            normalize_submission({"createdAt": SUBMISSION["createdAt"], "effectiveValues": {}})

    def test_rejects_a_submission_with_no_timestamp(self):
        with self.assertRaises(ValueError):
            normalize_submission({"id": "x", "effectiveValues": {}})

    def test_reimporting_the_same_submission_updates_rather_than_duplicates(self):
        upsert_submission(MarketSurveyResponse, SUBMISSION)
        changed = make_submission(1, f_area="Adenta")
        _, created = upsert_submission(MarketSurveyResponse, changed)

        self.assertFalse(created)
        self.assertEqual(MarketSurveyResponse.objects.count(), 1)
        self.assertEqual(MarketSurveyResponse.objects.get().area, 'Adenta')


class MarketSignalTests(SurveyDataTestCase):

    def test_clamp_never_moves_a_price_further_than_max_shift(self):
        self.assertEqual(clamp_to_shift(30.0, 300.0), 30.0 * (1 + MAX_SHIFT))
        self.assertEqual(clamp_to_shift(30.0, 0.0), 30.0 * (1 - MAX_SHIFT))
        self.assertEqual(clamp_to_shift(30.0, 32.0), 32.0)
        self.assertEqual(clamp_to_shift(30.0, None), 30.0)

    def test_a_crowd_that_finds_ghs30_small_pushes_the_sack_rate_up(self):
        self.seed(MIN_SAMPLE_SIZE, f_anchor30="too_small")
        signal = compute_market_signal()

        self.assertTrue(signal['sufficient'])
        self.assertGreater(signal['sack_rate_ghs'], SACK_ANCHOR_GHS)

    def test_a_crowd_that_loves_ghs30_lets_the_sack_rate_ease_down(self):
        self.seed(MIN_SAMPLE_SIZE, f_anchor30="very_good")
        signal = compute_market_signal()

        self.assertLess(signal['sack_rate_ghs'], SACK_ANCHOR_GHS)

    def test_a_fair_verdict_leaves_the_sack_rate_where_it_was(self):
        self.seed(MIN_SAMPLE_SIZE, f_anchor30="fair")

        self.assertEqual(compute_market_signal()['sack_rate_ghs'], SACK_ANCHOR_GHS)

    def test_already_pay_is_counted_but_kept_out_of_the_fee_average(self):
        self.seed(MIN_SAMPLE_SIZE, f_track_a="already_pay")
        signal = compute_market_signal()

        self.assertIsNone(signal['track_a_medium_fee_ghs'])
        self.assertEqual(signal['track_a_paying_today_rate'], 1.0)

    def test_derives_expectations_volumes_and_mix(self):
        self.seed(MIN_SAMPLE_SIZE)
        signal = compute_market_signal()

        self.assertEqual(signal['ewaste_expectations_ghs'], {'phone': 64.5, 'tv': 130.0})
        self.assertEqual(signal['weekly_sacks'], {'rubbers': 0.5, 'bottles': 1.0, 'other': 2.5})
        self.assertEqual(signal['material_mix'], {'rubbers': MIN_SAMPLE_SIZE, 'bottles': MIN_SAMPLE_SIZE})
        self.assertEqual(signal['top_areas'], {'Madina': MIN_SAMPLE_SIZE})
        self.assertEqual(signal['flat_pricing_rate'], 1.0)
        self.assertEqual(signal['instant_cash_rate'], 1.0)

    def test_an_empty_survey_still_produces_a_usable_signal(self):
        signal = compute_market_signal()

        self.assertEqual(signal['sample_size'], 0)
        self.assertFalse(signal['sufficient'])
        self.assertEqual(signal['sack_rate_ghs'], SACK_ANCHOR_GHS)

    def test_signal_is_cached_between_calls(self):
        self.seed(MIN_SAMPLE_SIZE)
        first = market_signal()
        self.seed(1, f_area="Somewhere Else")

        self.assertEqual(market_signal()['sample_size'], first['sample_size'])
        self.assertEqual(market_signal(refresh=True)['sample_size'], first['sample_size'] + 1)


class SurveyAdjustedPricingTests(SurveyDataTestCase):

    def test_too_few_responses_leave_every_price_exactly_as_it_was(self):
        self.seed(MIN_SAMPLE_SIZE - 1, f_anchor30="too_small", f_track_a="zero")

        self.assertEqual(survey_adjusted_sack_rate(), SACK_FLAT_RATE)
        self.assertEqual(survey_adjusted_track_a_rate('MEDIUM'), BAG_SIZE_RATES['MEDIUM'])
        self.assertEqual(calculate_track_b_earnings('PURE_WATER_RUBBERS', 10), SACK_FLAT_RATE)

    def test_enough_responses_move_the_sack_payout(self):
        self.seed(MIN_SAMPLE_SIZE, f_anchor30="too_small")

        rate = survey_adjusted_sack_rate()
        self.assertGreater(rate, SACK_FLAT_RATE)
        self.assertLessEqual(rate, SACK_FLAT_RATE * Decimal(str(1 + MAX_SHIFT)))
        self.assertEqual(calculate_track_b_earnings('PURE_WATER_RUBBERS', 10), rate)

    def test_a_bale_stays_worth_exactly_two_sacks(self):
        self.seed(MIN_SAMPLE_SIZE, f_anchor30="too_small")

        self.assertEqual(
            calculate_track_b_earnings('PURE_WATER_RUBBERS_BALE', 1),
            (survey_adjusted_sack_rate() * 2).quantize(Decimal('0.01')),
        )

    def test_refusal_to_pay_for_haulage_lowers_the_whole_bag_ladder(self):
        self.seed(MIN_SAMPLE_SIZE, f_track_a="zero")

        for size in ('SMALL', 'MEDIUM', 'LARGE', 'XLARGE'):
            adjusted = survey_adjusted_track_a_rate(size)
            self.assertLess(adjusted, BAG_SIZE_RATES[size])
            self.assertGreaterEqual(adjusted, BAG_SIZE_RATES[size] * Decimal(str(1 - MAX_SHIFT)))

    def test_weight_still_does_not_matter_for_flat_rate_materials(self):
        self.seed(MIN_SAMPLE_SIZE)

        self.assertEqual(
            calculate_track_b_earnings('PURE_WATER_RUBBERS', 1),
            calculate_track_b_earnings('PURE_WATER_RUBBERS', 100),
        )


class PromptGroundingTests(SurveyDataTestCase):

    def test_no_context_until_there_are_enough_responses(self):
        self.seed(MIN_SAMPLE_SIZE - 1)

        self.assertIsNone(prompt_context())

    def test_context_describes_real_materials_volumes_and_areas(self):
        self.seed(MIN_SAMPLE_SIZE)
        context = prompt_context()

        self.assertIn('pure water rubbers', context)
        self.assertIn('sacks/week', context)
        self.assertIn('Madina', context)
        self.assertIn('do not trust weighing', context)

    def test_context_never_quotes_a_recyclable_price(self):
        self.seed(MIN_SAMPLE_SIZE)
        context = prompt_context()

        # E-waste expectations are the one permitted GHS figure, and they
        # are explicitly framed as never to be repeated back as a price.
        self.assertIn('never to be repeated as a price', context)
        self.assertNotIn('per sack', context)

    def test_pricing_basis_reports_whether_the_survey_actually_moved_anything(self):
        self.seed(MIN_SAMPLE_SIZE - 1)
        basis = pricing_basis()
        self.assertEqual(basis['source'], 'rule_based')
        self.assertFalse(basis['survey_applied'])

        cache.clear()
        self.seed(1, f_area="Adenta")
        basis = pricing_basis(prompt_grounded=True)
        self.assertEqual(basis['source'], 'survey_adjusted')
        self.assertTrue(basis['survey_applied'])
        self.assertTrue(basis['prompt_grounded'])
        self.assertEqual(basis['survey_responses'], MIN_SAMPLE_SIZE)

    def test_pricing_basis_carries_no_respondent_free_text(self):
        self.seed(MIN_SAMPLE_SIZE)

        self.assertNotIn('Money', str(pricing_basis()))


class BuybackTestCase(TestCase):
    """Starts from an empty buyback table for the same reason as SurveyDataTestCase."""

    def setUp(self):
        MaterialBuybackPrice.objects.all().delete()
        cache.clear()

    def capture(self, material_type, label, price, captured_at=date(2026, 9, 9)):
        return MaterialBuybackPrice.objects.create(
            material_type=material_type,
            label=label,
            price_per_kg=Decimal(price),
            source='test',
            captured_at=captured_at,
        )


class BuybackRateTests(BuybackTestCase):
    def test_no_captures_means_no_rates_and_no_price_change(self):
        self.assertEqual(buyback_rates(), {})
        self.assertIsNone(unbounded_payout_per_kg('PET'))
        self.assertEqual(derived_payout_per_kg('PET', Decimal('0.50')), Decimal('0.50'))

    def test_payout_target_is_the_gate_price_less_the_collection_margin(self):
        self.capture('PET', 'PET Bottles', '2.00')

        self.assertEqual(
            unbounded_payout_per_kg('PET'),
            (Decimal('2.00') * (1 - COLLECTION_MARGIN)).quantize(Decimal('0.01')),
        )

    def test_the_cheapest_item_wins_when_several_map_to_one_material(self):
        self.capture('PAPER', 'White Office Paper', '2.00')
        self.capture('PAPER', 'Cardboard (OCC)', '1.40')

        self.assertEqual(buyback_rates()['PAPER'], Decimal('1.40'))

    def test_a_newer_capture_replaces_an_older_one_outright(self):
        self.capture('PET', 'PET Bottles', '2.00', captured_at=date(2026, 1, 1))
        self.capture('PET', 'PET Bottles', '5.00', captured_at=date(2026, 9, 9))

        self.assertEqual(buyback_rates()['PET'], Decimal('5.00'))

    def test_a_material_revesta_has_no_category_for_is_kept_but_never_priced(self):
        self.capture('', 'Copper Wire / Brass', '65.00')

        self.assertEqual(buyback_rates(), {})
        self.assertEqual(MaterialBuybackPrice.objects.count(), 1)

    def test_a_wrong_rate_is_corrected_by_a_bounded_step_not_all_at_once(self):
        self.capture('PET', 'PET Bottles', '2.00')
        current = Decimal('0.50')

        moved = derived_payout_per_kg('PET', current)
        self.assertGreater(moved, current)
        self.assertLessEqual(moved, current * Decimal(str(1 + MAX_SHIFT)))
        # ... and the gap it did not close stays visible.
        self.assertGreater(unbounded_payout_per_kg('PET'), moved)

    def test_track_b_earnings_use_the_corrected_rate(self):
        self.capture('PET', 'PET Bottles', '2.00')

        self.assertEqual(
            calculate_track_b_earnings('PET', 10),
            (derived_payout_per_kg('PET', Decimal('0.50')) * 10).quantize(Decimal('0.01')),
        )

    def test_an_explicit_market_price_row_is_never_overridden(self):
        self.capture('PET', 'PET Bottles', '2.00')
        MaterialMarketPrice.objects.create(material_type='PET', price_per_kg=Decimal('0.40'))

        self.assertEqual(calculate_track_b_earnings('PET', 10), Decimal('4.00'))

    def test_value_tiers_rank_materials_without_quoting_a_price(self):
        self.capture('ALUMINUM', 'Aluminum Cans', '18.50')
        self.capture('PET', 'PET Bottles', '2.00')
        self.capture('PURE_WATER_RUBBERS', 'Water Sachets (LDPE)', '0.85')

        tiers = value_tiers()
        self.assertEqual([key for key, _ in tiers], ['ALUMINUM', 'PET', 'PURE_WATER_RUBBERS'])
        self.assertEqual(dict(tiers)['ALUMINUM'], 'very high')
        for _, tier in tiers:
            self.assertNotIn('GHS', tier)


class SackEconomicsTests(BuybackTestCase):
    def test_a_sack_payout_above_its_gate_value_is_reported_as_a_loss(self):
        self.capture('PURE_WATER_RUBBERS', 'Water Sachets (LDPE)', '0.85')

        economics = sack_economics(Decimal('30.00'))['PURE_WATER_RUBBERS']
        self.assertFalse(economics['clears'])
        self.assertEqual(economics['break_even_kg'], Decimal('35.29'))
        self.assertEqual(economics['sack_kg_source'], 'assumed')
        self.assertLess(economics['margin_ghs'], 0)

    def test_a_sack_payout_the_gate_covers_is_reported_as_clearing(self):
        self.capture('PURE_WATER_RUBBERS', 'Water Sachets (LDPE)', '5.00')

        economics = sack_economics(Decimal('30.00'))['PURE_WATER_RUBBERS']
        self.assertTrue(economics['clears'])
        self.assertGreater(economics['margin_ghs'], 0)

    def test_a_real_weighed_pickup_replaces_the_assumed_sack_weight(self):
        self.capture('PURE_WATER_RUBBERS', 'Water Sachets (LDPE)', '0.85')
        user = User.objects.create_user(
            username='disposer-1', email='disposer-1@example.com', password='x'
        )
        for weight in ('10.00', '12.00', '14.00'):
            PickupRequest.objects.create(
                provider=user,
                material_type='PURE_WATER_RUBBERS',
                track_type='B',
                status='COMPLETED',
                quantity_estimate='1 sack',
                latitude=5.66,
                longitude=-0.19,
                ai_verified_weight=Decimal(weight),
            )

        economics = sack_economics(Decimal('30.00'))['PURE_WATER_RUBBERS']
        self.assertEqual(economics['sack_kg_source'], 'observed')
        self.assertEqual(economics['sack_kg'], Decimal('12.00'))

    def test_a_material_with_no_gate_price_is_left_out_entirely(self):
        self.assertEqual(sack_economics(Decimal('30.00')), {})


class UnmappedMaterialTests(BuybackTestCase):
    def test_a_material_with_no_revesta_category_is_surfaced_not_lost(self):
        self.capture('', 'Copper Wire / Brass', '65.00')
        self.capture('PET', 'PET Bottles', '2.00')

        self.assertEqual(unmapped_materials(), [('Copper Wire / Brass', Decimal('65.00'))])

    def test_tiers_actually_separate_a_bimodal_market(self):
        for material, price in (
            ('ALUMINUM', '18.50'), ('METALS', '4.25'), ('PET', '2.00'),
            ('PURE_WATER_RUBBERS', '0.85'),
        ):
            self.capture(material, material, price)

        tiers = dict(value_tiers())
        self.assertEqual(tiers['ALUMINUM'], 'very high')
        self.assertEqual(tiers['PURE_WATER_RUBBERS'], 'low')
        self.assertGreater(len(set(tiers.values())), 2)
