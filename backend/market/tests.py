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
