from django.conf.urls import patterns, include, url
from django.contrib import admin
from django.contrib.auth.views import login
admin.autodiscover()

urlpatterns = patterns('',
    url(r'^admin/', include(admin.site.urls)),
    url(r'^accounts/login/$', login),
    url(r'^', include('strongs.urls')),
)
