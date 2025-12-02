from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Role Info', {'fields': ('role', 'vehicle_type', 'license_plate')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Role Info', {'fields': ('role', 'vehicle_type', 'license_plate')}),
    )

admin.site.register(User, CustomUserAdmin)
