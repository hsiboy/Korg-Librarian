import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const M1ProtocolTest = ({ midiOutput, midiInput }) => {
  const [lastResponse, setLastResponse] = useState(null);
  
  // Standard Program Parameter Dump Request (from manual)
  const PROGRAM_DUMP_REQUEST = [
    0xF0,        // Start of Exclusive
    0x42,        // Korg ID
    0x30,        // Channel 0 (global channel)
    0x19,        // M1 ID
    0x10,        // Program Parameter Dump Request (10H)
    0xF7         // End of Exclusive
  ];

  useEffect(() => {
    if (!midiInput) return;

    const handleResponse = (event) => {
      const data = Array.from(event.data);
      
      // Ignore active sensing
      if (data[0] === 0xFE) return;
      
      // Log all SysEx responses
      if (data[0] === 0xF0) {
        const response = {
          timestamp: new Date().toISOString(),
          raw: data,
          hex: data.map(b => `0x${b.toString(16).padStart(2, '0')}`),
          functionCode: data[4] ? `0x${data[4].toString(16)}` : 'none'
        };
        
        console.log('SysEx Response:', response);
        setLastResponse(response);
      }
    };

    midiInput.addEventListener('midimessage', handleResponse);
    return () => midiInput.removeEventListener('midimessage', handleResponse);
  }, [midiInput]);

  const sendProgramRequest = async () => {
    if (!midiOutput) {
      console.error('No MIDI output available');
      return;
    }

    try {
      console.log('Sending Program Dump Request:', 
        PROGRAM_DUMP_REQUEST.map(b => `0x${b.toString(16).padStart(2, '0')}`));
      
      await midiOutput.send(new Uint8Array(PROGRAM_DUMP_REQUEST));
      console.log('Request sent successfully');
      
      // Clear any previous response
      setLastResponse(null);
    } catch (err) {
      console.error('Error sending request:', err);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>M1 Protocol Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Button 
            onClick={sendProgramRequest}
            disabled={!midiOutput}
            className="w-full"
          >
            Send Program Dump Request (10H)
          </Button>
        </div>
        
        {lastResponse && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="font-semibold mb-2">Last Response</h3>
            <div className="text-sm space-y-1">
              <p>Timestamp: {lastResponse.timestamp}</p>
              <p>Function Code: {lastResponse.functionCode}</p>
              <p>Raw Data (hex): {lastResponse.hex.join(' ')}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default M1ProtocolTest;