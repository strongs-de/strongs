from django.conf.urls import patterns, url
from strongs import views
from django.contrib.auth.views import login, logout_then_login

urlpatterns = patterns('',
    url(r'^login/$', views.custom_login),
    url(r'^logout/$', logout_then_login),
    url(r'^register/$', views.register),
    url(r'^account/$', views.my_account),
    url(r'^$', views.index, name='index'),
    url(r'^note/(?P<booknr>\d+)/(?P<chapternr>\d+)/(?P<versnr>\d+)/$', views.note, name='note'),
    url(r'^(?P<strong>[GHgh]\d+)/$', views.search_strong, name='search_strongs'),
    url(r'^(?P<strong>[GHgh]\d+)/(?P<page>\d+)/$', views.search_strong, name='search_strongs'),
    url(r'^strong/(?P<strong_id>\d+)/(?P<vers>[a-zA-Z0-9_\.]+)/$', views.strongs, name='strongs'),
    url(r'^(?P<search>.+)/(?P<page>\d+)/$', views.search, name='search'),
    url(r'^initDb$', views.initDb, name='initDb'),
    url(r'^(?P<bible_book>.+)/$', views.bible, name='bible'),
)