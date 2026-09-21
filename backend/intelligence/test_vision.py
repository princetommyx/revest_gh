from decimal import Decimal

from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone

from intelligence.models import Prediction, PredictionFeedback
from intelligence.services import link_prediction_to_request, record_weight_feedback
from intelligence.vision import (
    MAX_WEIGHT_CORRECTION,
    MIN_CONFUSION_COUNT,
    MIN_WEIGHT_SAMPLE,
    compute_accuracy,
    confusion_warnings,
    corrected_weight_kg,
    prompt_context,
)
from logistics.models import PickupRequest
from users.models import User


class VisionTestCase(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username='disposer', email='disposer@example.com', password='x'
        )

    def request(self, material='PET'):
        return PickupRequest.objects.create(
            provider=self.user,
            material_type=material,
            track_type='B',
            status='PENDING',
            quantity_estimate='1 sack',
            latitude=5.66,
            longitude=-0.19,
        )

    def prediction(self, material='PET', weight=10.0, user=None):
        return Prediction.objects.create(
            user=user if user is not None else self.user,
            task='waste_analysis',
            model_version='gemini-flash-latest',
            output={'material_type': material, 'suggested_weight_kg': weight},
            confidence=0.9,
        )

    def weighed(self, predicted, actual, material='PET'):
        prediction = self.prediction(material=material, weight=predicted)
        return PredictionFeedback.objects.create(
            prediction=prediction,
            source='scale',
            predicted_material=material,
            actual_material=material,
            predicted_weight_kg=predicted,
            actual_weight_kg=actual,
        )


class LinkingTests(VisionTestCase):
    def test_a_request_links_to_the_analysis_that_preceded_it(self):
        prediction = self.prediction()
        request = self.request()

        link_prediction_to_request(self.user, request)

        prediction.refresh_from_db()
        self.assertEqual(prediction.pickup_request_id, request.id)

    def test_keeping_the_suggested_material_is_recorded_but_not_as_a_correction(self):
        self.prediction(material='PET')
        request = self.request(material='PET')

        link_prediction_to_request(self.user, request)

        feedback = PredictionFeedback.objects.get()
        self.assertFalse(feedback.is_correction)

    def test_changing_the_material_is_recorded_as_a_correction(self):
        self.prediction(material='PET')
        request = self.request(material='HDPE')

        link_prediction_to_request(self.user, request)

        feedback = PredictionFeedback.objects.get()
        self.assertTrue(feedback.is_correction)
        self.assertEqual(feedback.predicted_material, 'PET')
        self.assertEqual(feedback.actual_material, 'HDPE')

    def test_another_users_analysis_is_never_linked(self):
        other = User.objects.create_user(username='other', email='o@example.com', password='x')
        prediction = self.prediction(user=other)
        request = self.request()

        link_prediction_to_request(self.user, request)

        prediction.refresh_from_db()
        self.assertIsNone(prediction.pickup_request_id)

    def test_a_stale_analysis_is_not_claimed_by_a_much_later_request(self):
        prediction = self.prediction()
        Prediction.objects.filter(pk=prediction.pk).update(
            created_at=timezone.now() - timezone.timedelta(hours=3)
        )
        request = self.request()

        link_prediction_to_request(self.user, request)

        prediction.refresh_from_db()
        self.assertIsNone(prediction.pickup_request_id)

    def test_a_scale_weight_becomes_feedback_against_the_linked_prediction(self):
        prediction = self.prediction(weight=8.0)
        request = self.request()
        link_prediction_to_request(self.user, request)

        record_weight_feedback(request, 12.0)

        feedback = PredictionFeedback.objects.get(source='scale')
        self.assertEqual(feedback.prediction_id, prediction.id)
        self.assertEqual(feedback.predicted_weight_kg, 8.0)
        self.assertEqual(feedback.actual_weight_kg, 12.0)

    def test_a_weighing_with_no_linked_prediction_is_silently_skipped(self):
        request = self.request()

        record_weight_feedback(request, 12.0)

        self.assertFalse(PredictionFeedback.objects.filter(source='scale').exists())


class WeightBiasTests(VisionTestCase):
    def test_no_weighings_means_no_correction(self):
        self.assertEqual(corrected_weight_kg(10), 10)

    def test_too_few_weighings_are_measured_but_not_applied(self):
        for _ in range(MIN_WEIGHT_SAMPLE - 1):
            self.weighed(predicted=10.0, actual=12.0)

        self.assertEqual(compute_accuracy()['weight_ratio'], 1.2)
        self.assertFalse(compute_accuracy()['weight_sufficient'])
        self.assertEqual(corrected_weight_kg(10), 10)

    def test_enough_weighings_correct_a_model_that_reads_light(self):
        for _ in range(MIN_WEIGHT_SAMPLE):
            self.weighed(predicted=10.0, actual=12.0)

        self.assertTrue(compute_accuracy()['weight_sufficient'])
        self.assertEqual(corrected_weight_kg(10), 12.0)

    def test_the_correction_is_capped_however_wrong_the_model_is(self):
        for _ in range(MIN_WEIGHT_SAMPLE):
            self.weighed(predicted=10.0, actual=50.0)  # 5x out

        corrected = corrected_weight_kg(10)
        self.assertEqual(corrected, 10 * (1 + MAX_WEIGHT_CORRECTION))

    def test_a_mismatched_pair_is_discarded_rather_than_believed(self):
        for _ in range(MIN_WEIGHT_SAMPLE):
            self.weighed(predicted=10.0, actual=12.0)
        self.weighed(predicted=0.5, actual=400.0)  # 800x - a bad link, not a bad estimate

        self.assertEqual(compute_accuracy()['weight_ratio'], 1.2)

    def test_a_material_with_its_own_bias_uses_it(self):
        for _ in range(MIN_WEIGHT_SAMPLE):
            self.weighed(predicted=10.0, actual=11.0, material='PET')
        for _ in range(MIN_CONFUSION_COUNT):
            self.weighed(predicted=10.0, actual=12.5, material='ALUMINUM')

        accuracy = compute_accuracy()
        self.assertEqual(accuracy['weight_ratio_by_material']['ALUMINUM'], 1.25)
        self.assertGreater(corrected_weight_kg(10, 'ALUMINUM'), corrected_weight_kg(10, 'PET'))

    def test_a_zero_or_missing_estimate_is_left_alone(self):
        for _ in range(MIN_WEIGHT_SAMPLE):
            self.weighed(predicted=10.0, actual=12.0)

        self.assertEqual(corrected_weight_kg(0), 0)
        self.assertIsNone(corrected_weight_kg(None))


class ConfusionTests(VisionTestCase):
    def confuse(self, predicted, actual, times):
        for _ in range(times):
            PredictionFeedback.objects.create(
                prediction=self.prediction(material=predicted),
                source='user_override',
                predicted_material=predicted,
                actual_material=actual,
                is_correction=True,
            )

    def test_a_one_off_correction_does_not_earn_a_prompt_line(self):
        self.confuse('PET', 'HDPE', times=MIN_CONFUSION_COUNT - 1)

        self.assertEqual(confusion_warnings(), [])
        self.assertIsNone(prompt_context())

    def test_a_repeated_confusion_is_named_in_both_directions(self):
        self.confuse('PET', 'HDPE', times=MIN_CONFUSION_COUNT)

        warning = confusion_warnings()[0]
        self.assertIn('PET', warning)
        self.assertIn('HDPE', warning)
        self.assertIn('YOUR OWN TRACK RECORD', prompt_context())

    def test_agreement_is_not_counted_as_confirmation(self):
        for _ in range(5):
            PredictionFeedback.objects.create(
                prediction=self.prediction(),
                source='user_override',
                predicted_material='PET',
                actual_material='PET',
                is_correction=False,
            )

        accuracy = compute_accuracy()
        self.assertEqual(accuracy['material_observations'], 5)
        self.assertEqual(accuracy['material_corrections'], 0)
        # Reported as a correction rate, never as an accuracy figure.
        self.assertNotIn('accuracy', accuracy)

    def test_a_scale_weighing_is_not_treated_as_a_material_judgement(self):
        # The collector weighed it; nobody said anything about what it was.
        for _ in range(5):
            self.weighed(predicted=10.0, actual=12.0)

        self.assertEqual(compute_accuracy()['material_observations'], 0)
