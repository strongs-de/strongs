'use strict';

// function for opening the searchsidebar
function animateOpenInfobox() {
    setTimeout(function() {
        var button = $('#sb-menu');
        if (!$(button).hasClass('sb-menu-open')) {
//                $('#sb-menu').animate({'right': $('#sb-menu').outerWidth()}, 300);
            $('#sb-slidebox').animate({'right': $('#sb-slidebox').outerWidth()}, 300);
            $('#sb-menu').addClass('sb-menu-open');
        }
    }, 25);
}

// function for closing the searchsidebar
function animateCloseInfobox() {
    setTimeout(function() {
        var button = $('#sb-menu');
        if ($(button).hasClass('sb-menu-open')) {
//                $('#sb-menu').stop(true).animate({'right': '0px'}, 100);
            $('#sb-slidebox').stop(true).animate({'right': '0px'}, 100);
            $(button).removeClass('sb-menu-open');
            // remove anchor link
            parent.location.hash = '';
        }
    }, 25);
}

function loadStrong( strong, vers, word ) {
    var xhReq = new XMLHttpRequest();
    xhReq.open("GET", "/strong/" + strong + "/" + vers + "/" + word, false);
    xhReq.send(null);
    var serverResponse = xhReq.responseText;
    $('#sb-menu > #info-content').html(serverResponse);
    initTooltips();
    document.location = document.location.href.match(/(^[^#]*)/)[0] + '#' + strong + "/" + vers + "/" + word;
}

function strongclick(ev) {
    ev.stopPropagation();
    ev.preventDefault();
    loadStrong($(this).attr('data-strong'), $(this).parent().attr('id'), $(this).text());
    animateOpenInfobox();
}

function initStrongLinks() {
    $('.sb-strong').on('click', strongclick);

    // open and close the searchsidebar
    $('#sb-button').click(function() {
        if (!$("#sb-menu").hasClass('sb-menu-open')) {
            animateOpenInfobox();
        } else {
            animateCloseInfobox();
        }
    });
}

$(function() {
    // If there is a strong-number given (as anchor in url) open the sidebar
    if(parent.location.hash.length > 1) {
        var anchor = parent.location.hash.substring(1);
        var arr = anchor.split('/');
        loadStrong(arr[0], arr[1], arr[2]);
        animateOpenInfobox();
    }

    initStrongLinks();
});