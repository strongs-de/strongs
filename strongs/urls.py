from django.conf.urls import patterns, url
from strongs import views

urlpatterns = patterns('',
    url(r'^$', views.index, name='index'),
    url(r'^strong/(?P<strong_id>\d+)/(?P<vers>[a-zA-Z0-9_\.]+)/$', views.strongs, name='strongs'),
    url(r'^initDb$', views.initDb, name='initDb'),
    url(r'^(?P<bible_book>.+)/$', views.bible, name='bible'),
)