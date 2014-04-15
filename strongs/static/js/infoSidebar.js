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

function loadStrong( strong, vers ) {
    var xhReq = new XMLHttpRequest();
    xhReq.open("GET", "/strong/" + strong + "/" + vers, false);
    xhReq.send(null);
    var serverResponse = xhReq.responseText;
    $('#sb-menu > #info-content').html("<h4>" + strong + "</h4>" + serverResponse);
    initTooltips();
    document.location = document.location.href.match(/(^[^#]*)/)[0] + '#' + strong + "/" + vers;
}

function strongclick(ev) {
    ev.stopPropagation();
    ev.preventDefault();
    loadStrong($(this).attr('data-strong'), $(this).parent().attr('id'));
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
        loadStrong(arr[0], arr[1]);
        animateOpenInfobox();
    }

    initStrongLinks();
});
/*
var SidebarMenuEffects = (function() {

	function classReg( className ) {
		return new RegExp("(^|\\s+)" + className + "(\\s+|$)");
	}

	var hasClass, addClass, removeClass;

	if ( 'classList' in document.documentElement ) {
		hasClass = function( elem, c ) {
			return elem.classList.contains( c );
		};
		addClass = function( elem, c ) {
			elem.classList.add( c );
		};
		removeClass = function( elem, c ) {
			elem.classList.remove( c );
		};
	}
	else {
		hasClass = function( elem, c ) {
			return classReg( c ).test( elem.className );
		};
		addClass = function( elem, c ) {
			if ( !hasClass( elem, c ) ) {
				elem.className = elem.className + ' ' + c;
			}
		};
		removeClass = function( elem, c ) {
			elem.className = elem.className.replace( classReg( c ), ' ' );
		};
	}

	function toggleClass( elem, c ) {
		var fn = hasClass( elem, c ) ? removeClass : addClass;
		fn( elem, c );
	}

	var classie = {
		hasClass: hasClass,
		addClass: addClass,
		removeClass: removeClass,
		toggleClass: toggleClass
	};

	function hasParentClass( e, classname ) {
		if(e === document) return false;
		if( classie.hasClass( e, classname ) ) {
			return true;
		}
		return e.parentNode && hasParentClass( e.parentNode, classname );
	}

	// MATTHIAS: Funktion wird aufgerufen, wenn eine Strong geklickt wurde
	function loadStrong( strong, vers ) {
        var xhReq = new XMLHttpRequest();
        xhReq.open("GET", "/strong/" + strong + "/" + vers, false);
        xhReq.send(null);
        var serverResponse = xhReq.responseText;
        $('#sb-menu').html("<h4>" + strong + "</h4>" + serverResponse);
        location = document.location.href.match(/(^[^#]*)/)[0] + '#' + strong + "/" + vers;
	}

	function init() {
		var container = document.getElementById( 'container-full' ),
		button = document.getElementById( 'sb-button' ),
		strongs = Array.prototype.slice.call( document.querySelectorAll( '.sb-strong' ) ),
		eventtype = 'click',

		resetMenu = function() {
			classie.removeClass( container, 'sb-menu-open' );
		},

		closeSideBar = function(evt) {
			if( !hasParentClass( evt.target, 'sb-menu' ) ) {
				resetMenu();

				// remove anchor link
				parent.location.hash = '';

				button.removeEventListener( eventtype, closeSideBar );
				button.addEventListener( eventtype, openSideBar );
			}
		},

		// MATTHIAS: Funktion wird aufgerufen, wenn die SideBar über den Button rechts oben aktiviert wurde
		openSideBar = function() {
			setTimeout( function() {
				classie.addClass( container, 'sb-menu-open' );
			}, 25 );

			// Inhalt leeren
			var menu = document.getElementById('sb-menu');
			//menu.innerHTML = '';

			button.removeEventListener( eventtype, openSideBar );
			button.addEventListener( eventtype, closeSideBar );
		};
		function open() {
			container.className = 'container-full';
			setTimeout( function() {
				classie.addClass( container, 'sb-menu-open' );
			}, 25 );

			// Init tooltips
			initTooltips();

			button.removeEventListener( eventtype, openSideBar );
			button.addEventListener( eventtype, closeSideBar );
		};
		function clickfunc(ev) {
				ev.stopPropagation();
				ev.preventDefault();
				loadStrong($(this).attr('data-strong'), $(this).parent().attr('id'));
				open();
			};
		$('.sb-strong').on('click', clickfunc);
		button.addEventListener( eventtype, openSideBar );

		// If there is a strong-number given (as anchor in url) open the sidebar
		if(parent.location.hash.length > 1) {
			var anchor = parent.location.hash.substring(1);
			var arr = anchor.split('/');
			open();
			loadStrong(arr[0], arr[1]);
		}
	}

	init();

})();
*/
