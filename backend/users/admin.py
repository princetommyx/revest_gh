from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

class CustomUserAdmin(UserAdmin):
    list_display = ('id', 'username', 'email', 'phone_number', 'role', 'city', 'is_active', 'date_joined')
    list_filter = ('role', 'is_active', 'city', 'date_joined')
    search_fields = ('username', 'email', 'phone_number', 'city')
    ordering = ('-date_joined',)
    
    fieldsets = UserAdmin.fieldsets + (
        ('Profile Info', {'fields': ('role', 'phone_number', 'city', 'company_name', 'national_id', 'is_verified')}),
        ('Vehicle Info', {'fields': ('vehicle_type', 'license_plate')}),
        ('Location Info', {'fields': ('current_lat', 'current_lon', 'is_online')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'phone_number', 'role', 'city'),
        }),
    )

admin.site.register(User, CustomUserAdmin)
