import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, Download, Upload, Trash2, Database, Music } from 'lucide-react';

// MIDI Constants
const SYSEX_START = 0xF0;
const SYSEX_END = 0xF7;
const KORG_ID = 0x42;
const CHANNEL = 0x30;  // Global channel 0
const M1_ID = 0x19;    // From documentation

// Message Types
const MSG_TYPES = {
  READY: 0x78,
  DUMP_START: 0x76,
  COMPLETED: 0x23,
  ERROR: 0x24,
  PARAMETER_CHANGE: 0x4E,
  DATA_DUMP: 0x50,
  ALL_PROGRAM_DUMP: [0x01, 0x0C],
  ALL_COMBINATION_DUMP: [0x01, 0x0D],
  GLOBAL_DUMP: [0x01, 0x0E],
  SEQUENCE_DUMP: [0x01, 0x0F]
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
    
    // Ignore Active Sensing and Timing Clock
    if (event.data[0] === 0xFE || event.data[0] === 0xF8) {
      return;
    }

    // For non-SysEx messages, just log them
    if (event.data[0] !== SYSEX_START) {
      console.log('MIDI message:', 
        data.slice(0, 4).map(b => `0x${b.toString(16).padStart(2, '0')}`));
      return;
    }

    // Parse SysEx header for M1 messages
    if (data[1] === KORG_ID && data[3] === M1_ID) {
      const msgType = data[4];
      const cmdByte = data[5]; // Additional command byte
      
      console.log('M1 message:', {
        type: `0x${msgType.toString(16)}`,
        command: `0x${cmdByte.toString(16)}`,
        header: data.slice(0, 6).map(b => `0x${b.toString(16).padStart(2, '0')}`),
        length: data.length
      });

      switch(msgType) {
        case MSG_TYPES.READY:
          console.log('M1 Ready signal received');
          break;
          
        case MSG_TYPES.DUMP_START:
          console.log('M1 Dump starting signal received');
          break;

        case MSG_TYPES.COMPLETED:
          console.log('Data Load Completed');
          break;
          
        case MSG_TYPES.ERROR:
          console.error('Data Load Error');
          setError('Data Load Error from M1');
          break;

        case MSG_TYPES.PARAMETER_CHANGE:
          console.log('Parameter Change:', data.slice(6, -1));
          break;

        case MSG_TYPES.DATA_DUMP:
          console.log('Data Dump:', {
            command: `0x${cmdByte.toString(16)}`,
            length: data.length - 7  // Subtract header and EOX
          });
          
          // Add a small delay before processing
          setTimeout(() => {
            handleProgramDump(data.slice(6, -1));
          }, 100);
          break;
          
        case MSG_TYPES.ALL_PROGRAM_DUMP[1]:
          console.log('Receiving Program Parameter Dump');
          handleProgramDump(data.slice(6, -1));
          break;
          
        case MSG_TYPES.ALL_COMBINATION_DUMP[1]:
          console.log('Receiving Combination Parameter Dump');
          handleCombinationDump(data.slice(6, -1));
          break;
          
        case MSG_TYPES.GLOBAL_DUMP[1]:
          console.log('Receiving Global Parameter Dump');
          handleGlobalDump(data.slice(6, -1));
          break;
          
        case MSG_TYPES.SEQUENCE_DUMP[1]:
          console.log('Receiving Sequence Data Dump');
          handleSequenceDump(data.slice(6, -1));
          break;
          
        default:
          console.log(`Unknown message type: 0x${msgType.toString(16)}`);
      }
    }
  };

  const handleProgramDump = (data) => {
    // M1 program is 143 bytes
    const PROGRAM_SIZE = 143;
    const programCount = Math.floor(data.length / PROGRAM_SIZE);
    console.log(`Processing ${programCount} programs`);
    
    // Create array of all patches before updating state
    const newPatches = [];
    
    for(let i = 0; i < programCount; i++) {
      const start = i * PROGRAM_SIZE;
      const programData = data.slice(start, start + PROGRAM_SIZE);
      
      // Extract program name (first 10 bytes)
      const nameBytes = [...programData.slice(0, 7), ...programData.slice(9, 12)];
      const name = String.fromCharCode(
        ...nameBytes.filter(b => b >= 32 && b <= 126)
      ).trim();
      
      newPatches.push({
        id: `program-${i}-${Date.now()}`,  // Make sure IDs are unique
        type: 'program',
        number: i,
        data: Array.from(programData),
        name: name || `Program ${i + 1}`,
        timestamp: new Date().toISOString()
      });
    }

    // Update state once with all new patches
    setPatches(prev => [...prev, ...newPatches]);
    
    // Update progress
    setBackupProgress({
      current: programCount,
      total: programCount
    });
  };

  const handleCombinationDump = (data) => {
    const combiCount = Math.floor(data.length / 124); // 124 bytes per combination
    console.log(`Processing ${combiCount} combinations`);
    
    for(let i = 0; i < combiCount; i++) {
      const start = i * 124;
      const combiData = data.slice(start, start + 124);
      
      // Extract combination name (first 10 bytes)
      const name = String.fromCharCode(
        ...combiData.slice(0, 10)
          .filter(b => b >= 32 && b <= 126)
      ).trim();
      
      const newPatch = {
        id: Date.now() + i,
        type: 'combination',
        number: i,
        data: Array.from(combiData),
        name: name || `Combination ${i}`,
        timestamp: new Date().toISOString()
      };
      
      setPatches(prev => [...prev, newPatch]);
    }
  };

  const requestPatch = async () => {
    if (!midiOutput || !midiInput) {
      setError('MIDI device not connected');
      return;
    }

    const msgType = selectedPatchType === 'program' ? MSG_TYPES.ALL_PROGRAM_DUMP :
                   selectedPatchType === 'combination' ? MSG_TYPES.ALL_COMBINATION_DUMP :
                   MSG_TYPES.SEQUENCE_DUMP;

    const sysex = new Uint8Array([
      SYSEX_START,
      KORG_ID,
      CHANNEL,
      M1_ID,
      ...msgType,
      0x00,  // Bank
      SYSEX_END
    ]);

    console.log('Sending request:', 
      Array.from(sysex).map(b => `0x${b.toString(16).padStart(2, '0')}`));
    
    try {
      await midiOutput.send(sysex);
      console.log('Request sent successfully');
    } catch (err) {
      console.error('Error sending request:', err);
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
      const sysex = new Uint8Array([
        SYSEX_START,
        KORG_ID,
        CHANNEL,
        M1_ID,
        ...MSG_TYPES.ALL_PROGRAM_DUMP,
        0x00,   // Bank
        SYSEX_END
      ]);

      console.log('Sending backup request:', 
        Array.from(sysex).map(b => `0x${b.toString(16).padStart(2, '0')}`));
      
      await midiOutput.send(sysex);
      console.log('Waiting for M1 response...');

    } catch (err) {
      console.error('Error during backup:', err);
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

    const NOTE_ON = 0x90;  // Channel 1
    const NOTE_OFF = 0x80;
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
        </div>
      </CardContent>
    </Card>
  );
};

export default M1Librarian;
