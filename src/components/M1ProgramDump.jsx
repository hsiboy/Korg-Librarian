import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const M1ProgramDump = ({ midiOutput, midiInput }) => {
  const [programs, setPrograms] = useState([]);
  const [dumping, setDumping] = useState(false);
  const [currentProgram, setCurrentProgram] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!midiInput) return;

    const handleMIDIMessage = (event) => {
      const data = Array.from(event.data);
      
      // Ignore active sensing
      if (data[0] === 0xFE) return;
      
      // Only process SysEx messages
      if (data[0] === 0xF0) {
        // Check if it's a program dump (40H)
        if (data[4] === 0x40) {
          const programNumber = data[5];
          const rawHex = data.map(b => `0x${b.toString(16).padStart(2, '0')}`);
          
          // Extract name bytes (bytes 6-15) and convert to ASCII
          const nameBytes = data.slice(6, 16);
          const name = String.fromCharCode(...nameBytes).trim();
          
          setPrograms(prev => [...prev, {
            number: programNumber,
            name: name,
            rawData: data,
            rawHex: rawHex
          }]);
          
          setCurrentProgram(programNumber + 1);
        }
      }
    };

    midiInput.addEventListener('midimessage', handleMIDIMessage);
    return () => midiInput.removeEventListener('midimessage', handleMIDIMessage);
  }, [midiInput]);

  const requestProgram = async (programNumber) => {
    if (!midiOutput) return;

    const sysex = new Uint8Array([
      0xF0, // Start
      0x42, // Korg
      0x30, // Channel 0
      0x19, // M1 ID
      0x10, // Program Parameter Dump Request
      programNumber, // Program number
      0xF7  // End
    ]);

    try {
      await midiOutput.send(sysex);
      return true;
    } catch (err) {
      console.error(`Error requesting program ${programNumber}:`, err);
      return false;
    }
  };

  const startDump = async () => {
    setDumping(true);
    setPrograms([]);
    setCurrentProgram(0);
    setError(null);

    for (let i = 0; i < 100; i++) {
      if (!dumping) break;
      
      setCurrentProgram(i);
      await requestProgram(i);
      // Wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setDumping(false);
  };

  const stopDump = () => {
    setDumping(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>M1 Program Dump</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex space-x-4">
            <Button
              onClick={startDump}
              disabled={dumping || !midiOutput}
            >
              Start Program Dump
            </Button>
            <Button
              onClick={stopDump}
              disabled={!dumping}
              variant="destructive"
            >
              Stop
            </Button>
          </div>

          {dumping && (
            <div className="text-sm">
              Requesting Program: {currentProgram}/99
            </div>
          )}

          {error && (
            <div className="text-red-500 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            {programs.map((program, index) => (
              <div key={index} className="border p-4 rounded-lg">
                <div className="font-bold">
                  Program {program.number}: {program.name}
                </div>
                <div className="text-xs font-mono mt-2 break-all">
                  {program.rawHex.join(' ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default M1ProgramDump;

