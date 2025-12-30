from django.db import models
from rest_framework import viewsets, permissions, filters, status
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
from .utils import haversine
from django.contrib.auth import get_user_model
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

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
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'material_type']
    ordering_fields = ['created_at', 'status']
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'COLLECTOR':
            # Collectors see jobs they accepted or pending jobs (if not filtered by available_jobs)
            return PickupRequest.objects.filter(
                models.Q(collector=user) | models.Q(status='PENDING')
            ).order_by('-created_at')
        return PickupRequest.objects.filter(provider=user).order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'list':
            return PickupRequestListSerializer
        elif self.action == 'create':
            return PickupRequestCreateSerializer
        elif self.action in ['update_status', 'complete', 'track']:
            return PickupRequestUpdateSerializer
        return PickupRequestDetailSerializer

    def perform_create(self, serializer):
        request = serializer.save(provider=self.request.user)
        # Logic to find nearby collectors
        self.notify_nearby_collectors(request)

    @extend_schema(summary="Accept a pickup request")
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        pickup_request = self.get_object()
        if pickup_request.status != 'PENDING':
            return Response({'error': 'Job already taken or not pending'}, status=400)
        
        pickup_request.status = 'ACCEPTED'
        pickup_request.collector = request.user
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
        pickup_request.save()
        
        self.notify_provider(pickup_request, 'driver_arrived')
        return Response({'status': 'driver arrived'})

    @extend_schema(summary="Complete pickup")
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        pickup_request = self.get_object()
        if pickup_request.status != 'ARRIVED':
            return Response({'error': 'Job must be marked as arrived first'}, status=400)
        
        pickup_request.status = 'COMPLETED'
        pickup_request.save()
        
        self.notify_provider(pickup_request, 'job_completed')
        return Response({'status': 'job completed'})

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
        
        # Notify other party
        if request.user == pickup_request.provider and pickup_request.collector:
             self._notify_user(pickup_request.collector, 'job_cancelled_by_provider', pickup_request)
        elif request.user == pickup_request.collector:
             self.notify_provider(pickup_request, 'job_cancelled_by_collector')
             
        return Response({'status': 'job cancelled'})

    @extend_schema(summary="Update live location")
    @action(detail=True, methods=['post'])
    def track(self, request, pk=None):
        """Update live location during a job"""
        pickup_request = self.get_object()
        if pickup_request.collector != request.user:
            return Response({'error': 'Not authorized'}, status=403)
            
        lat = request.data.get('latitude')
        lon = request.data.get('longitude')
        
        if lat and lon:
            pickup_request.current_lat = lat
            pickup_request.current_lon = lon
            pickup_request.save()
            
            # Notify provider via websocket
            self.notify_provider(pickup_request, 'location_update', {'lat': lat, 'lon': lon})
            return Response({'status': 'location updated'})
            
        return Response({'error': 'Invalid coordinates'}, status=400)

    def notify_provider(self, pickup_request, status_type, extra_data=None):
        data = {
            "type": status_type,
            "request_id": pickup_request.id,
            "collector_name": pickup_request.collector.username if pickup_request.collector else None,
        }
        if extra_data:
            data.update(extra_data)
            
        self._notify_user(pickup_request.provider, status_type, pickup_request, data)

    def _notify_user(self, user, type, request_obj, message_data=None):
        channel_layer = get_channel_layer()
        if not message_data:
             message_data = {
                "type": type,
                "request_id": request_obj.id,
             }
             
        async_to_sync(channel_layer.group_send)(
            f"user_{user.id}",
            {
                "type": "logistics_notification",
                "message": message_data
            }
        )

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
        jobs = PickupRequest.objects.filter(status='PENDING', created_at__gte=one_hour_ago).order_by('-created_at')
        
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
        online_collectors = User.objects.filter(role='COLLECTOR', is_online=True)
        
        nearby = []
        for collector in online_collectors:
            if collector.current_lat and collector.current_lon:
                dist = haversine(request.latitude, request.longitude, collector.current_lat, collector.current_lon)
                if dist <= RADIUS:
                    nearby.append(collector)
        
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

    @extend_schema(summary="Get ride history")
    @action(detail=False, methods=['get'])
    def history(self, request):
        """
        Return completed rides for the current user.
        """
        user = request.user
        if user.role == 'COLLECTOR':
            rides = PickupRequest.objects.filter(collector=user, status='COMPLETED').order_by('-created_at')
        else:
            # For Providers or others
            rides = PickupRequest.objects.filter(provider=user, status='COMPLETED').order_by('-created_at')
        
        serializer = self.get_serializer(rides, many=True)
        return Response(serializer.data)
