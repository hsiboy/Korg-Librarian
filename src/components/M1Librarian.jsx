import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, Download, Upload, Trash2, Database, Music } from 'lucide-react';
import M1Debug from './M1Debug';
import M1ProtocolTest from './M1ProtocolTest';
import M1ProgramDump from './M1ProgramDump';

import { 
  parseProgramData,
  parseCombinationData,
  parseGlobalData,
  parseSequenceData
} from '../utils/M1Parsers';

// MIDI Constants
const SYSEX_START = 0xF0;
const SYSEX_END = 0xF7;
const UNIVERSAL_SYSEX = 0x7E;
const INQUIRY_MESSAGE = 0x06;
const KORG_ID = 0x42;
const CHANNEL = 0x31;  // Global channel 0
const M1_ID = 0x19;    // From documentation
const DEVICE_ID_ALL = 0x7F;  // Will make any device respond
const INQUIRY_REQUEST = 0x01;
const INQUIRY_RESPONSE = 0x02;

/*
The format of the inquiry message is as follows:

F0 7E <device ID> 06 01 F7 

      F0 7E <device ID>   Universal System Exclusive Non-real time header 
      06                  General Information (sub-ID#1) 
      01                  Identity Request (sub-ID#2) 
      F7                  EOX 

      -- Note: If <device ID> = 7FH then the device should respond regardless of what <device ID> it is set to.

      */

// Device inquiry message format
const DEVICE_INQUIRY = [
  SYSEX_START,       // F0 Start of SysEx
  UNIVERSAL_SYSEX,   // 7E Universal System Exclusive
  DEVICE_ID_ALL,     // All devices should respond
  INQUIRY_MESSAGE,   // 06 Inquiry Message
  INQUIRY_REQUEST,   // identity request
  SYSEX_END          // F7 End of SysEx
];

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
  const [isM1Detected, setIsM1Detected] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);

  useEffect(() => {
    const loadPatches = () => {
      const savedPatches = localStorage.getItem('m1patches');
      if (savedPatches) {
        setPatches(JSON.parse(savedPatches));
      }
    };
      const initMidi = async () => {
          console.log('Initializing MIDI...');
          try {
              const access = await navigator.requestMIDIAccess({ sysex: true });
              setMidiAccess(access);
              
              const outputs = Array.from(access.outputs.values());
              const inputs = Array.from(access.inputs.values());
              
              console.log(`Found ${outputs.length} MIDI outputs:`, outputs.map(o => o.name));
              console.log(`Found ${inputs.length} MIDI inputs:`, inputs.map(i => i.name));
              
              // Set up ports only if not already set
              if (!midiOutput && outputs.length > 0) {
                  console.log('Setting MIDI output:', outputs[0].name);
                  setMidiOutput(outputs[0]);
              }
              if (!midiInput && inputs.length > 0) {
                  console.log('Setting MIDI input:', inputs[0].name);
                  const input = inputs[0];
                  setMidiInput(input);
                  input.onmidimessage = handleMIDIMessage;
              }
  
              // Handle state changes
              access.onstatechange = (e) => {
                  const { port } = e;
                  console.log(`MIDI port ${port.state}: ${port.type} - ${port.name}`);
              };
              
          } catch (err) {
              console.error('MIDI initialization error:', err);
          }
      };
  
      initMidi();
  
      // Cleanup
      return () => {
          if (midiInput) {
              midiInput.onmidimessage = null;
          }
      };
    
  }, []);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    let retryTimer;

    const tryDeviceInquiry = async () => {
        if (!midiOutput) return;

        console.log('Sending device inquiry...');
        try {
            await midiOutput.send(DEVICE_INQUIRY);
            retryCount++;
            
            // Set up retry if we haven't hit max and haven't detected an M1
            if (retryCount < maxRetries && !isM1Detected) {
                retryTimer = setTimeout(tryDeviceInquiry, 1000);
            }
        } catch (err) {
            console.error('Error sending device inquiry:', err);
        }
    };

    if (midiOutput) {
        tryDeviceInquiry();
    }

    // Cleanup
    return () => {
        if (retryTimer) clearTimeout(retryTimer);
    };
}, [midiOutput, isM1Detected]);



  useEffect(() => {
    localStorage.setItem('m1patches', JSON.stringify(patches));
  }, [patches]);

  const handleMIDIMessage = (event) => {
    const data = Array.from(event.data);
    if (event.data[0] === 0xFE) {  // Active Sensing
      return;  // Ignore these messages completely
  }
    /*
        console.log('Raw MIDI message:', {  // <-- This is logging before the filter
        type: data[0].toString(16),
        length: data.length,
        data: Array.from(data),
        ascii: data.map(b => b >= 32 && b <= 126 ? String.fromCharCode(b) : '.').join('')
    });
    */
      console.log('MIDI message received:', 
      data.map(b => `0x${b.toString(16).padStart(2, '0')}`));

    // For non-SysEx messages, just log them
    if (event.data[0] !== SYSEX_START) {
      console.log('MIDI message header:', 
        data.slice(0, 4).map(b => `0x${b.toString(16).padStart(2, '0')}`));
      return;
    }

    // Handle device inquiry response
    if (data[1] === UNIVERSAL_SYSEX && data[3] === INQUIRY_MESSAGE && data[4] === INQUIRY_RESPONSE) {
      const info = {
          manufacturer: data[5],                    // Manufacturer ID (0x42 = Korg)
          deviceFamily: (data[7] << 7) | data[6],   // 14 bits, LSB first
          deviceMember: (data[9] << 7) | data[8],   // 14 bits, LSB first
          softwareVersion: data[10]                 // 1st byte holds int
      };
  
      const isKorgM1 = info.manufacturer === 0x42 && 
                       info.deviceFamily === 0x19;
  
      console.log('Device Inquiry Response:', {
          manufacturer: info.manufacturer === 0x42 ? 'Korg' : 'Unknown',
          deviceFamily: `0x${info.deviceFamily.toString(16)}`,
          deviceMember: `0x${info.deviceMember.toString(16)}`,
          softwareVersion: Array.from(info.softwareVersion)
              .map(b => b.toString(16).padStart(2, '0'))
              .join('.')
      });
  
      setDeviceInfo(info);
      setIsM1Detected(isKorgM1);
  }

    // Parse SysEx header
    if (data[1] === KORG_ID && data[3] === M1_ID) {
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

          case 0x26: // Status/Acknowledgment
            console.log('M1 Status/Acknowledgment received');
            // Let's try immediately following up with another request
            if (lastRequestType === 'program') {
                console.log('Sending follow-up program request...');
                // Send another message after acknowledgment
                setTimeout(() => {
                    midiOutput.send(new Uint8Array([
                        SYSEX_START,
                        KORG_ID,
                        0x30,      // Global channel
                        M1_ID,
                        0x10,      // Program dump request
                        0x00,      // Program number
                        0x00,      // Bank
                        SYSEX_END
                    ]));
                }, 100);
            }
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
      SYSEX_START,  // F0
      KORG_ID,      // 42
      0x31,         // Channel 1
      M1_ID,        // 19
      0x00,         // 0001 0000 split across
      0x01,         // these two bytes
      0x00,
      0x00,
      SYSEX_END     // F7
  ]);
/*
    const sysex = new Uint8Array([
        SYSEX_START,  // F0
        KORG_ID,      // 42
        CHANNEL,      // 30
        M1_ID,        // 19
        0x01,         // Program Parameter Dump Request
        0x00,
        0x00,         // Program number
        SYSEX_END     // F7
    ]);
*/

    console.log('Requesting patch:', Array.from(sysex).map(b => `0x${b.toString(16)}`));
    await midiOutput.send(sysex);
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

        {/* Connection Status */}
        <div className="mb-4 p-4 bg-gray-100 rounded">
          <h3 className="font-semibold mb-2">Connection Status</h3>
          <div className="text-sm space-y-1">
            {!midiOutput ? (
              <p className="text-yellow-600">⚠ No MIDI Interface Connected</p>
            ) : !deviceInfo ? (
              <p>Detecting device...</p>
            ) : (
              <>
               <ul>
               <li>Manufacturer: {deviceInfo.manufacturer === 0x42 ? 'Korg' : 'Unknown'}</li>
               <li>Device Family: {isM1Detected ? 'M1' : `Unknown (0x${deviceInfo.deviceFamily.toString(16)})`}</li>
               <li>Member Code: {`0x${deviceInfo.deviceMember.toString(16)}`}</li>
               <li>Software Version: #{deviceInfo.softwareVersion.toString(16)}</li>
               </ul>
              </>
            )}
          </div>
        </div>

        {/* Debug Tools - only show if M1 detected */}
{isM1Detected && (
  <div className="mb-4">
    <M1Debug midiOutput={midiOutput} midiInput={midiInput} />
    <M1ProtocolTest midiOutput={midiOutput} midiInput={midiInput} />
    <M1ProgramDump midiOutput={midiOutput} midiInput={midiInput} />
  </div>
)}

        <div className="space-y-4">
          {/* Basic MIDI test - always available if MIDI connected */}
          <div className="flex space-x-4">
            <Button
              onClick={playTestPattern}
              className="flex items-center space-x-2"
              disabled={!midiOutput}
            >
              <Music className="w-4 h-4" />
              <span>Test MIDI</span>
            </Button>
          </div>

          {/* M1-specific features - only show if M1 detected */}
          {isM1Detected && (
            <>
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
              </div>

              {/* Progress indicator */}
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

              {/* Patch list */}
              {patches.length > 0 && (
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
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default M1Librarian;
