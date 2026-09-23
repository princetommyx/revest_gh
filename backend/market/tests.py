"""
Tests for listing visibility: what the marketplace returns, and to whom.

The lat/lon filter here is the one the Home feed sends. Home used to send
a `location` string instead - which this endpoint treats as an exact
match, and which was wired to state nothing ever set - so the feed was
national while the header named a city. These pin the filter that
actually works.
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from market.models import Listing

User = get_user_model()

BASE = '/api/v1/market/listings'

ACCRA = (5.6037, -0.1870)
KUMASI = (6.6885, -1.6244)      # ~200km from Accra
NEAR_ACCRA = (5.6300, -0.2000)  # a few km away


class ListingVisibilityTests(TestCase):

    def setUp(self):
        self.seller = User.objects.create_user(username='seller', password='pw', role='SELLER')
        self.browser = User.objects.create_user(username='browser', password='pw', role='RECYCLER')
        self.client = APIClient()
        self.client.force_authenticate(user=self.browser)

    def make_listing(self, title, coords=ACCRA, seller=None, **kwargs):
        lat, lon = coords
        return Listing.objects.create(
            seller=seller or self.seller,
            title=title,
            material_type=kwargs.pop('material_type', 'Plastics'),
            description='some waste',
            quantity='2 bags',
            price=Decimal('10.00'),
            location=kwargs.pop('location', 'Accra'),
            latitude=lat,
            longitude=lon,
            **kwargs
        )

    def ids_from(self, response):
        self.assertEqual(response.status_code, 200, response.content)
        body = response.json()
        rows = body if isinstance(body, list) else body['results']
        return {row['id'] for row in rows}

    def test_coordinates_restrict_listings_to_a_radius(self):
        near = self.make_listing('near', NEAR_ACCRA)
        far = self.make_listing('far', KUMASI)

        ids = self.ids_from(self.client.get(f'{BASE}/', {'lat': ACCRA[0], 'lon': ACCRA[1]}))
        self.assertIn(near.id, ids)
        self.assertNotIn(far.id, ids, 'a listing 200km away came back as nearby')

    def test_without_coordinates_everything_is_returned(self):
        near = self.make_listing('near', NEAR_ACCRA)
        far = self.make_listing('far', KUMASI)

        ids = self.ids_from(self.client.get(f'{BASE}/'))
        self.assertIn(near.id, ids)
        self.assertIn(far.id, ids)

    def test_material_type_filters(self):
        plastics = self.make_listing('plastics', material_type='Plastics')
        metals = self.make_listing('metals', material_type='Metals')

        ids = self.ids_from(self.client.get(f'{BASE}/', {'material_type': 'Metals'}))
        self.assertIn(metals.id, ids)
        self.assertNotIn(plastics.id, ids)

    def test_the_location_field_is_an_exact_match_not_a_search(self):
        """
        Documents the trap: `location` is a filterset field, so a geocoded
        label like "Adenta Municipality, Ghana" matches nothing even when
        listings sit in Adenta. Anything user-facing must filter on lat/lon
        or use `search`.
        """
        listing = self.make_listing('in adenta', location='Adenta')

        exact = self.ids_from(self.client.get(f'{BASE}/', {'location': 'Adenta'}))
        self.assertIn(listing.id, exact)

        partial = self.ids_from(self.client.get(f'{BASE}/', {'location': 'Adenta Municipality, Ghana'}))
        self.assertNotIn(listing.id, partial)

    def test_search_matches_partial_text(self):
        listing = self.make_listing('in adenta', location='Adenta Municipality')

        ids = self.ids_from(self.client.get(f'{BASE}/', {'search': 'Adenta'}))
        self.assertIn(listing.id, ids)

    def test_blocking_hides_listings_in_both_directions(self):
        from moderation.models import BlockedUser

        listing = self.make_listing('theirs')
        BlockedUser.objects.create(blocker=self.browser, blocked=self.seller)

        ids = self.ids_from(self.client.get(f'{BASE}/'))
        self.assertNotIn(listing.id, ids, "a blocked seller's listing is still visible")

        # And the other way: the blocked user must not reach the blocker
        # through their listings either.
        theirs = Listing.objects.create(
            seller=self.browser, title='mine', material_type='Paper',
            description='x', quantity='1 bag', price=Decimal('5.00'), location='Accra',
            latitude=ACCRA[0], longitude=ACCRA[1])
        blocked_client = APIClient()
        blocked_client.force_authenticate(user=self.seller)
        self.assertNotIn(theirs.id, self.ids_from(blocked_client.get(f'{BASE}/')))


class ListingCreationTests(TestCase):
    """
    What a disposer can actually post.

    description was a required model field while the whole form treated it
    as optional - the submit button enables without one, and the label
    carries no required marker. Every post that left it empty came back
    "This field may not be blank", which the app showed as a generic
    "Failed to create listing". It normally went unnoticed because a
    successful image analysis fills the description in; it only bit when
    the analysis failed, which is exactly when it was reported.
    """

    def setUp(self):
        self.seller = User.objects.create_user(
            username='poster', password='pw', role='SELLER')
        self.client = APIClient()
        self.client.force_authenticate(user=self.seller)

    def payload(self, **overrides):
        data = {
            'title': 'Pure water sachets',
            'material_type': 'Plastics',
            'quantity': '2 bags',
            'price': '0.00',
            'is_free': True,
            'location': 'Accra',
            'track': 'A',
        }
        data.update(overrides)
        return data

    def test_a_listing_posts_without_a_description(self):
        r = self.client.post(BASE + '/', self.payload(description=''))
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()['description'], '')

    def test_a_listing_posts_with_the_description_key_absent(self):
        r = self.client.post(BASE + '/', self.payload())
        self.assertEqual(r.status_code, 201, r.content)

    def test_a_description_is_kept_when_given(self):
        r = self.client.post(BASE + '/', self.payload(description='Clean, dry sachets'))
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()['description'], 'Clean, dry sachets')

    def test_the_fields_the_form_does_validate_are_still_required(self):
        """
        These four gate the submit button, so the app never sends them
        empty - they should stay required rather than quietly accepting
        blanks alongside description.
        """
        for field in ('title', 'material_type', 'quantity', 'location'):
            with self.subTest(field=field):
                r = self.client.post(BASE + '/', self.payload(**{field: ''}))
                self.assertEqual(r.status_code, 400, f'{field} accepted a blank')
                self.assertIn(field, r.json())

    def test_the_listing_is_owned_by_the_poster(self):
        r = self.client.post(BASE + '/', self.payload())
        self.assertEqual(Listing.objects.get(id=r.json()['id']).seller, self.seller)

    def test_posting_requires_authentication(self):
        anon = APIClient()
        r = anon.post(BASE + '/', self.payload())
        self.assertIn(r.status_code, (401, 403))
