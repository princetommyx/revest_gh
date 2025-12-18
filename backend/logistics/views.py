from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import PickupRequest
from .serializers import PickupRequestSerializer
from .utils import haversine
from django.contrib.auth import get_user_model
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

User = get_user_model()

class PickupRequestViewSet(viewsets.ModelViewSet):
    queryset = PickupRequest.objects.all().order_by('-created_at')
    serializer_class = PickupRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        request = serializer.save(provider=self.request.user)
        # Logic to find nearby collectors
        self.notify_nearby_collectors(request)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        pickup_request = self.get_object()
        if pickup_request.status != 'PENDING':
            return Response({'error': 'Job already taken'}, status=400)
        
        pickup_request.status = 'ACCEPTED'
        pickup_request.collector = request.user
        pickup_request.save()
        
        # Notify Provider
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"user_{pickup_request.provider.id}",
            {
                "type": "logistics_notification",
                "message": {
                    "type": "job_accepted",
                    "request_id": pickup_request.id,
                    "collector_name": request.user.username,
                    "vehicle_type": request.user.vehicle_type,
                    "license_plate": request.user.license_plate
                }
            }
        )
        return Response({'status': 'job accepted'})

    @action(detail=False, methods=['get'])
    def available_jobs(self, request):
        from django.utils import timezone
        from datetime import timedelta
        
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
        print(f"DEBUG: Found {online_collectors.count()} online collectors total.")
        
        nearby = []
        for collector in online_collectors:
            print(f"DEBUG: Checking Collector {collector.username} at {collector.current_lat}, {collector.current_lon}")
            if collector.current_lat and collector.current_lon:
                dist = haversine(request.latitude, request.longitude, collector.current_lat, collector.current_lon)
                print(f"DEBUG: Distance to {collector.username} is {dist} km")
                if dist <= RADIUS:
                    nearby.append(collector)
        
        print(f"Found {len(nearby)} nearby collectors for Request #{request.id}")
        
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
