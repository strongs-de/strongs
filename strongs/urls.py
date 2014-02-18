from django.conf.urls import patterns, url
from strongs import views

urlpatterns = patterns('',
    url(r'^$', views.index, name='index'),
    url(r'^strong/(?P<strong_id>\d+)/$', views.strongs, name='strongs'),
    url(r'^(?P<bible_book>.+)/$', views.bible, name='bible'),
    url(r'^initDb$', views.initDb, name='initDb')
)