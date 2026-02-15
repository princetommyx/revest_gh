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
@method_decorator(cache_page(60 * 5), name='list')
class ListingViewSet(viewsets.ModelViewSet):
    queryset = Listing.objects.all().select_related('seller').order_by('-created_at')
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
        print(f"DEBUG: Creating listing. User: {self.request.user}")
        print(f"DEBUG: Data: {self.request.data}")
        print(f"DEBUG: Files: {self.request.FILES}")
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

