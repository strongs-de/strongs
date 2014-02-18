from django.conf.urls import patterns, include, url
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    url(r'^strongs/', include('strongs.urls')),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^', include('strongs.urls')),
)
