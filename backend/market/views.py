from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from .models import Listing
from .serializers import (
    ListingSerializer, ListingListSerializer, 
    ListingDetailSerializer, ListingCreateSerializer
)
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_cookie

@extend_schema(tags=['market'])
@extend_schema_view(
    list=extend_schema(summary="List all marketplace listings", description="Get paginated list of all listings with optional filtering and search."),
    retrieve=extend_schema(summary="Get listing details", description="Retrieve detailed information about a specific listing."),
    create=extend_schema(summary="Create new listing", description="Create a new marketplace listing. Requires authentication."),
    update=extend_schema(summary="Update listing", description="Update an existing listing. Only the owner can update."),
    partial_update=extend_schema(summary="Partially update listing", description="Partially update a listing. Only the owner can update."),
    destroy=extend_schema(summary="Delete listing", description="Delete a listing. Only the owner or admin can delete."),
)
@method_decorator(cache_page(1), name='list')
class ListingViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        from moderation.models import BlockedUser

        queryset = Listing.objects.all().select_related('seller')

        # Blocking hides the other party's listings both ways - the blocker
        # shouldn't see them, and the blocked user shouldn't be able to keep
        # reaching the blocker through their own listings either.
        blocked_ids = BlockedUser.blocked_user_ids(self.request.user)
        if blocked_ids:
            queryset = queryset.exclude(seller_id__in=blocked_ids)

        lat = self.request.query_params.get('lat')
        lon = self.request.query_params.get('lon')
        
        if lat and lon:
            try:
                lat_f = float(lat)
                lon_f = float(lon)
                
                # Bounding box filter (~22km)
                queryset = queryset.filter(
                    latitude__gte=lat_f - 0.2,
                    latitude__lte=lat_f + 0.2,
                    longitude__gte=lon_f - 0.2,
                    longitude__lte=lon_f + 0.2
                )
                
                # Precise filter
                from logistics.utils import haversine
                nearby_ids = []
                for listing in queryset:
                    if listing.latitude is not None and listing.longitude is not None:
                        dist = haversine(lat_f, lon_f, float(listing.latitude), float(listing.longitude))
                        if dist <= 20: # 20km
                            nearby_ids.append(listing.id)
                return Listing.objects.filter(id__in=nearby_ids).order_by('-created_at')
            except (ValueError, TypeError):
                pass
                
        return queryset.order_by('-created_at')
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    # Filtering
    filterset_fields = ['material_type', 'is_free', 'seller__city', 'location']
    
    # Search
    search_fields = ['title', 'description', 'material_type', 'location']
    
    # Ordering
    ordering_fields = ['created_at', 'price', 'material_type']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Use different serializers for different actions"""
        if self.action == 'list':
            return ListingListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ListingCreateSerializer
        return ListingDetailSerializer
    
    def get_permissions(self):
        """Set custom permissions for different actions"""
        if self.action in ['update', 'partial_update', 'destroy']:
            # Only owner or admin can modify
            return [permissions.IsAuthenticated(), IsOwnerOrAdmin()]
        return super().get_permissions()

    def perform_create(self, serializer):
        """Auto-set seller to current user"""
        serializer.save(seller=self.request.user)
    
    @extend_schema(
        summary="Get my listings",
        description="Retrieve all listings created by the authenticated user.",
    )
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_listings(self, request):
        """Get all listings by the current user"""
        listings = self.queryset.filter(seller=request.user)
        
        page = self.paginate_queryset(listings)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(listings, many=True)
        return Response(serializer.data)
    
    @extend_schema(
        summary="Filter by price range",
        description="Get listings within a specific price range.",
        parameters=[
            OpenApiParameter('min_price', OpenApiTypes.FLOAT, description="Minimum price"),
            OpenApiParameter('max_price', OpenApiTypes.FLOAT, description="Maximum price"),
        ],
    )
    @action(detail=False, methods=['get'])
    def by_price_range(self, request):
        """Filter listings by price range"""
        min_price = request.query_params.get('min_price', 0)
        max_price = request.query_params.get('max_price', 999999)
        
        try:
            min_price = float(min_price)
            max_price = float(max_price)
        except ValueError:
            return Response(
                {'error': 'Invalid price parameters'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        listings = self.queryset.filter(
            is_free=False,
            price__gte=min_price,
            price__lte=max_price
        )
        
        page = self.paginate_queryset(listings)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(listings, many=True)
        return Response(serializer.data)


    @extend_schema(summary="Like or unlike a listing")
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def toggle_like(self, request, pk=None):
        """Toggle like on a listing and notify the seller via WebSocket."""
        listing = self.get_object()

        # Prevent seller from liking their own listing
        if listing.seller == request.user:
            return Response({'error': 'You cannot like your own listing.'}, status=400)

        already_liked = listing.liked_by.filter(id=request.user.id).exists()

        if already_liked:
            listing.liked_by.remove(request.user)
            liked = False
        else:
            listing.liked_by.add(request.user)
            liked = True

            # Notify the seller via WebSocket
            try:
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    f"user_{listing.seller.id}",
                    {
                        "type": "logistics_notification",
                        "message": {
                            "type": "listing_liked",
                            "listing_id": listing.id,
                            "listing_title": listing.title,
                            "liked_by": request.user.get_full_name() or request.user.username,
                            "total_likes": listing.liked_by.count(),
                        }
                    }
                )
            except Exception:
                pass  # Don't fail the request if notification fails

        return Response({
            'liked': liked,
            'total_likes': listing.liked_by.count()
        })

    @extend_schema(
        summary="Estimate a listing's price",
        description="Server-computed price estimate (and an adjustable min/max range) for a material and weight, based on real market rates - used when the disposer hasn't gone through the AI photo scan.",
    )
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def estimate_price(self, request):
        from decimal import Decimal, InvalidOperation
        from logistics.pricing import calculate_track_a_fee, calculate_track_b_earnings, price_guardrail

        track_type = request.data.get('track_type', 'B')
        material_type = request.data.get('material_type') or 'Other'

        try:
            if track_type == 'A':
                bag_size = request.data.get('bag_size', 'MEDIUM')
                estimated = calculate_track_a_fee(category=material_type, bag_size=bag_size)
            else:
                weight_kg = Decimal(str(request.data.get('weight_kg') or 0))
                estimated = calculate_track_b_earnings(material_type, weight_kg)
        except (InvalidOperation, TypeError, ValueError):
            return Response({'error': 'Invalid weight_kg'}, status=status.HTTP_400_BAD_REQUEST)

        min_price, max_price = price_guardrail(estimated)

        return Response({
            'estimated_price': float(estimated),
            'min_price': float(min_price),
            'max_price': float(max_price),
            'currency': 'GHS',
        })


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permission to only allow owners of an object or admins to edit it.
    """
    def has_object_permission(self, request, view, obj):
        # Admin can do anything
        if request.user and request.user.is_staff:
            return True
        # Owner can edit their own listing
        return obj.seller == request.user

