window.AudioContext = window.AudioContext || window.webkitAudioContext;
let ctx;
let osc1;
let osc2;
let osc1Gain;
let osc2Gain;
let osc1Filter;
let channelMerger;
let mix1Gain = 0.5;
let mix2Gain = 0.5;
let currentVelocity;
let octave = 0;
let isMouseDown = false;
let currentKey = null; 

const keys = document.getElementsByClassName('keys');
const overlay = document.getElementById('overlay');
const popup = document.getElementById('popup');
const startButton = document.getElementById('start-button');
const filterSlider = document.getElementById('filter');
const resSlider = document.getElementById('resonance');
const waveform1Select = document.getElementById('waveform1-select');
const waveform2Select = document.getElementById('waveform2-select');
const mixSlider = document.getElementById('mix-slider');
const leftArrow = document.getElementById('left-arrow');
const rightArrow = document.getElementById('right-arrow');
const octaveDisplay = document.getElementById('octave-display');

resSlider.defaultValue = 1;


const midiToFreq = (number) => {
    // returns a frequency from the midi pitch command
    const a = 440;
    return (a / 32) * (2 ** ((number - 9) / 12));
}

const initSynth = () => {
    overlay.classList.remove('active');
    popup.classList.remove('active');
    ctx = new AudioContext();
    // creates oscilators
    osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2 = ctx.createOscillator();
    osc2.type = 'sawtooth';
    // creates gains
    osc1Gain = ctx.createGain();
    osc1Gain.gain.value = 0;
    osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0;
    // creates filter
    osc1Filter = ctx.createBiquadFilter();
    osc1Filter.type = 'lowpass';
    osc1Filter.frequency.value = 22000;
    // routing
    //channelMerger = ctx.createChannelMerger();
    osc1.connect(osc1Gain);
    osc2.connect(osc2Gain);
    osc1Gain.connect(osc1Filter);
    osc2Gain.connect(osc1Filter);
    osc1Filter.connect(ctx.destination);
    
    // start the oscilator
    osc1.start();
    osc2.start();
}

const filterChange = () => {
    if (osc1Filter) {
        osc1Filter.frequency.value = filterSlider.value;
    }
}

const resChange = () => {
    if (osc1Filter) {
        osc1Filter.Q.value = resSlider.value;
    }
}

const waveChange1 = () => {
    if (osc1) {
        osc1.type = waveform1Select.value;
    }
}

const waveChange2 = () => {
    if (osc2) {
        osc2.type = waveform2Select.value;
    }
}

startButton.addEventListener('click', initSynth);

const failure = () => {
    console.log("failed");
}

const success = (midiAccess) => {
    // connection to midi from the browser was successfull 
    midiAccess.addEventListener('statechange', updateDevices);

    // assigns an event listener to each input
    const inputs = midiAccess.inputs;
    inputs.forEach(input => {
        input.addEventListener('midimessage', handleInput)
    });
}

if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then(success, failure);
}

const handleInput = (input) => {
    // gets info from the midi input
    const command = input.data[0];
    const note = input.data[1];
    const velocity = input.data[2];

    if (command === 144 && velocity > 0) {
        noteOn(note, velocity);
    } else if (command === 128 || velocity === 0 ) {
        noteOff(note);
    }
}

const noteOn = (note, velocity) => { 
    currentVelocity = velocity / 127; 
    let octaveShift = octave * 12;
    osc1.frequency.value = midiToFreq(note + octaveShift);
    osc1Gain.gain.value = currentVelocity * mix1Gain;
    osc2.frequency.value = midiToFreq(note + octaveShift);
    osc2Gain.gain.value = currentVelocity * mix2Gain;
}

const noteOff = (note) => {
    const freq = midiToFreq(note + (octave * 12));

    // the if statement ensures that if i lift a key that is not played, the playing note wont stop
    if (Math.ceil(freq) === Math.ceil(osc1.frequency.value)) {
    osc1Gain.gain.value = 0;
    osc2Gain.gain.value = 0;
    }
}


const updateDevices = (event) => {
    console.log(`Name: ${event.port.name}, Brand: ${event.port.manufacturer}, State: ${event.port.state},  Type: ${event.port.type}`);
}

filterSlider.addEventListener('input', filterChange);
resSlider.addEventListener('input', resChange);
waveform1Select.addEventListener('change', waveChange1);
waveform2Select.addEventListener('change', waveChange2);
rightArrow.addEventListener('click', () => {
    octave += 1;
    octaveDisplay.innerHTML = octave;
})
leftArrow.addEventListener('click', () => {
    octave -= 1;
    octaveDisplay.innerHTML = octave;
})
mixSlider.addEventListener('input', () => {
    //gets the mix state and then updates the oscilators mix in real time
    mix1Gain = 1 - mixSlider.value;
    mix2Gain = mixSlider.value;
    if (osc1Gain.gain.value > 0 || osc2Gain.gain.value > 0) {
        osc1Gain.gain.value = currentVelocity * mix1Gain;
        osc2Gain.gain.value = currentVelocity * mix2Gain; 
    }
})

// this section is for clickable keys

for (let i = 0; i < keys.length; i++) {
    keys[i].addEventListener('mousedown', () => {
        isMouseDown = true;
        currentKey = i + 48;
        noteOn(currentKey, 120);
        keys[i].classList.add('pressed');
    });
    keys[i].addEventListener('mouseup', () => {
        isMouseDown = false;
        noteOff(i + 48);
        keys[i].classList.remove('pressed');
    });
    keys[i].addEventListener('mousemove', () => {
        if (isMouseDown && currentKey !== i + 48) {
            noteOff(currentKey);
            currentKey = i + 48;
            noteOn(currentKey, 120);
            keys[i].classList.add('pressed');
        }
    });
    keys[i].addEventListener('mouseleave', () => {
        if (isMouseDown) {
            isMouseDown = false;
            noteOff(currentKey);
            keys[i].classList.remove('pressed');
        }
    });
}

//this section is for keyboard

const keyToMidi = (input) => {
    let N = 48;
  switch (input) {
    default:
    case "A":
      N += 0;
      break;
    case "W":
      N += 1;
      break;
    case "S":
      N += 2;
      break;
    case "E":
      N += 3;
      break;
    case "D":
      N += 4;
      break;
    case "F":
      N += 5;
      break;
    case "T":
      N += 6;
      break;
    case "G":
      N += 7;
      break;
    case "Y":
      N += 8;
      break;
    case "H":
      N += 9;
      break;
    case "U":
      N += 10;
      break;
    case "J":
      N += 11;
      break;
      case "K":
        N +=12;
        break;
        case "O":
        N +=13;
        break;
        case "L":
        N +=14;
        break;
        case "P":
        N +=15;
        break;
        case ";":
        N +=16;
        break;
  }
  return N;
}

document.addEventListener('keydown', (e) => {
    const capLetter = e.key.toUpperCase()
    document.getElementById(capLetter).classList.add('pressed');
    const newMidi = keyToMidi(capLetter);
    noteOn(newMidi, 120);
})

document.addEventListener('keyup', (e) => {
    const capLetter = e.key.toUpperCase()
    document.getElementById(capLetter).classList.remove('pressed');
    const newMidi = keyToMidi(capLetter);
    noteOff(newMidi, 120);
})
