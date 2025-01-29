import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, Download, Upload, Trash2, Database, Music } from 'lucide-react';
import { PatchBrowser } from './PatchBrowser';

// MIDI Constants
const SYSEX_START = 0xF0;
const KORG_ID = 0x42;
const M1_ID = 0x1B;     // Changed from 0x20 to 0x1B per documentation
const CHANNEL = 0x30;    // Global channel 0
const DUMP_REQUEST = 0x40; // Program Parameter Dump request
const SYSEX_END = 0xF7;

// MIDI Message Types
const NOTE_ON = 0x90;  // Note On, Channel 1
const NOTE_OFF = 0x80; // Note Off, Channel 1
const VELOCITY = 100;  // Medium-loud velocity

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

  const handleBulkDump = (data) => {
    if (data.length < 10) return; // Too short to be a valid dump
    
    // Log the ASCII representation of any text in the dump
    const asciiData = data.map(byte => 
      byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.'
    ).join('');
    console.log('ASCII data found:', asciiData);

    // Look for patch names and boundaries
    let offset = 0;
    const patches = [];
    
    while (offset < data.length) {
      // Look for potential patch boundaries or names
      if (data[offset] === 0x43) { // 'C' in ASCII
        const possibleName = data.slice(offset, offset + 8)
          .map(byte => byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.');
        console.log('Possible patch name at offset', offset, ':', possibleName.join(''));
      }
      offset++;
    }

    console.log('Found potential patches:', patches.length);
    
    // For now, store the entire dump as a single patch
    const newPatch = {
      id: Date.now(),
      type: 'bulk',
      data: data,
      timestamp: new Date().toISOString(),
      name: 'Bulk Dump',
      size: data.length
    };

    setPatches(prev => [...prev, newPatch]);
  };

  const handleMIDIMessage = (event) => {
    // Ignore Active Sensing (0xFE) and Timing Clock (0xF8)
    if (event.data[0] === 0xFE || event.data[0] === 0xF8) {
      return;
    }

    const data = Array.from(event.data);
    
    // For non-SysEx messages, just log them
    if (event.data[0] !== SYSEX_START) {
      console.log('Regular MIDI message:', data.map(b => `0x${b.toString(16).padStart(2, '0')}`));
      return;
    }

    console.log('SysEx Details:');
    console.log('- Manufacturer ID:', `0x${data[1].toString(16)}`);
    console.log('- Device ID:', `0x${data[3].toString(16)}`);
    console.log('- Command/Status:', `0x${data[4].toString(16)}`);
    console.log('- Data Length:', data.length);

    // If this is a large message from the MD-BT01 (bulk dump)
    if (data.length > 1000 && data[3] === 0x19 && data[4] === 0x50) {
      console.log('MD-BT01 bulk dump detected');
      handleBulkDump(data);
      return;
    }
  };
  };

  const determinePatchType = (typeCode) => {
    switch (typeCode) {
      case 0x00:
        return 'program';
      case 0x01:
        return 'combi';
      case 0x02:
        return 'song';
      default:
        return 'unknown';
    }
  };

  const requestPatch = async () => {
    if (!midiOutput || !midiInput) {
      setError('MIDI device not connected');
      return;
    }

    // Add a longer delay before sending
    await new Promise(resolve => setTimeout(resolve, 300));

    // Updated SysEx format with explicit channel number
    const sysexRequest = new Uint8Array([
      SYSEX_START,    // 0xF0
      KORG_ID,        // 0x42
      CHANNEL | 0x00, // Channel 1 (0x30 | 0x00)
      M1_ID,          // 0x20
      DUMP_REQUEST,   // 0x10
      selectedPatchType === 'program' ? 0x00 : 
      selectedPatchType === 'combi' ? 0x01 : 0x02,
      0x00,           // Program number (0-99)
      SYSEX_END       // 0xF7
    ]);

    console.log('Sending MIDI SysEx:', 
      Array.from(sysexRequest).map(b => `0x${b.toString(16).padStart(2, '0')}`));
    
    try {
      // Send the message
      await midiOutput.send(sysexRequest);
      console.log('SysEx message sent successfully');

      // Add a delay after sending
      await new Promise(resolve => setTimeout(resolve, 300));
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
    setBackupProgress({ current: 0, total: 100 }); // Just programs for now

    try {
      // Request all program parameters
      const sysex = new Uint8Array([
        SYSEX_START,
        KORG_ID,
        CHANNEL,
        M1_ID,
        ...MSG_ALL_PROGRAM_DUMP,  // 0x01, 0x0C for All Program Parameter Dump
        0x00,   // Bank 0
        SYSEX_END
      ]);

      console.log('Sending ALL PROGRAM PARAMETER DUMP request:', 
        Array.from(sysex).map(b => `0x${b.toString(16).padStart(2, '0')}`));
      
      await midiOutput.send(sysex);
      
      // The M1 should respond with the data automatically
      console.log('Waiting for M1 response...');

    } catch (err) {
      console.error('Error during backup process:', err);
      setError('Error during backup process');
    }

      for (let i = 0; i < 100; i++) {
        const sysex = new Uint8Array([
          SYSEX_START,
          KORG_ID,
          CHANNEL,
          M1_ID,
          DUMP_REQUEST,
          0x01,
          i,
          SYSEX_END
        ]);
        await midiOutput.send(sysex);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      for (let i = 0; i < 100; i++) {
        const sysex = new Uint8Array([
          SYSEX_START,
          KORG_ID,
          CHANNEL,
          M1_ID,
          DUMP_REQUEST,
          0x02,
          i,
          SYSEX_END
        ]);
        await midiOutput.send(sysex);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (err) {
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

    const pattern = [
      { note: 60, duration: 200 }, // Middle C
      { note: 64, duration: 200 }, // E
      { note: 67, duration: 200 }, // G
      { note: 72, duration: 400 }, // High C
    ];

    try {
      for (const { note, duration } of pattern) {
        // Note On
        midiOutput.send([NOTE_ON, note, VELOCITY]);
        console.log('Note On:', note);
        
        // Wait for duration
        await new Promise(resolve => setTimeout(resolve, duration));
        
        // Note Off
        midiOutput.send([NOTE_OFF, note, 0]);
        console.log('Note Off:', note);
        
        // Small gap between notes
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
              onClick={() => setSelectedPatchType('combi')}
              variant={selectedPatchType === 'combi' ? 'default' : 'outline'}
            >
              Combinations
            </Button>
            <Button
              onClick={() => setSelectedPatchType('song')}
              variant={selectedPatchType === 'song' ? 'default' : 'outline'}
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
