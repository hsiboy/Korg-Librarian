// Utility functions for parsing M1 data formats

// Common utility functions
const parseNameBytes = (bytes) => {
  return bytes
    .map(b => b >= 32 && b <= 126 ? String.fromCharCode(b) : ' ')
    .join('').trim();
};

// Program Parameter Parser (Table 1)
export const parseProgramData = (data) => {
  // First 10 bytes contain the program name (HEAD + TAIL)
  const nameBytes = [...data.slice(0, 7), ...data.slice(9, 12)];
  const name = parseNameBytes(nameBytes);

  return {
    name,
    // Oscillator
    oscillator: {
      mode: data[10] & 0x03,
      sync: (data[11] >> 7) & 0x01,
      osc1: {
        multisound: data[12],
        octave: data[13]
      },
      osc2: {
        multisound: data[14],
        octave: data[15]
      }
    },
    // VDF (Variable Digital Filter)
    vdf: {
      cutoff: data[71],
      kbd_track: {
        center: data[72],
        intensity: data[74]
      },
      eg: {
        intensity: data[75],
        velocity: data[76]
      }
    },
    // Envelope
    envelope: {
      attack: { 
        time: data[64],
        level: data[65] 
      },
      decay: { 
        time: data[66] 
      },
      release: { 
        time: data[67],
        level: data[68] 
      }
    }
  };
};

// Combination Parameter Parser (Table 2)
export const parseCombinationData = (data) => {
  // Parse combination name (HEAD + TAIL)
  const nameBytes = [...data.slice(0, 7), ...data.slice(9, 12)];
  const name = parseNameBytes(nameBytes);

  // Parse timbres (up to 8 timbres)
  const timbres = [];
  for(let i = 0; i < 8; i++) {
    const baseOffset = 36 + (i * 10); // Each timbre block is 10 bytes
    timbres.push({
      program: data[baseOffset],
      output_level: data[baseOffset + 1],
      key_transpose: data[baseOffset + 2],
      detune: data[baseOffset + 3],
      pan: data[baseOffset + 4]
    });
  }

  return {
    name,
    type: data[10], // Combination type
    timbres,
    effect: {
      type: data[11],
      parameters: data.slice(12, 35)
    }
  };
};

// Global Parameter Parser (Table 3)
export const parseGlobalData = (data) => {
  return {
    master: {
      tune: data[0],
      transpose: data[1]
    },
    pedals: {
      damper: data[2],
      assignable1: data[3],
      assignable2: data[4]
    },
    scale: {
      type: data[5],
      key: data[6]
    },
    user_scale: data[7],
    drum: {
      kit: data.slice(21, 27)
    }
  };
};

// Sequencer Data Parser (Table 4)
export const parseSequenceData = (data) => {
  // Parse song name if present
  const name = parseNameBytes(data.slice(20, 29));

  // Parse track data
  const tracks = [];
  const TRACK_SIZE = 5; // Each track has 5 bytes of control data
  
  for(let i = 0; i < 8; i++) {
    const offset = 56 + (i * TRACK_SIZE);
    tracks.push({
      program: data[offset],
      output_level: data[offset + 1],
      transpose: data[offset + 2],
      detune: data[offset + 3],
      pan: data[offset + 4]
    });
  }

  return {
    name,
    midi: {
      channel1: data[0] & 0x0F,
      channel2: data[7] & 0x0F
    },
    tempo: data[17],
    tracks,
    pattern: {
      beat: data[960],
      length: data[961]
    }
  };
};
