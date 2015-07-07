var ctxt = new window.AudioContext(); //audio canvas
var osc  = ctxt.createOscillator(); //first 'frequency controller'
var filter = ctxt.createBiquadFilter(); //lowpass filter
var notch = ctxt.createBiquadFilter(); //notch filter
var lfo = ctxt.createOscillator(); //low frequency oscillator
var gain = ctxt.createGain(); //volume
analyser = ctxt.createAnalyser(); //sound data
var drive  = ctxt.createWaveShaper(); //wave shaper 'aka distortion aka louder'
var convolver = ctxt.createConvolver(); //reverb
var convolverGain = ctxt.createGain(); // reverb control
var node = ctxt.createScriptProcessor(4096, 1, 1); //bitcrusher
var mgain = ctxt.createGain(); //effect gain (currently only affecting bitcrush)
var now;

CGA = .5; //CONVOLVER GAIN
LFOD = 2; //LFO DIVISOR
ODG = 0; //OVERDRIVE GAIN
FFV = 4000; //LOWPASS FILTER FREQUENCY
BFV = 1500; //notch FILTER FREQUENCY
DEC = 1; //DECAY
ATT = 1; //ATTACK
BITS = 1;
VOL = .8;


var oscnum = 0; //corresponds to a type (0 = saw, 1 = square, ....)
var lfonum = 0; // ^

var request = new XMLHttpRequest();
request.open("GET", "./assets/impulse.wav", true);
request.responseType = "arraybuffer";

request.onload = function () {
    ctxt.decodeAudioData(request.response, function(buffer) {
        convolver.buffer = buffer;
    });
}
request.send();
//Waveshaper equation
function makeDistortionCurve(amount) {
    var k = typeof amount === 'number' ? amount : 50,
        n_samples = 44100,
        curve = new Float32Array(n_samples),
        deg = Math.PI / 180,
        i = 0,
        x;
    for (i; i < n_samples; ++i ) {
        x = i * 2 / n_samples - Math.sin(Math.cos(Math.tan(1)));
        curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
    }
    return curve;
};


var bufferSize = 22100;
var effect = (function() {
    node.bits = BITS; // between 1 and 16
    node.normfreq = .3; // between 0.0 and 1.0
    var step = Math.pow(1/3, node.bits);
    var phaser = 2;
    var last = 0;
    node.onaudioprocess = function(e) {
        var input = e.inputBuffer.getChannelData(0);
        var output = e.outputBuffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
            phaser += node.normfreq;
            if (phaser >= 1.0) {
                phaser -= 1.0;
                last = step * Math.floor(input[i] / step + 0.5);
            }
            output[i] = last;
        }
    };
    return node;

})();



$(document).ready(function(){
    //data structure for analyser
    analyser.fftSize = 2048;
    var frequencyData = new Uint8Array(1024);
//animation function
    function update() {
        requestAnimationFrame(update);
        analyser.getByteFrequencyData(frequencyData);
    }
    //MAIN OSCILLATOR **VCO**
    osc.frequency.value = 0;
    osc.type = 'sawtooth';
    osc.start(0);
    //LFO **LOW FREQUENCY OSCILLATOR**
    lfo.frequency.value = 0;
    lfo.type = 'sawtooth';
    lfo.start(0);
    //gain for the lfo
    lfogain = ctxt.createGain();
    lfogain.gain.value= .5;
    //effect gain
    mgain.gain.value = 1;
    //main gain
    gain.gain.value = .9;
    //lowpass gain
    filter.gain = 0.5;
    filter.Q.value = 1;
    filter.type = 'lowpass';
    notch.type = 'notch';
    notch.Q.value = .1;
    notch.gain = 0.2;
    convolverGain.gain = CGA;
    //Create a waveshaper waveform
    drive.curve = makeDistortionCurve(9000);
    drive.oversample = '4x';
    //filter for the drive
    var driveFilter = ctxt.createBiquadFilter();
    driveFilter.type = 'notch';
    driveFilter.frequency.value = 5000;
    driveFilter.gain.value = 4;


    //FINAL COMPRESSOR 'VOLUME CONTROL'
    var driveCompressor = ctxt.createDynamicsCompressor();
    driveCompressor.threshold.value = ODG;
    driveCompressor.knee.value = 5;
    driveCompressor.ratio.value = 10;
    driveCompressor.reduction.value = ODG;
    driveCompressor.attack.value = 0;
    driveCompressor.release.value = 2;

    //DEFINE NODE CONNECTIONS
    osc.connect(drive);
    drive.connect(gain);
    lfo.connect(lfogain);
    lfogain.connect(driveFilter);
    gain.connect(driveFilter);
    driveFilter.connect(driveCompressor);
    mgain.connect(driveFilter);
    driveFilter.connect(filter);
    driveFilter.connect(notch);
    filter.connect(driveCompressor);
    notch.connect(driveCompressor);
    gain.connect(analyser);
    lfo.connect(analyser);
    driveCompressor.connect(node);
    node.connect(mgain);
    mgain.connect(ctxt.destination);
    driveCompressor.connect(convolver);
    convolver.connect(convolverGain);
    convolverGain.connect(ctxt.destination);
    driveCompressor.connect(ctxt.destination);

    //KEYBINDS
    //C4 release
    Mousetrap.bind('q', function() {
        document.getElementById("C").style.transform = "rotateX(0deg)";
        keyup();
    }, 'keyup');
    //C4
    Mousetrap.bind('q', function() {
        document.getElementById("C").style.transform = "rotateX(20deg)";
        osc.frequency.value = 261.63;
        lfo.frequency.value = 260.99/LFOD;
        keydown();
    });

    //C#4 release
    Mousetrap.bind('2', function() {
        document.getElementById("C#").style.transform = "rotateX(0deg)";
        keyup();
    }, 'keyup');
    //C#4
    Mousetrap.bind('2', function() {
        document.getElementById("C#").style.transform = "rotateX(20deg)";
        osc.frequency.value = 277.18;
        lfo.frequency.value = 277.77/LFOD;
        keydown();
    });
    //D4 release
    Mousetrap.bind('w', function() {
        document.getElementById("D").style.transform = "rotateX(0deg)";
        keyup();
        }, 'keyup');
    //D4
    Mousetrap.bind('w', function() {
        document.getElementById("D").style.transform = "rotateX(20deg)";
        osc.frequency.value = 293.66;
        lfo.frequency.value = 294.11/LFOD;
        keydown();
    });
    //D#4 release
    Mousetrap.bind('3', function() {
        document.getElementById("D#").style.transform = "rotateX(0deg)";
        keyup();
    }, 'keyup');
    //D#4
    Mousetrap.bind('3', function() {
        document.getElementById("D#").style.transform = "rotateX(20deg)";
        osc.frequency.value = 311.13;
        lfo.frequency.value = 310.77/LFOD;
        keydown();
    });
    //E4 release
    Mousetrap.bind('e', function() {
        document.getElementById("E").style.transform = "rotateX(0deg)";
        keyup();
    }, 'keyup');
    //E4
    Mousetrap.bind('e', function() {
        document.getElementById("E").style.transform = "rotateX(20deg)";
        osc.frequency.value = 329.63;
        lfo.frequency.value = 329.99/LFOD;
        keydown();
    });
    //F4 release
    Mousetrap.bind('r', function() {
        document.getElementById("F").style.transform = "rotateX(0deg)";
        keyup();
    }, 'keyup');
    //F4
    Mousetrap.bind('r', function() {
        document.getElementById("F").style.transform = "rotateX(20deg)";
        osc.frequency.value = 349.23;
        lfo.frequency.value = 348.99/LFOD;
        keydown();
    });
    //F#4 release
    Mousetrap.bind('5', function() {
        document.getElementById("F#").style.transform = "rotateX(0deg)";
        keyup();
    }, 'keyup');
    //F#4
    Mousetrap.bind('5', function() {
        document.getElementById("F#").style.transform = "rotateX(20deg)";
        osc.frequency.value = 369.88;
        lfo.frequency.value = 377.11/LFOD;
        keydown();
    });
    //G4 release
    Mousetrap.bind('t', function() {
        document.getElementById("G").style.transform = "rotateX(0deg)";
        keyup();
    }, 'keyup');
    //G4
    Mousetrap.bind('t', function() {
        document.getElementById("G").style.transform = "rotateX(20deg)";
        osc.frequency.value = 392.01;
        lfo.frequency.value = 391.77/LFOD;
        keydown();
    });
    //G#4 release
    Mousetrap.bind('6', function() {
        document.getElementById("G#").style.transform = "rotateX(0deg)";
        keyup();
    }, 'keyup');
    //G#4
    Mousetrap.bind('6', function() {
        document.getElementById("G#").style.transform = "rotateX(20deg)";
        osc.frequency.value = 415.33;
        lfo.frequency.value = 415.77/LFOD;
        keydown();
    });
    //A4 release
    Mousetrap.bind('y', function() {
        document.getElementById("A").style.transform = "rotateX(0deg)";
        keyup();
    }, 'keyup');
    //A4
    Mousetrap.bind('y', function() {
        document.getElementById("A").style.transform = "rotateX(20deg)";
        osc.frequency.value = 440.00;
        lfo.frequency.value = 441.63/LFOD;
        keydown();
    });
    //A#4 release
    Mousetrap.bind('7', function() {
        document.getElementById("A#").style.transform = "rotateX(0deg)";
        keyup();
    }, 'keyup');
    //A#4
    Mousetrap.bind('7', function() {
        document.getElementById("A#").style.transform = "rotateX(20deg)";
        osc.frequency.value = 466.16;
        lfo.frequency.value = 466.66/LFOD;
        keydown();
    });
    //B4 release
    Mousetrap.bind('u', function() {
        document.getElementById("B").style.transform = "rotateX(0deg)";
        keyup();
    }, 'keyup');
    //B4
    Mousetrap.bind('u', function() {
        document.getElementById("B").style.transform = "rotateX(20deg)";
        osc.frequency.value = 493.00;
        lfo.frequency.value = 493.63/LFOD;
        keydown();
    });
    //C5 release
    Mousetrap.bind('i', function() {
        document.getElementById("C2").style.transform = "rotateX(0deg)";
        keyup();
    }, 'keyup');
    //C5
    Mousetrap.bind('i', function() {
        document.getElementById("C2").style.transform = "rotateX(20deg)";
        osc.frequency.value = 523.25;
        lfo.frequency.value = 523.63/LFOD;
        keydown();
    });


    //UI-CONTROLS
    document.getElementById("lfotriangle").addEventListener("click", function(){
        lfo.type = 'triangle'
    });
    document.getElementById("lfosquare").addEventListener("click", function(){
        lfo.type = 'square'
    });
    document.getElementById("lfosawtooth").addEventListener("click", function(){
        lfo.type = 'sawtooth'
    });

    //CLICK FUNCTIONALITY
    document.getElementById("C").addEventListener("mousedown", function(){
        document.getElementById("C").style.transform = "rotateX(20deg)";
        osc.frequency.value = 261.63;
        lfo.frequency.value = 260.99/LFOD;
        keydown();
    });
    document.getElementById("C").addEventListener("mouseup", function(){
        document.getElementById("C").style.transform = "rotateX(0deg)";
        keyup();
    });
    document.getElementById("C#").addEventListener("mousedown", function(){
        document.getElementById("C#").style.transform = "rotateX(20deg)";
        osc.frequency.value = 277.18;
        lfo.frequency.value = 277.77/LFOD;
        keydown();
    });
    document.getElementById("C#").addEventListener("mouseup", function(){
        document.getElementById("C#").style.transform = "rotateX(0deg)";
        keyup();
    });
    document.getElementById("D").addEventListener("mousedown", function(){
        document.getElementById("D").style.transform = "rotateX(20deg)";
        osc.frequency.value = 293.66;
        lfo.frequency.value = 294.11/LFOD;
        keydown();
    });
    document.getElementById("D").addEventListener("mouseup", function(){
        document.getElementById("D").style.transform = "rotateX(0deg)";
        keyup();
    });
    document.getElementById("D#").addEventListener("mousedown", function(){
        document.getElementById("D#").style.transform = "rotateX(20deg)";
        osc.frequency.value = 311.13;
        lfo.frequency.value = 310.77/LFOD;
        keydown();
    });
    document.getElementById("D#").addEventListener("mouseup", function(){
        document.getElementById("D#").style.transform = "rotateX(0deg)";
        keyup();
    });
    document.getElementById("E").addEventListener("mousedown", function(){
        document.getElementById("E").style.transform = "rotateX(20deg)";
        osc.frequency.value = 329.63;
        lfo.frequency.value = 329.99/LFOD;
        keydown();
    });
    document.getElementById("E").addEventListener("mouseup", function(){
        document.getElementById("E").style.transform = "rotateX(0deg)";
        keyup();
    });
    document.getElementById("F").addEventListener("mousedown", function(){
        document.getElementById("F").style.transform = "rotateX(20deg)";
        osc.frequency.value = 349.23;
        lfo.frequency.value = 348.99/LFOD;
        keydown();
    });
    document.getElementById("F").addEventListener("mouseup", function(){
        document.getElementById("F").style.transform = "rotateX(0deg)";
        keyup();
    });
    document.getElementById("F#").addEventListener("mousedown", function(){
        document.getElementById("F#").style.transform = "rotateX(20deg)";
        osc.frequency.value = 369.88;
        lfo.frequency.value = 377.11/LFOD;
        keydown();
    });
    document.getElementById("F#").addEventListener("mouseup", function(){
        document.getElementById("F#").style.transform = "rotateX(0deg)";
        keyup();
    });
    document.getElementById("G").addEventListener("mousedown", function(){
        document.getElementById("G").style.transform = "rotateX(20deg)";
        osc.frequency.value = 392.01;
        lfo.frequency.value = 391.77/LFOD;
        keydown();
    });
    document.getElementById("G").addEventListener("mouseup", function(){
        document.getElementById("G").style.transform = "rotateX(0deg)";
        keyup();
    });
    document.getElementById("G#").addEventListener("mousedown", function(){
        document.getElementById("G#").style.transform = "rotateX(20deg)";
        osc.frequency.value = 415.33;
        lfo.frequency.value = 415.77/LFOD;
        keydown();
    });
    document.getElementById("G#").addEventListener("mouseup", function(){
        document.getElementById("G#").style.transform = "rotateX(0deg)";
        keyup();
    });
    document.getElementById("A").addEventListener("mousedown", function(){
        document.getElementById("A").style.transform = "rotateX(20deg)";
        osc.frequency.value = 440.00;
        lfo.frequency.value = 441.63/LFOD;
        keydown();
    });
    document.getElementById("A").addEventListener("mouseup", function(){
        document.getElementById("A").style.transform = "rotateX(0deg)";
        keyup();
    });
    document.getElementById("A#").addEventListener("mousedown", function(){
        document.getElementById("A#").style.transform = "rotateX(20deg)";
        osc.frequency.value = 466.16;
        lfo.frequency.value = 466.66/LFOD;
        keydown();
    });
    document.getElementById("A#").addEventListener("mouseup", function(){
        document.getElementById("A#").style.transform = "rotateX(0deg)";
        keyup();
    });
    document.getElementById("B").addEventListener("mousedown", function(){
        document.getElementById("B").style.transform = "rotateX(20deg)";
        osc.frequency.value = 493.00;
        lfo.frequency.value = 493.63/LFOD;
        keydown();
    });
    document.getElementById("B").addEventListener("mouseup", function(){
        document.getElementById("B").style.transform = "rotateX(0deg)";
        keyup();
    });
    document.getElementById("C2").addEventListener("mousedown", function(){
        document.getElementById("C2").style.transform = "rotateX(20deg)";
        osc.frequency.value = 523.25;
        lfo.frequency.value = 523.63/LFOD;
        keydown();
    });
    document.getElementById("C2").addEventListener("mouseup", function(){
        document.getElementById("C2").style.transform = "rotateX(0deg)";
        keyup();
    });
    //KEYBOUND FUNCTIONALITY
    function keyup(){
        var lights = document.getElementsByName('light');
        var totalLights = lights.length;

        for (var i=0; i<totalLights; i++) {
            //get frequencyData key
            var freqDataKey = i*11;
            //if gain is over threshold for that frequency animate light
            if (frequencyData[freqDataKey] > 200){
                //start animation on element
                lights[i].style.opacity = "1";
            } else {
                lights[i].style.opacity = "0.3";
            }
        }
        now = ctxt.currentTime;
        lfogain.gain.cancelScheduledValues( now );
        lfogain.gain.setValueAtTime(lfogain.gain.value, now );
        lfogain.gain.linearRampToValueAtTime(0 , now + DEC);
        gain.gain.cancelScheduledValues( now );
        gain.gain.setValueAtTime(gain.gain.value, now );
        gain.gain.linearRampToValueAtTime(0 , now + DEC);
        mgain.gain.cancelScheduledValues( now );
        mgain.gain.setValueAtTime(mgain.gain.value, now);
        mgain.gain.linearRampToValueAtTime(0 , now + DEC);
        update();
    };
    function keydown(){
        var lights = document.getElementsByName('light');
        var totalLights = lights.length;

        for (var i=0; i<totalLights; i++) {
            //get frequencyData key
            var freqDataKey = i*11;
            //if gain is over threshold for that frequency animate light
            if (frequencyData[freqDataKey] > 200){
                //start animation on element
                lights[i].style.opacity = "1";
            } else {
                lights[i].style.opacity = "0.3";
            }
        }
        now = ctxt.currentTime;
        convolverGain.gain = CGA;
        filter.frequency.value =  FFV;
        notch.frequency.value =  BFV;
        lfogain.gain.cancelScheduledValues( now );
        lfogain.gain.setValueAtTime(lfogain.gain.value, now );
        lfogain.gain.linearRampToValueAtTime(2, now + ATT);
        gain.gain.cancelScheduledValues( now );
        gain.gain.setValueAtTime(gain.gain.value, now );
        gain.gain.linearRampToValueAtTime(1 , now + ATT);
        mgain.gain.cancelScheduledValues( now );
        mgain.gain.setValueAtTime(mgain.gain.value, now);
        mgain.gain.linearRampToValueAtTime(.7 , now + ATT);
        update();
    };

    document.getElementById("bb").addEventListener("click", function(){
        $("#blackbar").hide(1000);
    });
    $(".lpdial").knob({
        'max':18000,
        'change' : function (v) { FFV = v; }
    });
    $(".lfodial").knob({
        'max':8,
        'min':1,
        'change' : function (v) { LFOD = v; }
    });
    $(".decaydial").knob({
        'max':5,
        'min':.25,
        'change' : function (v) { DEC = v; }
    });
    $(".attackdial").knob({
        'max':8,
        'change' : function (v) { ATT = v; }
    });
    $(".bpdial").knob({
        'max':18000,
        'min':100,
        'change' : function (v) { BFV = v; }
    });
});

