import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, Download, Upload, Trash2, Database, Music } from 'lucide-react';
import { 
  parseProgramData,
  parseCombinationData,
  parseGlobalData,
  parseSequenceData
} from '../utils/m1Parsers';

// MIDI Constants
const SYSEX_START = 0xF0;
const SYSEX_END = 0xF7;
const UNIVERSAL_SYSEX = 0x7E;
const INQUIRY_MESSAGE = 0x06;
const KORG_ID = 0x42;
const CHANNEL = 0x30;  // Global channel 0
const M1_ID = 0x19;    // From documentation

// Device inquiry message format
const DEVICE_INQUIRY = [
  SYSEX_START,       // F0 Start of SysEx
  UNIVERSAL_SYSEX,   // 7E Universal System Exclusive
  0x00,             // 00 Device ID (channel 1)
  INQUIRY_MESSAGE,   // 06 Inquiry Message
  SYSEX_END         // F7 End of SysEx
];

// Add a device inquiry function
const sendDeviceInquiry = async () => {
  if (!midiOutput) {
    setError('MIDI output not available');
    return;
  }

  console.log('Sending device inquiry:', 
    DEVICE_INQUIRY.map(b => `0x${b.toString(16).padStart(2, '0')}`));
  
  try {
    await midiOutput.send(DEVICE_INQUIRY);
  } catch (err) {
    console.error('Error sending device inquiry:', err);
    setError('Failed to send device inquiry');
  }
};

// Message types from documentation
const MSG_TYPES = {
  PROGRAM_DUMP: [0x01, 0x00],          // Program Parameter Dump
  ALL_PROGRAM_DUMP: [0x01, 0x0C],      // All Program Parameter Dump
  COMBINATION_DUMP: [0x01, 0x01],      // Combination Parameter Dump
  ALL_COMBINATION_DUMP: [0x01, 0x0D],  // All Combination Parameter Dump
  GLOBAL_DUMP: [0x01, 0x0E],          // Global Parameter Dump
  SEQUENCE_DUMP: [0x01, 0x0F],        // Sequence Data Dump
};

const DUMP_SIZES = {
  PROGRAM: 143,         // Each program is 143 bytes
  COMBINATION: 124,     // Each combination is 124 bytes
  GLOBAL: 51,          // Global parameters are 51 bytes
  SEQUENCE_HEADER: 28   // Variable size, header is 28 bytes
};

export const M1Librarian = () => {
  const [midiAccess, setMidiAccess] = useState(null);
  const [midiOutput, setMidiOutput] = useState(null);
  const [midiInput, setMidiInput] = useState(null);
  const [patches, setPatches] = useState([]);
  const [error, setError] = useState('');
  const [selectedPatchType, setSelectedPatchType] = useState('program');
  const [activeView, setActiveView] = useState('library');
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [backupProgress, setBackupProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    const loadPatches = () => {
      const savedPatches = localStorage.getItem('m1patches');
      if (savedPatches) {
        setPatches(JSON.parse(savedPatches));
      }
    };

    const initMidi = async () => {
      try {
        const access = await navigator.requestMIDIAccess({ sysex: true });
        setMidiAccess(access);
        
        const outputs = Array.from(access.outputs.values());
        const inputs = Array.from(access.inputs.values());
        
        console.log('Available MIDI outputs:', outputs.map(o => o.name));
        console.log('Available MIDI inputs:', inputs.map(i => i.name));
        
        if (outputs.length > 0) {
          setMidiOutput(outputs[0]);
          console.log('Selected MIDI output:', outputs[0].name);
        }
        if (inputs.length > 0) {
          const input = inputs[0];
          setMidiInput(input);
          console.log('Selected MIDI input:', input.name);
          input.onmidimessage = handleMIDIMessage;
        }

        // Send device inquiry once MIDI is initialized
        await sendDeviceInquiry();
        
      } catch (err) {
        console.error('MIDI initialization error:', err);
        setError('WebMIDI not supported or access denied');
      }
    };

    loadPatches();
    initMidi();

    return () => {
      if (midiInput) {
        midiInput.onmidimessage = null;
      }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('m1patches', JSON.stringify(patches));
  }, [patches]);

  const handleMIDIMessage = (event) => {
    const data = Array.from(event.data);
    
    // Log all incoming MIDI data for debugging
    console.log('Raw MIDI message:', {
      type: data[0].toString(16),
      length: data.length,
      data: data.map(b => `0x${b.toString(16).padStart(2, '0')}`),
      ascii: data.map(b => b >= 32 && b <= 126 ? String.fromCharCode(b) : '.').join('')
    });

    // Ignore Active Sensing and Timing Clock
    if (event.data[0] === 0xFE || event.data[0] === 0xF8) {
      return;
    }

    // For non-SysEx messages, just log them
    if (event.data[0] !== SYSEX_START) {
      console.log('MIDI message header:', 
        data.slice(0, 4).map(b => `0x${b.toString(16).padStart(2, '0')}`));
      return;
    }

    // Parse SysEx header
    if (data[1] === KORG_ID && data[3] === M1_ID) {
      const messageType = data[4];
      console.log('M1 message header:', 
        data.slice(0, 6).map(b => `0x${b.toString(16).padStart(2, '0')}`));
      const messageType = data[4];
      const messageData = data.slice(6, -1); // Remove header and EOX

      try {
        switch(messageType) {
          case 0x78: // Might be "ready to send"
            console.log('M1 Ready signal received');
            break;
            
          case 0x76: // Might be "dump starting"
            console.log('M1 Dump starting signal received');
            break;

          case 0x23: // DATA LOAD COMPLETED
            console.log('Data Load Completed');
            break;
            
          case 0x24: // DATA LOAD ERROR
            console.error('Data Load Error');
            setError('Data Load Error from M1');
            break;
            
          case MSG_TYPES.ALL_PROGRAM_DUMP[1]:
            console.log('Receiving Program Parameter Dump');
            handleProgramDump(messageData);
            break;
            
          case MSG_TYPES.ALL_COMBINATION_DUMP[1]:
            console.log('Receiving Combination Parameter Dump');
            handleCombinationDump(messageData);
            break;
            
          case MSG_TYPES.GLOBAL_DUMP[1]:
            console.log('Receiving Global Parameter Dump');
            handleGlobalDump(messageData);
            break;
            
          case MSG_TYPES.SEQUENCE_DUMP[1]:
            console.log('Receiving Sequence Data Dump');
            handleSequenceDump(messageData);
            break;
            
          default:
            console.log('Unknown message type:', messageType);
        }
      } catch (err) {
        console.error('Error processing MIDI message:', err);
        setError('Error processing MIDI data');
      }
    }
  };

  const handleProgramDump = (data) => {
    const programCount = Math.floor(data.length / DUMP_SIZES.PROGRAM);
    console.log(`Processing ${programCount} programs`);
    
    for(let i = 0; i < programCount; i++) {
      const start = i * DUMP_SIZES.PROGRAM;
      const programData = data.slice(start, start + DUMP_SIZES.PROGRAM);
      const parsedProgram = parseProgramData(programData);
      
      const newPatch = {
        id: Date.now() + i,
        type: 'program',
        number: i,
        data: programData,
        parsedData: parsedProgram,
        name: parsedProgram.name || `Program ${i}`,
        timestamp: new Date().toISOString()
      };
      
      setPatches(prev => [...prev, newPatch]);
      setBackupProgress(prev => ({
        ...prev,
        current: i + 1
      }));
    }
  };

  const handleCombinationDump = (data) => {
    const combiCount = Math.floor(data.length / DUMP_SIZES.COMBINATION);
    console.log(`Processing ${combiCount} combinations`);
    
    for(let i = 0; i < combiCount; i++) {
      const start = i * DUMP_SIZES.COMBINATION;
      const combiData = data.slice(start, start + DUMP_SIZES.COMBINATION);
      const parsedCombi = parseCombinationData(combiData);
      
      const newPatch = {
        id: Date.now() + i,
        type: 'combination',
        number: i,
        data: combiData,
        parsedData: parsedCombi,
        name: parsedCombi.name || `Combination ${i}`,
        timestamp: new Date().toISOString()
      };
      
      setPatches(prev => [...prev, newPatch]);
    }
  };

  const handleGlobalDump = (data) => {
    if (data.length !== DUMP_SIZES.GLOBAL) {
      console.error('Invalid global data size');
      return;
    }

    const parsedGlobal = parseGlobalData(data);
    const newPatch = {
      id: Date.now(),
      type: 'global',
      data: data,
      parsedData: parsedGlobal,
      name: 'Global Settings',
      timestamp: new Date().toISOString()
    };
    
    setPatches(prev => [...prev, newPatch]);
  };

  const handleSequenceDump = (data) => {
    const parsedSequence = parseSequenceData(data);
    const newPatch = {
      id: Date.now(),
      type: 'sequence',
      data: data,
      parsedData: parsedSequence,
      name: parsedSequence.name || 'Sequence Data',
      timestamp: new Date().toISOString()
    };
    
    setPatches(prev => [...prev, newPatch]);
  };

  const requestPatch = async () => {
    if (!midiOutput || !midiInput) {
      setError('MIDI device not connected');
      return;
    }

    const sysex = new Uint8Array([
      SYSEX_START,
      KORG_ID,
      CHANNEL,
      M1_ID,
      ...MSG_TYPES[`${selectedPatchType.toUpperCase()}_DUMP`],
      0x00,  // Bank number
      SYSEX_END
    ]);

    console.log('Sending MIDI SysEx:', 
      Array.from(sysex).map(b => `0x${b.toString(16).padStart(2, '0')}`));
    
    try {
      await midiOutput.send(sysex);
      console.log('SysEx message sent successfully');
    } catch (err) {
      console.error('Error sending MIDI message:', err);
      setError('Failed to send MIDI message');
    }
  };

  const startBulkBackup = async () => {
    if (!midiOutput || !midiInput) {
      setError('MIDI device not connected');
      return;
    }

    setBackupInProgress(true);
    setBackupProgress({ current: 0, total: 100 });

    try {
      // Request all program parameters
      const sysex = new Uint8Array([
        SYSEX_START,
        KORG_ID,
        CHANNEL,
        M1_ID,
        ...MSG_TYPES.ALL_PROGRAM_DUMP,
        0x00,   // Bank 0
        SYSEX_END
      ]);

      console.log('Sending ALL PROGRAM PARAMETER DUMP request:', 
        Array.from(sysex).map(b => `0x${b.toString(16).padStart(2, '0')}`));
      
      await midiOutput.send(sysex);
      console.log('Waiting for M1 response...');

    } catch (err) {
      console.error('Error during backup process:', err);
      setError('Error during backup process');
    } finally {
      setBackupInProgress(false);
    }
  };

  const playTestPattern = async () => {
    if (!midiOutput) {
      setError('MIDI output not available');
      return;
    }

    const NOTE_ON = 0x90;  // Note On channel 1
    const NOTE_OFF = 0x80;  // Note Off channel 1
    const VELOCITY = 100;

    const pattern = [
      { note: 60, duration: 200 }, // Middle C
      { note: 64, duration: 200 }, // E
      { note: 67, duration: 200 }, // G
      { note: 72, duration: 400 }, // High C
    ];

    try {
      for (const { note, duration } of pattern) {
        midiOutput.send([NOTE_ON, note, VELOCITY]);
        console.log('Note On:', note);
        
        await new Promise(resolve => setTimeout(resolve, duration));
        
        midiOutput.send([NOTE_OFF, note, 0]);
        console.log('Note Off:', note);
        
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (err) {
      console.error('Error playing test pattern:', err);
      setError('Failed to send MIDI notes');
    }
  };

  const sendPatch = (patch) => {
    if (!midiOutput) {
      setError('MIDI output not available');
      return;
    }

    // Convert patch data to sysex format and send
    midiOutput.send(patch.data);
  };

  const deletePatch = (patchId) => {
    setPatches(patches.filter(patch => patch.id !== patchId));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Korg M1 Patch Manager</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="flex space-x-4">
            <Button
              onClick={() => setSelectedPatchType('program')}
              variant={selectedPatchType === 'program' ? 'default' : 'outline'}
            >
              Programs
            </Button>
            <Button
              onClick={() => setSelectedPatchType('combination')}
              variant={selectedPatchType === 'combination' ? 'default' : 'outline'}
            >
              Combinations
            </Button>
            <Button
              onClick={() => setSelectedPatchType('sequence')}
              variant={selectedPatchType === 'sequence' ? 'default' : 'outline'}
            >
              Songs
            </Button>
          </div>

          <div className="flex space-x-4">
            <Button 
              onClick={requestPatch} 
              className="flex items-center space-x-2"
              disabled={backupInProgress}
            >
              <Download className="w-4 h-4" />
              <span>Request Current Patch</span>
            </Button>
            <Button
              onClick={startBulkBackup}
              className="flex items-center space-x-2"
              disabled={backupInProgress}
            >
              <Save className="w-4 h-4" />
              <span>Backup All Patches</span>
            </Button>
            <Button
              onClick={playTestPattern}
              className="flex items-center space-x-2"
            >
              <Music className="w-4 h-4" />
              <span>Test MIDI</span>
            </Button>
          </div>

          {backupInProgress && (
            <div className="mt-4">
              <div className="text-sm text-muted-foreground">
                Backing up patches: {backupProgress.current} / {backupProgress.total}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                <div 
                  className="bg-primary h-2.5 rounded-full" 
                  style={{ width: `${(backupProgress.current / backupProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="flex space-x-4 mt-8 mb-4">
            <Button
              variant={activeView === 'library' ? 'default' : 'outline'}
              onClick={() => setActiveView('library')}
              className="flex items-center space-x-2"
            >
              <Database className="w-4 h-4" />
              <span>My Library</span>
            </Button>
            <Button
              variant={activeView === 'browser' ? 'default' : 'outline'}
              onClick={() => setActiveView('browser')}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Patch Browser</span>
            </Button>
          </div>

          {activeView === 'browser' ? (
            <PatchBrowser 
              onSendPatch={sendPatch}
              selectedPatchType={selectedPatchType}
            />
          ) : (
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Stored Patches</h3>
              <div className="space-y-2">
                {patches
                  .filter(patch => patch.type === selectedPatchType)
                  .map(patch => (
                    <div 
                      key={patch.id}
                      className="flex items-center justify-between p-2 bg-gray-100 rounded"
                    >
                      <span>
                        {patch.name || `${patch.type} - ${new Date(patch.timestamp).toLocaleString()}`}
                      </span>
                      <div className="space-x-2">
                        <Button
                          size="sm"
                          onClick={() => sendPatch(patch)}
                          className="flex items-center space-x-1"
                        >
                          <Upload className="w-4 h-4" />
                          <span>Send</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deletePatch(patch.id)}
                          className="flex items-center space-x-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default M1Librarian;
