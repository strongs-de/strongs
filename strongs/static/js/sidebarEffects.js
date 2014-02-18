'use strict';

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
	function loadStrong( strong ) {
        var xhReq = new XMLHttpRequest();
        xhReq.open("GET", "/strongs/" + strong, false);
        xhReq.send(null);
        var serverResponse = xhReq.responseText;
        menu.innerHTML = "<h4>" + strong + "</h4>" + serverResponse;

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

		strongs.forEach( function( el, i ) {
			var strong = el.getAttribute( 'data-strong' );

			el.addEventListener( eventtype, function( ev ) {
				ev.stopPropagation();
				ev.preventDefault();
				loadStrong(strong);
				container.className = 'container-full';
				setTimeout( function() {
					classie.addClass( container, 'sb-menu-open' );
				}, 25 );
				
				button.removeEventListener( eventtype, openSideBar );
				button.addEventListener( eventtype, closeSideBar );
			});
		} );

		button.addEventListener( eventtype, openSideBar );
	}

	init();

})();