using Toybox.Application as App;
using Toybox.Attention as Attention;
using Toybox.WatchUi as Ui;
// At the top of your source file, with other imports
using Toybox.Application.Properties;

var timer;
var tickTimer;
var minutes = 0;
var pomodoroNumber = 1;
var isPomodoroTimerStarted = false;
var isBreakTimerStarted = false;

function ping( dutyCycle, length ) {
	if ( Attention has :vibrate ) {
		Attention.vibrate( [ new Attention.VibeProfile( dutyCycle, length ) ] );
	}
}

function play( tone ) {
	if ( Attention has :playTone && ! Properties.getValue( "muteSounds" ) ) {
		Attention.playTone( tone );
	}
}



function isLongBreak() {
	return ( pomodoroNumber % Properties.getValue( "numberOfPomodorosBeforeLongBreak" ) ) == 0;
}

function resetMinutes() {
	minutes = Properties.getValue( "pomodoroLength" ); 
	
}

class GarmodoroDelegate extends Ui.BehaviorDelegate {
function idleCallback() {
	Ui.requestUpdate();
}
	function initialize() {
		Ui.BehaviorDelegate.initialize();
		timer.start( method( :idleCallback ), 60 * 1000, true );
	}

	function pomodoroCallback() {
		minutes -= 1;

		if ( minutes == 0 ) {
			play( 10 ); // Attention.TONE_LAP
			ping( 100, 1500 );
			tickTimer.stop();
			timer.stop();
			isPomodoroTimerStarted = false;
			minutes = Properties.getValue( isLongBreak() ? "longBreakLength" : "shortBreakLength" );

			timer.start( method( :breakCallback ), 60 * 1000, true );
			isBreakTimerStarted = true;
		}

		Ui.requestUpdate();
	}

	function breakCallback() {
		minutes -= 1;

		if ( minutes == 0 ) {
			play( 7 ); // Attention.TONE_INTERVAL_ALERT
			ping( 100, 1500 );
			timer.stop();

			isBreakTimerStarted = false;
			pomodoroNumber += 1;
			resetMinutes();
			timer.start( method( :idleCallback ), 60 * 1000, true );
		}

		Ui.requestUpdate();
	}

	function shouldTick() {
		return Properties.getValue( "tickStrength" ) > 0;
	}

	function tickCallback() {
		ping( Properties.getValue( "tickStrength" ), Properties.getValue( "tickDuration" ) );
	}

	function onBack() {
		Ui.popView( Ui.SLIDE_RIGHT );
		return true;
	}

	function onNextMode() {
		return true;
	}

	function onNextPage() {
		return true;
	}

	function onSelect() {
		if ( isBreakTimerStarted || isPomodoroTimerStarted ) {
			Ui.pushView( new Rez.Menus.StopMenu(), new StopMenuDelegate(), Ui.SLIDE_UP );
			return true;
		}

		play( 1 ); // Attention.TONE_START
		ping( 75, 1500 );
		timer.stop();
		resetMinutes();
		timer.start( method( :pomodoroCallback ), 60 * 1000, true );
		if ( me.shouldTick() ) {
			tickTimer.start( method( :tickCallback ), Properties.getValue( "tickFrequency" ) * 1000, true );
		}
		isPomodoroTimerStarted = true;

		Ui.requestUpdate();

		return true;
	}
}
