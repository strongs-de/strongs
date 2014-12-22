'use strict';

// function for opening the searchsidebar
function animateOpenInfobox() {
    setTimeout(function() {
        var button = $('#sb-menu');
        if (!$(button).hasClass('sb-menu-open')) {
            $('#sb-menu').addClass('sb-menu-open');
            $('#sb-slidebox').addClass('sb-menu-open');
        }
    }, 25);
}

// function for closing the searchsidebar
function animateCloseInfobox() {
    setTimeout(function() {
        var button = $('#sb-menu');
        if ($(button).hasClass('sb-menu-open')) {
            $(button).removeClass('sb-menu-open');
            $('#sb-slidebox').removeClass('sb-menu-open');

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
    $('#sb-menu > #info-content').html(serverResponse + '<br><br><br>');
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

    // $('.sb-strong').each(function(idx, ele) {
    //     // add data-ajax attribute
    //     $(ele).attr('data-ajax', $(ele).attr('data-strong') + '/' + $(ele).parent().attr('id') + '/' + $(ele).text())
    // });

    // // JBOX
    // $('.sb-strong').jBox('Modal', {
    //     ajax: {
    //         // url: '/strong/' + $(this).attr('data-strong') + '/' + $(this).parent().attr('id') + '/' + $(this).text(),
    //         // url: '/strong/5457/Joh1_8/anfang',
    //         url: '/strong/',
    //         getData: 'data-ajax',
    //         type: 'POST'
    //     }
    // });

    // TIPPED
    // Tipped.create('.sb-strong', function() {
    //     // return "<strong>" + $(this).data('content') + "<\/strong>"
    //     $.ajax({
    //         type: 'GET',
    //         url: '/strong/' + $(this).attr('data-strong') + '/' + $(this).parent().attr('id') + '/' + $(this).text(),
    //         success: function(data) {
    //             // update our tooltip content with our returned data and cache it
    //             // origin.tooltipster('content', data).data('ajax', 'cached');
    //             this.update(data);
    //         }
    //     });
    // });

    // TOOLTIPSTER
    // $('.sb-strong').tooltipster({
    //     content: 'Loading...',
    //     contentAsHTML: true,
    //     interactive: true,
    //     onlyOne: true,
    //     trigger: 'click',
    //     positionTracker: true,
    //     updateAnimation: false,
    //     functionBefore: function(origin, continueTooltip) {
    //
    //         // we'll make this function asynchronous and allow the tooltip to go ahead and show the loading notification while fetching our data
    //         continueTooltip();
    //
    //         // next, we want to check if our data has already been cached
    //         if (origin.data('ajax') !== 'cached') {
    //             $.ajax({
    //                 type: 'GET',
    //                 url: '/strong/' + $(this).attr('data-strong') + '/' + $(this).parent().attr('id') + '/' + $(this).text(),
    //                 success: function(data) {
    //                     // update our tooltip content with our returned data and cache it
    //                     origin.tooltipster('content', data).data('ajax', 'cached');
    //                 }
    //             });
    //         }
    //     }
    // });


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
