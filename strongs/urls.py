from django.conf.urls import patterns, url
from strongs import views
from django.contrib.auth.views import login, logout_then_login

urlpatterns = patterns('',
    # db initialization
    url(r'^initDb$', views.initDb, name='initDb'),

    # User management
    url(r'^login/$', views.custom_login),
    url(r'^logout/$', logout_then_login),
    url(r'^register/$', views.register),
    url(r'^account/$', views.my_account),

    # Home page
    url(r'^$', views.index, name='index'),
    url(r'^trans/(?P<column>\d+)_(?P<translation>\d+)/$', views.async_index, name='async_index'),

    # Editor pages
    url(r'^note/(?P<booknr>\d+)/(?P<chapternr>\d+)/(?P<versnr>\d+)/$', views.note, name='note'),

    # Strong search
    url(r'^(?P<strong>[\d\-HGhg]+)/$', views.sync_search_strong, name='sync_search_strongs'),
    url(r'^(?P<strong>[\d\-HGhg]+)/(?P<page>\d+)/$', views.sync_search_strong, name='sync_search_strongs'),
    url(r'^async/(?P<strong>[\d\-HGhg]+)/$', views.async_search_strong, name='async_search_strongs'),
    url(r'^async/(?P<strong>[\d\-HGhg]+)/(?P<page>\d+)/$', views.async_search_strong, name='async_search_strongs'),

    # Search for sidebar content
    url(r'^strong/(?P<strong_id>[\d\-HGhg]+)/(?P<vers>[a-zA-Z0-9_\.]+)/(?P<word>[^/]+)/$', views.strongs, name='strongs'),

    # Search for string
    url(r'^(?P<srch>.+)/(?P<page>\d+)/trans/(?P<column>\d+)_(?P<translation>\d+)/$', views.async_search, name='async_search'),
    url(r'^(?P<srch>.+)/(?P<page>\d+)/$', views.sync_search, name='sync_search'),
    url(r'^async/(?P<srch>.+)/(?P<page>\d+)/$', views.async_search, name='async_search'),

    # Search for bible text
    url(r'^(?P<bible_book>.+)/trans/(?P<column>\d+)_(?P<translation>\d+)/$', views.async_bible, name='async_bible'),
    url(r'^async/(?P<bible_book>.+)/$', views.async_bible, name='async_bible'),
    url(r'^(?P<bible_book>.+)/$', views.sync_bible, name='sync_bible')
)