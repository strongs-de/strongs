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

	function mobilecheck() {
		var check = false;
		(function(a){if(/(android|ipad|playbook|silk|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
		return check;
	}
	
	// MATTHIAS: Funktion wird aufgerufen, wenn eine Strong geklickt wurde
	function loadStrong( strong ) {
		// MATTHIAS: hier muss der Content vom Server nachgeladen werden
		var menu = document.getElementById('sb-menu');
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
		eventtype = mobilecheck() ? 'touchstart' : 'click',
			
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
			
			button.removeEventListener( eventtype, openSideBar );
			button.addEventListener( eventtype, closeSideBar );
		};

        if(window.innerWidth > 1024) {
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
        }

		button.addEventListener( eventtype, openSideBar );
	}

	init();

})();