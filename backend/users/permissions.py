"""
Custom permissions for the Users app API endpoints.
"""
from rest_framework import permissions


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permission that allows users to only access/edit their own profile,
    or allows admin users to access any profile.
    """
    
    def has_object_permission(self, request, view, obj):
        # Admin users can do anything
        if request.user and request.user.is_staff:
            return True
        
        # Users can only access their own profile
        return obj == request.user


class IsVerified(permissions.BasePermission):
    """
    Permission that only allows verified users to perform certain actions.
    """
    
    message = "You must verify your account to perform this action."
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_verified


class IsCollector(permissions.BasePermission):
    """
    Permission that only allows users with COLLECTOR role.
    """
    
    message = "Only collectors can perform this action."
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'COLLECTOR'


class IsSeller(permissions.BasePermission):
    """
    Permission that only allows users with SELLER role.
    """
    
    message = "Only sellers can perform this action."
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'SELLER'


class IsRecycler(permissions.BasePermission):
    """
    Permission that only allows users with RECYCLER role.
    """
    
    message = "Only recyclers can perform this action."
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'RECYCLER'
