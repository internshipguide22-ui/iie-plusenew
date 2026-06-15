from django.contrib import admin
from .models import CalendarEvent, GalleryItem, NewsItem, Referral, VlogItem

admin.site.register(GalleryItem)
admin.site.register(VlogItem)
admin.site.register(NewsItem)
admin.site.register(CalendarEvent)
admin.site.register(Referral)
