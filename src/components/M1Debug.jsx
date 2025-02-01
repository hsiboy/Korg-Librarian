import React from 'react';
import { Button } from '@/components/ui/button';

const M1Debug = ({ midiOutput, midiInput }) => {
  // Test different message formats
  const testMessages = [
    {
      name: "Format 4 - Program Request (0x0)",
      data: [
        0xF0, // Start
        0x42, // Korg
        0x30, // Try global channel 0 instead of 1
        0x19, // M1
        0x00, // Function
        0x01, // Sub-function
        0x00, // Program number
        0x00, // Bank
        0xF7  // End
      ]
    },
    {
        name: "Format 5 - Program Request (Alt Channel)",
        data: [
          0xF0, // Start
          0x42, // Korg
          0x30, // Global channel instead of 3n
          0x19, // M1
          0x10, // Function
          0x00, // Program number
          0xF7  // End
        ]
      },
    {
      name: "Format 6 - Extended Program Request",
      data: [
        0xF0, // Start
        0x42, // Korg
        0x30, // Global channel
        0x19, // M1
        0x10, // Function - Program Parameter Dump Request
        0x00, // Program number
        0x00, // Bank MSB
        0x00, // Bank LSB
        0x00, // Reserved
        0xF7  // End
      ]
    },
    {
      name: "Format 7 - Parameter Change",
      data: [
        0xF0, // Start
        0x42, // Korg
        0x30, // Global channel
        0x19, // M1
        0x41, // Parameter change
        0x00, // Parameter MSB
        0x00, // Parameter LSB
        0x00, // Value
        0xF7  // End
      ]
    },
    {
        name: "Format 8 - Two-Stage Program Request",
        data: [
            0xF0, // Start
            0x42, // Korg
            0x30, // Global channel
            0x19, // M1
            0x20, // Request status/ready
            0x00, // Program number
            0xF7  // End
        ]
    }
];

const sendTestMessage = async (message) => {
    if (!midiOutput) {
      console.error('No MIDI output available');
      return;
    }

    // First send a note-on to verify basic MIDI communication
    console.log('Sending test note...');
    midiOutput.send([0x90, 60, 100]); // Note on, middle C, velocity 100
    await new Promise(resolve => setTimeout(resolve, 100));
    midiOutput.send([0x80, 60, 0]);   // Note off
    
    // Wait a bit before sending SysEx
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log(`Sending ${message.name}:`, 
      message.data.map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' '));
    
    try {
      await midiOutput.send(new Uint8Array(message.data));
      console.log('Message sent successfully');
    } catch (err) {
      console.error('Error sending message:', err);
    }
};

  // Add a message listener specifically for debugging
  React.useEffect(() => {
    if (!midiInput) return;

    const debugListener = (event) => {
      if (event.data[0] === 0xFE) return; // Ignore active sensing
      
      console.log('Response received:', {
        timestamp: new Date().toISOString(),
        data: Array.from(event.data).map(b => `0x${b.toString(16).padStart(2, '0')}`),
        rawData: Array.from(event.data),
      });
    };

    midiInput.addEventListener('midimessage', debugListener);
    return () => midiInput.removeEventListener('midimessage', debugListener);
  }, [midiInput]);

  return (
    <div className="space-y-4">
      <div className="font-bold">M1 Debug Tools</div>
      <div className="space-y-2">
        {testMessages.map((msg, idx) => (
          <Button 
            key={idx}
            onClick={() => sendTestMessage(msg)}
            className="w-full"
          >
            Send {msg.name}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default M1Debug;