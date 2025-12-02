from rest_framework import viewsets, permissions
from .models import Listing
from .serializers import ListingSerializer

class ListingViewSet(viewsets.ModelViewSet):
    queryset = Listing.objects.all().order_by('-created_at')
    serializer_class = ListingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)
