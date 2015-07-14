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
BFV = 1500; //NOTCH FILTER FREQUENCY
DEC = 1; //DECAY
ATT = 1; //ATTACK
BITS = 1; //BITCRUSHER
FVO = .5; //FINAL VOLUME
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
    //Key constructor
    function KeyCon(key, note, high_value, low_value) {
        this.keyv = key;
        this.note = note;
        this.high_value = high_value;
        this.low_value = low_value;
    }
    //Array of our Keys
    var pianoKeys = [
        new KeyCon ('q','C',261.63,260.99),
        new KeyCon ('2','C#',277.18,277.77),
        new KeyCon ('w','D',293.66,294.11),
        new KeyCon ('3','D#',311.13,310.77),
        new KeyCon ('e','E',329.63,329.99),
        new KeyCon ('r','F',349.23,348.99),
        new KeyCon ('5','F#',369.88,368.88),
        new KeyCon ('t','G',392.01,391.77),
        new KeyCon ('6','G#',415.33,415.77),
        new KeyCon ('y','A',440.00,441.63),
        new KeyCon ('7','A#',466.16,466.66),
        new KeyCon ('u','B',493.00,493.63),
        new KeyCon ('i','C2',523.25,523.63)
    ];
    //Key Binds
    function BindKeys() {
        var i = 0
        do {

            var setValues = function() {
                document.getElementById(this.note).style.transform = "rotateX(20deg)";
                osc.frequency.value = this.high_value;
                lfo.frequency.value = this.low_value;
                keydown();
            };
            var anonfn = setValues.bind(pianoKeys[i]);

            Mousetrap.bind(pianoKeys[i].keyv, anonfn);
            var rest = function() {
                document.getElementById(this.note).style.transform = "rotateX(0deg)";
                keyup();
            };
            var anonf = rest.bind(pianoKeys[i]);
            Mousetrap.bind(pianoKeys[i].keyv, anonf, 'keyup');

            i++;
        } while (i<13);
    }
    //Click Binds
    function BindClicks() {
        var i = 0
        do {
            var clickValues = function() {
                document.getElementById(this.note).style.transform = "rotateX(20deg)";
                osc.frequency.value = this.high_value;
                lfo.frequency.value = this.low_value;
                keydown();
            };
            var anonfunc = clickValues.bind(pianoKeys[i]);
            document.getElementById(pianoKeys[i].note).addEventListener("mousedown", anonfunc);
            var anonym = function() {
                document.getElementById(this.note).style.transform = "rotateX(0deg)";
                keyup();
            };
            var reset = anonym.bind(pianoKeys[i]);
            document.getElementById(pianoKeys[i].note).addEventListener("mouseup", reset);
            i++;
        } while (i<13);
    }
    BindClicks();
    BindKeys();
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
    drive.curve = makeDistortionCurve(900);
    drive.oversample = '2x';
    //filter for the drive
    var driveFilter = ctxt.createBiquadFilter();
    driveFilter.type = 'allpass';
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

    var volume = ctxt.createGain();

    //DEFINE NODE CONNECTIONS
    osc.connect(drive);
    drive.connect(gain);
    lfo.connect(lfogain);
    lfogain.connect(driveFilter);
    gain.connect(driveFilter);
    driveFilter.connect(driveCompressor);
    mgain.connect(driveCompressor);
    driveFilter.connect(filter);
    driveFilter.connect(notch);
    filter.connect(driveCompressor);
    notch.connect(driveCompressor);
    gain.connect(analyser);
    lfo.connect(analyser);
    driveFilter.connect(node);
    node.connect(mgain);
    mgain.connect(driveCompressor);
    driveFilter.connect(convolver);
    convolver.connect(convolverGain);
    convolverGain.connect(driveCompressor);
    driveCompressor.connect(volume);
    volume.connect(ctxt.destination);
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
        lfo.frequency.value = lfo.frequency.value/LFOD;
        now = ctxt.currentTime;
        volume.gain.value = FVO;
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
    $(".volumedial").knob({
        'max':1,
        'min':0,
        'change' : function (v) { FVO = v; }
    });
});