from django.contrib import admin

from apps.merchants.models import Merchant, MerchantMembership


@admin.register(Merchant)
class MerchantAdmin(admin.ModelAdmin):  # type: ignore[type-arg]
    list_display = ("merchant_key", "category_title", "is_active")
    list_filter = ("is_active",)
    search_fields = ("merchant_key", "category_title")
    ordering = ("merchant_key",)


@admin.register(MerchantMembership)
class MerchantMembershipAdmin(admin.ModelAdmin):  # type: ignore[type-arg]
    list_display = ("user", "merchant", "is_admin")
    list_filter = ("is_admin",)
    search_fields = ("user__username", "merchant__merchant_key")
    autocomplete_fields = ("user", "merchant")
