# -*- coding: utf8 -*-
from django.conf.urls import patterns, url
from strongs import views
from django.contrib.auth.views import login, logout_then_login
from strongs.views_account import my_account, register, custom_login
from strongs.views_bible import async_bible, sync_bible
from strongs.views_index import index, async_index
# from strongs.views_init import initDb
from strongs.views_search import async_search, async_search_strong, sync_search_strong, sync_search
from strongs.views_strong_details import strongs
from strongs.views_verslist import add_vers_to_list, remove_vers_from_list, set_verslist_title, create_verslist, \
    select_verslist, remove_verslist

urlpatterns = patterns('',
    # db initialization
    # url(r'^initDb$', initDb, name='initDb'),

    # User management
    url(r'^login/$', custom_login),
    url(r'^logout/$', logout_then_login),
    url(r'^register/$', register),
    url(r'^account/$', my_account),

    # Home page
    url(r'^$', index, name='index'),
    url(r'^trans/(?P<column>\d+)_(?P<translation>\d+)/$', async_index, name='async_index'),

    # Vers list
    url(r'^add-vers/(?P<vers>[^/]+)/(?P<versListId>\d+)/$', add_vers_to_list, name='add_vers_to_list'),
    url(r'^add-vers/(?P<vers>.+)/$', add_vers_to_list, name='add_vers_to_list'),
    url(r'^remove-vers/(?P<vers>.+)/$', remove_vers_from_list, name='remove_vers_from_list'),
    url(r'^set-verslist-title/(?P<id>\d+)/(?P<t>.+)/$', set_verslist_title, name='set_verslist_title'),
    url(r'^create-verslist/$', create_verslist, name='create_verslist'),
    url(r'^select-verslist/(?P<id>\d+)/$', select_verslist, name='select_verslist'),
    url(r'^remove-verslist/$', remove_verslist, name='remove_verslist'),

    # Editor pages
    url(r'^note/(?P<booknr>\d+)/(?P<chapternr>\d+)/(?P<versnr>\d+)/$', views.note, name='note'),

    # Strong search
    url(r'^(?P<strong>[\d\-HGhg]+)/$', sync_search_strong, name='sync_search_strongs'),
    url(r'^(?P<strong>[\d\-HGhg]+)/(?P<page>\d+)/$', sync_search_strong, name='sync_search_strongs'),
    url(r'^async/(?P<strong>[\d\-HGhg]+)/$', async_search_strong, name='async_search_strongs'),
    url(r'^async/(?P<strong>[\d\-HGhg]+)/(?P<page>\d+)/$', async_search_strong, name='async_search_strongs'),

    # Search for sidebar content
    url(ur'^strong/(?P<strong_id>[\d\-HGhg]+)/(?P<vers>[äöüÄÖÜa-zA-Z0-9_\.]+)/(?P<word>[^/]+)/$', strongs, name='strongs'),

    # Search for string
    url(r'^(?P<srch>.+)/(?P<page>\d+)/trans/(?P<column>\d+)_(?P<translation>\d+)/$', async_search, name='async_search'),
    url(r'^(?P<srch>.+)/(?P<page>\d+)/trans/(?P<column>\d+)_(?P<translation>\d+)/$', sync_search, name='sync_search'),
    url(r'^(?P<srch>.+)/(?P<page>\d+)/$', sync_search, name='sync_search'),
    url(r'^async/(?P<srch>.+)/(?P<page>\d+)/$', async_search, name='async_search'),

    # Search for bible text
    url(r'^(?P<bible_book>.+)/trans/(?P<column>\d+)_(?P<translation>\d+)/$', async_bible, name='async_bible'),
    url(r'^async/(?P<bible_book>.+)/$', async_bible, name='async_bible'),
    url(r'^(?P<bible_book>.+)/$', sync_bible, name='sync_bible')
)
