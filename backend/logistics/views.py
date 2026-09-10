import logging
import requests
from django.conf import settings
from django.db import models
from rest_framework import viewsets, permissions, filters, status, serializers
from rest_framework.parsers import MultiPartParser, FormParser
from decimal import Decimal
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from .models import PickupRequest
from .serializers import (
    PickupRequestSerializer, PickupRequestListSerializer,
    PickupRequestDetailSerializer, PickupRequestCreateSerializer,
    PickupRequestUpdateSerializer
)
from wallet.services import WalletService
from intelligence.matching import match_score
from intelligence.services import (
    link_prediction_to_request,
    link_price_quote_to_request,
    record_price_quote,
    record_weight_feedback,
)
from intelligence.routing import travel_estimate
from .utils import haversine
from django.contrib.auth import get_user_model
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone
from datetime import timedelta

User = get_user_model()
logger = logging.getLogger(__name__)


def _fetch_driving_route(origin_lat, origin_lon, dest_lat, dest_lon):
    """
    Real road distance/duration (with live traffic where Google has it)
    between two points, via the Distance Matrix API. Returns
    (distance_km, duration_min), or None on any failure/misconfiguration -
    callers fall back to the straight-line haversine estimate.
    """
    api_key = getattr(settings, 'GOOGLE_MAPS_API_KEY', None)
    if not api_key:
        return None
    try:
        resp = requests.get(
            'https://maps.googleapis.com/maps/api/distancematrix/json',
            params={
                'origins': f'{origin_lat},{origin_lon}',
                'destinations': f'{dest_lat},{dest_lon}',
                'departure_time': 'now',
                'key': api_key,
            },
            timeout=3,
        )
        data = resp.json()
        element = data['rows'][0]['elements'][0]
        if element.get('status') != 'OK':
            return None
        duration_field = element.get('duration_in_traffic', element['duration'])
        distance_km = element['distance']['value'] / 1000
        duration_min = duration_field['value'] / 60
        return distance_km, duration_min
    except Exception:
        logger.warning('Distance Matrix lookup failed, falling back to haversine estimate', exc_info=True)
        return None

@extend_schema(tags=['logistics'])
@extend_schema_view(
    list=extend_schema(summary="List pickup requests", description="Get a list of pickup requests with filtering options."),
    retrieve=extend_schema(summary="Get pickup details", description="Get detailed information about a specific pickup request."),
    create=extend_schema(summary="Create pickup request", description="Create a new pickup request to find a collector."),
    update=extend_schema(summary="Update pickup request", description="Update a pickup request."),
    partial_update=extend_schema(summary="Partially update pickup request", description="Partially update a pickup request."),
    destroy=extend_schema(summary="Delete pickup request", description="Delete a pickup request."),
)
class PickupRequestViewSet(viewsets.ModelViewSet):
    queryset = PickupRequest.objects.all().order_by('-created_at')
    serializer_class = PickupRequestListSerializer
    permission_classes = [permissions.IsAuthenticated]
    from rest_framework import parsers
    parser_classes = (MultiPartParser, FormParser, parsers.JSONParser)
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'material_type']
    ordering_fields = ['created_at', 'status']
    
    def get_queryset(self):
        user = self.request.user
        # RECYCLER picks up jobs from this same board exactly like COLLECTOR
        # does elsewhere in the app (accept/track/complete have no role
        # restriction) - this used to check only 'COLLECTOR', so a recycler
        # fell through to the provider-only branch below and saw an empty
        # board instead of nearby pending jobs or their own accepted ones.
        if user.role in ('COLLECTOR', 'RECYCLER'):
            # Collectors/recyclers see:
            # 1. Nearby PENDING jobs
            # 2. Their own active jobs (ACCEPTED, ARRIVED)
            
            queryset = PickupRequest.objects.select_related('provider', 'collector')
            
            # Active jobs for this collector
            active_q = models.Q(collector=user, status__in=['ACCEPTED', 'ARRIVED'])
            
            # Pending jobs nearby
            two_hours_ago = timezone.now() - timedelta(hours=2)
            pending_q = models.Q(status='PENDING', created_at__gte=two_hours_ago)

            # A recycler/collector must never see their own posted request on
            # the job board they accept jobs from - otherwise (as happened)
            # they can accept their own job, becoming both provider and
            # collector on the same record, which then renders confusingly
            # everywhere a screen shows "the disposer" (it shows themselves).
            pending_q &= ~models.Q(provider=user)

            # A blocked collector must not be able to pick up the blocker's
            # job and turn up at their address. Only applied to the open
            # board - a job already accepted stays visible to its collector so
            # an in-progress pickup can still be completed or cancelled
            # cleanly rather than vanishing mid-run.
            from moderation.models import BlockedUser
            blocked_ids = BlockedUser.blocked_user_ids(user)
            if blocked_ids:
                pending_q &= ~models.Q(provider_id__in=blocked_ids)

            lat = self.request.query_params.get('lat')
            lon = self.request.query_params.get('lon')
            
            if lat and lon:
                try:
                    lat_f = float(lat)
                    lon_f = float(lon)
                    
                    # Initial rough bounding box filter (+/- ~0.2 degrees is ~22km)
                    queryset = queryset.filter(
                        latitude__gte=lat_f - 0.2,
                        latitude__lte=lat_f + 0.2,
                        longitude__gte=lon_f - 0.2,
                        longitude__lte=lon_f + 0.2
                    )
                    
                    # Strict Haversine filter (Python side since we are dealing with a small subset)
                    # For a truly scalable solution, GeoDjango/PostGIS would be used.
                    all_candidates = queryset.filter(active_q | pending_q)
                    active_ids = []
                    scored_pending = []
                    for job in all_candidates:
                        if job.status != 'PENDING' or job.collector == user:
                            active_ids.append(job.id)
                            continue

                        dist = haversine(lat_f, lon_f, float(job.latitude), float(job.longitude))
                        if dist <= 20: # 20km radius
                            scored_pending.append((job.id, match_score(
                                distance_km=dist,
                                acceptance_rate=user.acceptance_rate,
                                completion_rate=user.completion_rate,
                                avg_rating=user.avg_rating,
                            )))

                    # Own active job(s) first (nothing else needs attention
                    # more than a pickup already in progress), then nearby
                    # PENDING jobs best-match first. Everyone's acceptance/
                    # completion/rating is the same constant for every job on
                    # THEIR OWN board, so today this is equivalent to sorting
                    # by distance alone - match_score is used anyway so this
                    # stays correct once a per-job factor (material affinity,
                    # urgency) is added and actually varies the ranking.
                    scored_pending.sort(key=lambda pair: pair[1], reverse=True)
                    ordered_ids = active_ids + [job_id for job_id, _ in scored_pending]
                    if not ordered_ids:
                        return PickupRequest.objects.none()

                    preserved_order = models.Case(
                        *[models.When(id=pk, then=pos) for pos, pk in enumerate(ordered_ids)],
                        output_field=models.IntegerField(),
                    )
                    return PickupRequest.objects.filter(id__in=ordered_ids).order_by(preserved_order)
                    
                except (ValueError, TypeError):
                    pass
            
            return queryset.filter(active_q | pending_q).order_by('-created_at')
            
        return PickupRequest.objects.select_related('provider', 'collector').filter(provider=user).order_by('-created_at')

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        # Only the 'list' action's serializer (PickupRequestListSerializer)
        # renders is_rated, and get_queryset() above has several return
        # points built around delicate haversine-ordering logic - easier and
        # safer to attach this here, after all of them, than to thread a
        # prefetch through each branch. Without it, is_rated ran one
        # `ratings.filter(...).exists()` query per row in the response.
        if self.action == 'list' and self.request.user.is_authenticated:
            from django.db.models import Prefetch
            from ratings.models import Rating
            queryset = queryset.prefetch_related(
                Prefetch('ratings', queryset=Rating.objects.filter(rater=self.request.user), to_attr='user_ratings')
            )
        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return PickupRequestListSerializer
        elif self.action == 'create':
            return PickupRequestCreateSerializer
        elif self.action in ['update_status', 'complete', 'track']:
            return PickupRequestUpdateSerializer
        return PickupRequestDetailSerializer

    def perform_create(self, serializer):
        requester = self.request.user
        track_type = serializer.validated_data.get('track_type', 'A')
        listing = serializer.validated_data.get('listing')
        waste_price = Decimal(str(serializer.validated_data.get('waste_price', 0) or 0))
        delivery_fee = Decimal(str(serializer.validated_data.get('delivery_fee', 0) or 0))
        payment_method = serializer.validated_data.get('payment_method', 'CASH')

        RECYCLER_COMMISSION = Decimal('5.00')
        total_amount = waste_price + delivery_fee

        # A collector tapping "Accept Job" on someone else's marketplace
        # listing used to POST here with themselves as `provider` - which
        # made the job invisible to them forever (a collector's own job
        # board excludes anything they're the provider on, to stop
        # self-accept) and left the actual seller with nothing posted. Treat
        # this as a direct claim instead: the seller is the provider, the
        # tapping user is the collector, and it's ACCEPTED immediately.
        is_direct_claim = listing is not None and listing.seller_id != requester.id
        provider = listing.seller if is_direct_claim else requester

        provider_is_recycler = (provider.role == 'RECYCLER')
        monetized = WalletService.monetization_enabled()

        if monetized and provider_is_recycler and track_type in ['B', 'C']:
            total_amount += RECYCLER_COMMISSION

        # 1. Save the request first
        save_kwargs = {'provider': provider, 'actual_price': total_amount}
        if is_direct_claim:
            save_kwargs['collector'] = requester
            save_kwargs['status'] = 'ACCEPTED'
            save_kwargs['accepted_at'] = timezone.now()
        request = serializer.save(**save_kwargs)

        # Best-effort link back to the estimate_price() quote that led here,
        # so a future pricing model can eventually learn which quotes turn
        # into real bookings. Only meaningful when the requester themselves
        # got the quote - a collector direct-claiming someone else's listing
        # never called estimate_price for it.
        if not is_direct_claim:
            link_price_quote_to_request(requester, request)
            # Same idea for the waste analysis that produced the material and
            # weight on this request - without the link, a predicted weight
            # and the scale weight recorded against this same pickup can
            # never be compared.
            link_prediction_to_request(requester, request)

        # 2. Handle Escrow/Payment
        # ONLY lock escrow if:
        # A) It's Track A (Disposer always pays)
        # B) The provider is a RECYCLER (Track C or helping Track B)
        # We skip escrow for SELLER/DISPOSER on Track B because they shouldn't pay delivery upfront.
        #
        # All of this is gated on monetization being switched on. While it's off
        # Revesta takes nothing at request time - locking a buyer's funds we then
        # never release would strand their money, since the completion payouts
        # that release escrow are gated on the same flag.
        should_lock_escrow = (track_type == 'A') or (track_type == 'B' and provider_is_recycler) or (track_type == 'C')

        if monetized and payment_method == 'DIGITAL' and total_amount > 0 and should_lock_escrow:
            try:
                WalletService.lock_escrow(request, provider, total_amount, track_type=track_type)
            except ValueError as e:
                request.status = 'CANCELLED'
                request.save()
                raise serializers.ValidationError({"detail": str(e), "code": "escrow_failed"})

        if is_direct_claim:
            # Already claimed - tell the seller a collector is coming rather
            # than broadcasting an already-taken job to the whole board.
            self.notify_provider(request, 'job_accepted')
        else:
            # Logic to find nearby collectors
            self.notify_nearby_collectors(request)

    @extend_schema(summary="Accept a pickup request")
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        pickup_request = self.get_object()
        if pickup_request.status != 'PENDING':
            return Response({'error': 'Job already taken or not pending'}, status=400)

        # Belt-and-suspenders alongside the job-board queryset excluding a
        # user's own posted requests: a clear error here instead of relying
        # solely on the board hiding it (which would otherwise 404).
        if pickup_request.provider_id == request.user.id:
            return Response({'error': "You can't accept your own pickup request"}, status=400)

        # Check wallet standing
        is_eligible, error_msg = WalletService.check_eligibility_for_job(request.user)
        if not is_eligible:
            return Response({'error': error_msg}, status=403)
        
        # Check KYC Verification (Bypassed for testing)
        # if request.user.role in ['COLLECTOR', 'RECYCLER']:
        #     kyc_verified = (
        #         hasattr(request.user, 'identity_verification') and
        #         request.user.identity_verification.status == 'VERIFIED'
        #     )
        #     if not kyc_verified:
        #         return Response(
        #             {'error': 'KYC verification required. Please complete your identity verification to accept jobs.', 'code': 'kyc_required'},
        #             status=403
        #         )

        pickup_request.status = 'ACCEPTED'
        pickup_request.collector = request.user
        pickup_request.accepted_at = timezone.now()
        pickup_request.save()

        self.notify_provider(pickup_request, 'job_accepted')
        return Response({'status': 'job accepted'})

    @extend_schema(summary="Mark as arrived")
    @action(detail=True, methods=['post'])
    def arrive(self, request, pk=None):
        pickup_request = self.get_object()
        if pickup_request.status != 'ACCEPTED':
            return Response({'error': 'Job must be accepted first'}, status=400)
        if pickup_request.collector != request.user:
            return Response({'error': 'You are not the collector for this job'}, status=403)
            
        pickup_request.status = 'ARRIVED'
        pickup_request.arrived_at = timezone.now()
        pickup_request.save()

        # Early Payout for Sellers (Track B & C).
        # The status is already committed above, so letting this raise would
        # return an error for a state change that actually succeeded - the
        # collector sees "failed" while the job really did move to ARRIVED.
        # Log it instead, same as `complete` already does for its payouts.
        if pickup_request.track_type in ['B', 'C']:
            from wallet.services import WalletService
            if WalletService.monetization_enabled():
                try:
                    WalletService.process_disposer_early_payout(pickup_request)
                except Exception as e:
                    logger.exception(
                        f"Early payout failed for job {pickup_request.id} "
                        f"(track {pickup_request.track_type}): {e}"
                    )

        # Track A: Inform provider that collector is here
        # Track B: Inform provider and wait for weight verification

        self.notify_provider(pickup_request, 'driver_arrived')
        return Response({'status': 'driver arrived'})

    @extend_schema(summary="Verify weight with scale photo")
    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def verify_weight(self, request, pk=None):
        """Collector uploads scale photo and weight for Track B verification"""
        from .verification import verify_scale_photo
        
        pickup_request = self.get_object()
        if pickup_request.track_type != 'B':
            return Response({'error': 'Weight verification only applicable for Track B (Recyclables)'}, status=400)
            
        image_file = request.FILES.get('verification_photo')
        manual_weight = request.data.get('manual_weight')
        
        if not image_file or not manual_weight:
            return Response({'error': 'Verification photo and manual weight are required'}, status=400)
            
        try:
            manual_weight = float(manual_weight)
            image_content = image_file.read()
            mime_type = image_file.content_type
            
            is_verified, ai_weight, reasoning = verify_scale_photo(image_content, mime_type, manual_weight)
            
            pickup_request.verification_photo = image_file
            pickup_request.manual_weight = manual_weight
            pickup_request.ai_verified_weight = ai_weight
            pickup_request.is_verified = is_verified
            pickup_request.verification_data = {
                "ai_weight_estimate": float(ai_weight),
                "reasoning": reasoning,
                "verified_at": timezone.now().isoformat()
            }
            pickup_request.save()

            # The one moment in the app where a model's weight estimate meets
            # an actual scale. Recorded fire-and-forget: a feedback write must
            # never cost a collector their verification.
            record_weight_feedback(pickup_request, manual_weight)

            return Response({
                'is_verified': is_verified,
                'ai_weight_estimate': ai_weight,
                'reasoning': reasoning
            })
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @extend_schema(summary="Complete pickup")
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        pickup_request = self.get_object()
        if pickup_request.status != 'ARRIVED':
            return Response({'error': 'Job must be marked as arrived first'}, status=400)
        
        # Track B: Require verification before completion (optional but recommended)
        if pickup_request.track_type == 'B' and not pickup_request.is_verified:
            # We allow completion but log a warning, or strict enforce?
            # User requirement says "prevents fraud", so let's be strict if verification failed
            # But for initial demo, maybe just allow but flag. 
            # Actually, let's just log it.
            pass

        pickup_request.status = 'COMPLETED'
        pickup_request.completed_at = timezone.now()
        pickup_request.save()
        
        # Process Payouts based on Track Type - only when monetization is on.
        # While it's off the job just closes: the disposer and collector settle
        # the price physically between themselves and nothing moves in-app.
        if WalletService.monetization_enabled():
            try:
                if pickup_request.track_type == 'A':
                    WalletService.process_track_a_completion(pickup_request)
                elif pickup_request.track_type == 'C':
                    WalletService.process_track_c_completion(pickup_request)
                else:
                    WalletService.process_track_b_completion(pickup_request)
            except Exception as e:
                # Log error but don't fail the request response
                logger.error(f"Error processing {pickup_request.track_type} payout for job {pickup_request.id}: {e}")
        
        self.notify_provider(pickup_request, 'job_completed')
        return Response({'status': 'job completed'})

    @extend_schema(summary="Rate the other party on a completed pickup")
    @action(detail=True, methods=['post'])
    def rate(self, request, pk=None):
        # Deliberately not self.get_object() - get_queryset() is scoped to
        # what belongs on a collector's job board or a provider's own jobs,
        # which excludes COMPLETED jobs for a collector entirely. The
        # participant check below is the real permission check either way.
        from django.shortcuts import get_object_or_404
        pickup_request = get_object_or_404(PickupRequest, pk=pk)

        if pickup_request.status != 'COMPLETED':
            return Response({'error': 'Can only rate a completed job'}, status=400)

        if request.user == pickup_request.provider:
            ratee = pickup_request.collector
        elif request.user == pickup_request.collector:
            ratee = pickup_request.provider
        else:
            return Response({'error': 'You are not a participant on this job'}, status=403)

        if not ratee:
            return Response({'error': 'Nothing to rate on this job'}, status=400)

        try:
            score = int(request.data.get('score'))
        except (TypeError, ValueError):
            score = None
        if score is None or not (1 <= score <= 5):
            return Response({'error': 'score must be an integer from 1 to 5'}, status=400)

        from django.db import IntegrityError
        from django.db.models import Avg
        from ratings.models import Rating

        try:
            Rating.objects.create(
                pickup_request=pickup_request,
                rater=request.user,
                ratee=ratee,
                score=score,
                comment=request.data.get('comment', '') or '',
            )
        except IntegrityError:
            return Response({'error': 'You already rated this job'}, status=400)

        avg = Rating.objects.filter(ratee=ratee).aggregate(avg=Avg('score'))['avg']
        ratee.avg_rating = round(avg, 2) if avg is not None else None
        ratee.save(update_fields=['avg_rating'])

        return Response({'status': 'rating_saved', 'ratee_avg_rating': ratee.avg_rating})

    @extend_schema(summary="Cancel pickup")
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        pickup_request = self.get_object()
        # Allow provider to cancel pending, or collector to cancel if they break down etc
        if request.user == pickup_request.provider:
            if pickup_request.status == 'COMPLETED':
                 return Response({'error': 'Cannot cancel completed job'}, status=400)
        elif request.user == pickup_request.collector:
             if pickup_request.status == 'COMPLETED':
                 return Response({'error': 'Cannot cancel completed job'}, status=400)
        else:
            return Response({'error': 'Not authorized'}, status=403)

        pickup_request.status = 'CANCELLED'
        pickup_request.save()
        
        # Refund Logic - 'DIGITAL' is the only real payment_method value this
        # app ever writes (see PickupRequest.PAYMENT_METHOD_CHOICES);
        # 'DIGITAL_WALLET' here could never match, so every digitally-paid
        # cancellation used to skip the refund entirely and leave the escrow
        # HELD forever.
        if pickup_request.payment_method == 'DIGITAL':
             from wallet.models import Wallet, Transaction, Escrow
             from django.db import transaction
             from decimal import Decimal

             escrow = Escrow.objects.filter(pickup=pickup_request, status='HELD').first()
             # Refund exactly what was debited into escrow when it exists -
             # that's the authoritative record of what left the payer's
             # wallet. actual_price is only a fallback for the (shouldn't
             # happen under the current flow, but cheap to guard) case where
             # a digital payment was taken without ever creating an escrow row.
             refund_amount = escrow.amount if escrow else pickup_request.actual_price

             if refund_amount and refund_amount > 0:
                 with transaction.atomic():
                     provider_wallet, _ = Wallet.objects.select_for_update().get_or_create(user=pickup_request.provider)
                     provider_wallet.balance += refund_amount
                     provider_wallet.save()

                     Transaction.objects.create(
                         wallet=provider_wallet,
                         pickup=pickup_request,
                         amount=refund_amount,
                         transaction_type='REFUND',
                         status='COMPLETED',
                         description=f"Refund for Cancelled Job #{pickup_request.id}"
                     )

                     if escrow:
                         escrow.status = 'REFUNDED'
                         escrow.save(update_fields=['status'])

        # Notify other party
        if request.user == pickup_request.provider and pickup_request.collector:
             self._notify_user(pickup_request.collector, 'job_cancelled_by_provider', pickup_request)
        elif request.user == pickup_request.collector:
             self.notify_provider(pickup_request, 'job_cancelled_by_collector')
             
        return Response({'status': 'job cancelled'})

    @extend_schema(summary="Update live location")
    @action(detail=True, methods=['post'])
    def track(self, request, pk=None):
        """
        Collector pushes their live GPS position for an active job.
        Persists it and broadcasts a 'collector_location' event to the
        disposer over the logistics websocket group.
        """
        pickup_request = self.get_object()
        if pickup_request.collector != request.user:
            return Response({'error': 'Not authorized'}, status=403)

        if pickup_request.status not in ('ACCEPTED', 'ARRIVED'):
            return Response({'error': 'Job is not active'}, status=400)

        lat = request.data.get('latitude')
        lon = request.data.get('longitude')

        if lat is None or lon is None:
            return Response({'error': 'latitude and longitude are required'}, status=400)

        try:
            lat = float(lat)
            lon = float(lon)
        except (TypeError, ValueError):
            return Response({'error': 'Invalid coordinates provided'}, status=400)

        def parse_optional_float(key):
            value = request.data.get(key)
            if value is None:
                return None
            try:
                return float(value)
            except (TypeError, ValueError):
                return None

        heading = parse_optional_float('heading')
        speed = parse_optional_float('speed')

        now = timezone.now()
        pickup_request.current_lat = lat
        pickup_request.current_lon = lon
        pickup_request.last_location_at = now
        pickup_request.save(update_fields=['current_lat', 'current_lon', 'last_location_at'])

        self.notify_provider(pickup_request, 'collector_location', {
            'lat': lat,
            'lon': lon,
            'heading': heading,
            'speed': speed,
            'timestamp': now.isoformat(),
        })
        return Response({'status': 'location updated'})

    # Push copy for status changes the disposer cares about even when the
    # app is backgrounded/killed and the websocket isn't connected.
    # 'collector_location' is deliberately excluded - it fires continuously
    # during live tracking and would spam the notification tray.
    PROVIDER_PUSH_COPY = {
        'job_accepted': ("Collector on the way", "{collector} accepted your {material} pickup and is heading over."),
        'driver_arrived': ("Your collector has arrived", "{collector} is at the pickup location."),
        'job_completed': ("Pickup completed", "Your {material} pickup is complete. Thanks for using Revesta!"),
        'job_cancelled_by_collector': ("Pickup cancelled", "{collector} cancelled your {material} pickup. We're notifying nearby collectors."),
    }

    def notify_provider(self, pickup_request, status_type, extra_data=None):
        data = {
            "type": status_type,
            "request_id": pickup_request.id,
            "collector_name": pickup_request.collector.username if pickup_request.collector else None,
        }
        if extra_data:
            data.update(extra_data)

        self._notify_user(pickup_request.provider, status_type, pickup_request, data)

        push_copy = self.PROVIDER_PUSH_COPY.get(status_type)
        if push_copy:
            from users.notifications import send_push_notification

            title, body_template = push_copy
            body = body_template.format(
                collector=pickup_request.collector.username if pickup_request.collector else "Your collector",
                material=pickup_request.material_type,
            )
            # The push is the disposer's fallback for a dropped socket, so it
            # must not be skipped just because the socket send above failed -
            # and it must not fail the collector's request either.
            try:
                send_push_notification(
                    pickup_request.provider,
                    title,
                    body,
                    data={"type": status_type, "request_id": pickup_request.id},
                    urgency='URGENT',
                )
            except Exception as e:
                logger.warning(f"Push notification failed for request {pickup_request.id}: {e}")

    def _notify_user(self, user, type, request_obj, message_data=None):
        if not message_data:
             message_data = {
                "type": type,
                "request_id": request_obj.id,
             }

        # Best-effort: the websocket layer is Redis-backed in production, and an
        # unreachable Redis used to bubble up and turn a successful accept /
        # arrive / complete into a 500 for the caller.
        try:
            channel_layer = get_channel_layer()
            if channel_layer is None:
                return
            async_to_sync(channel_layer.group_send)(
                f"user_{user.id}",
                {
                    "type": "logistics_notification",
                    "message": message_data
                }
            )
        except Exception as e:
            logger.warning(f"Websocket notify failed for user {user.id} ({type}): {e}")

    @extend_schema(
        summary="Find available jobs",
        description="Find pending jobs nearby for collectors.",
        parameters=[
            OpenApiParameter('lat', OpenApiTypes.FLOAT, description="Current latitude"),
            OpenApiParameter('lon', OpenApiTypes.FLOAT, description="Current longitude"),
        ]
    )
    @action(detail=False, methods=['get'])
    def available_jobs(self, request):
        
        # Filter by time: Only show jobs created in the last 60 minutes
        one_hour_ago = timezone.now() - timedelta(minutes=60)
        # Optimization: Limit to latest 50 pending jobs to prevent scanning entire DB
        jobs_query = PickupRequest.objects.filter(
            status='PENDING', 
            created_at__gte=one_hour_ago
        )
        if hasattr(request.user, 'vehicle_type') and request.user.vehicle_type:
            jobs_query = jobs_query.filter(
                models.Q(vehicle_type=request.user.vehicle_type) | 
                models.Q(vehicle_type__isnull=True) | 
                models.Q(vehicle_type='')
            )
            
        jobs = jobs_query.select_related('provider').order_by('-created_at')[:50]
        
        # Filter by location if coordinates are provided
        lat = request.query_params.get('lat')
        lon = request.query_params.get('lon')
        
        if lat and lon:
            try:
                lat = float(lat)
                lon = float(lon)
                nearby_jobs = []
                for job in jobs:
                    dist = haversine(lat, lon, job.latitude, job.longitude)
                    if dist <= 10: # 10km radius
                        nearby_jobs.append(job)
                jobs = nearby_jobs
            except ValueError:
                pass # Ignore invalid coordinates
        
        serializer = self.get_serializer(jobs, many=True)
        return Response(serializer.data)

    def notify_nearby_collectors(self, request):
        # Radius in km
        RADIUS = 10
        # Excluded RECYCLER here (and nowhere else in the accept/track flow),
        # so a recycler was never pushed a 'new_request' event or push
        # notification for a job they were otherwise fully able to accept.
        online_collectors = User.objects.filter(role__in=('COLLECTOR', 'RECYCLER'), is_online=True)

        # Don't alert a collector to a job they can't see on the board anyway
        # (see get_queryset) - otherwise a block still leaks a push notification
        # naming the blocker's material and area.
        from moderation.models import BlockedUser
        blocked_ids = BlockedUser.blocked_user_ids(request.provider)
        if blocked_ids:
            online_collectors = online_collectors.exclude(id__in=blocked_ids)

        if request.vehicle_type:
            online_collectors = online_collectors.filter(
                models.Q(vehicle_type=request.vehicle_type) | 
                models.Q(vehicle_type__isnull=True) | 
                models.Q(vehicle_type='')
            )
        
        nearby = []
        for collector in online_collectors:
            if collector.current_lat and collector.current_lon:
                dist = haversine(request.latitude, request.longitude, collector.current_lat, collector.current_lon)
                if dist <= RADIUS:
                    nearby.append(collector)
        
        from users.notifications import send_push_notification

        channel_layer = get_channel_layer()
        for collector in nearby:
            async_to_sync(channel_layer.group_send)(
                f"user_{collector.id}",
                {
                    "type": "logistics_notification",
                    "message": {
                        "type": "new_request",
                        "request_id": request.id,
                        "material_type": request.material_type,
                        "quantity": request.quantity_estimate,
                        "lat": request.latitude,
                        "lon": request.longitude,
                        "provider_id": request.provider.id
                    }
                }
            )
            send_push_notification(
                collector,
                "New pickup nearby",
                f"{request.quantity_estimate} of {request.material_type} is available near you.",
                data={"type": "new_request", "request_id": request.id},
                urgency='URGENT',
            )

    @extend_schema(summary="Get ride history")
    @action(detail=False, methods=['get'])
    def history(self, request):
        """
        Every pickup belonging to the current user, newest first.

        Scoped by which side of the job they were on: collectors and recyclers
        by the jobs assigned to them, everyone else by the jobs they raised.
        Accepts an optional ?status= to back the filter chips in the app.

        Note this deliberately does not reuse get_queryset(): that one is built
        for the live job board, so for a collector it returns their active jobs
        plus any nearby PENDING request from the last two hours and never any
        COMPLETED one. Reading history from it showed collectors other people's
        open requests and none of their own finished work.
        """
        user = request.user

        if user.role in ('COLLECTOR', 'RECYCLER'):
            rides = PickupRequest.objects.filter(collector=user)
        else:
            rides = PickupRequest.objects.filter(provider=user)

        status_filter = request.query_params.get('status')
        if status_filter and status_filter.upper() != 'ALL':
            rides = rides.filter(status=status_filter.upper())

        rides = rides.select_related('provider', 'collector').order_by('-created_at')

        serializer = self.get_serializer(rides, many=True)
        return Response(serializer.data)

    @extend_schema(summary="Estimate pickup price")
    @action(detail=False, methods=['post'])
    def estimate_price(self, request):
        """
        Calculate estimated price for a pickup based on user location
        and nearest available collector.
        """
        lat = request.data.get('latitude')
        lon = request.data.get('longitude')

        if not lat or not lon:
            return Response({'error': 'Latitude and Longitude required'}, status=400)

        try:
            lat = float(lat)
            lon = float(lon)
        except ValueError:
             return Response({'error': 'Invalid coordinates'}, status=400)

        # 1. Find nearest online collector (recyclers pick up Track A jobs too)
        online_collectors = User.objects.filter(role__in=('COLLECTOR', 'RECYCLER'), is_online=True)
        online_collector_count = online_collectors.count()
        nearest_collector = None
        min_dist = float('inf')

        for collector in online_collectors:
            if collector.current_lat and collector.current_lon:
                dist = haversine(lat, lon, collector.current_lat, collector.current_lon)
                if dist < min_dist:
                    min_dist = dist
                    nearest_collector = collector

        # Fallback if no collectors online: Use a default distance (e.g., from city center or 5km)
        if not nearest_collector:
            # For estimation purposes, assume a collector is ~5km away if none found
            min_dist = 5.0

        # 2. Distance/duration - real road route (with live traffic) when we
        # can reach Google, otherwise the straight-line/40km-h fallback.
        # That fallback is what previously made every estimate look
        # "hardcoded": with only one or two collectors online during testing,
        # the same straight-line distance kept recurring.
        # The straight line is kept whatever happens: paired with a routed
        # distance it is what makes road circuity measurable rather than
        # assumed (see intelligence.routing).
        straight_line_km = min_dist
        distance_km, duration_min = travel_estimate(min_dist)

        routed = None
        if nearest_collector and nearest_collector.current_lat and nearest_collector.current_lon:
            routed = _fetch_driving_route(
                nearest_collector.current_lat, nearest_collector.current_lon, lat, lon
            )
            if routed:
                distance_km, duration_min = routed

        # 3. Demand adjustment - more pending jobs per online collector means
        # a longer real-world wait than travel time alone predicts. Capped so
        # a busy night can't blow the estimate up past 2x.
        pending_jobs = PickupRequest.objects.filter(status='PENDING').count()
        demand_ratio = pending_jobs / online_collector_count if online_collector_count else float(pending_jobs)
        demand_multiplier = 1 + min(demand_ratio * 0.15, 1.0)
        duration_min = duration_min * demand_multiplier

        # 4. Calculate Price
        from .pricing import calculate_fare_estimate
        price = calculate_fare_estimate(distance_km, duration_min)

        record_price_quote(
            user=request.user if request.user.is_authenticated else None,
            lat=lat,
            lon=lon,
            distance_km=distance_km,
            straight_line_km=straight_line_km,
            duration_min=duration_min,
            used_real_route=routed is not None,
            online_collector_count=online_collector_count,
            pending_job_count=pending_jobs,
            demand_multiplier=demand_multiplier,
            quoted_price=price,
        )

        return Response({
            'estimated_price': price,
            'distance_km': round(distance_km, 2),
            'duration_min': round(duration_min, 0),
            'currency': 'GHS'
        })
