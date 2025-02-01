import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

// MIDI Constants
const DEVICE_INQUIRY = [
  0xF0,  // Start of SysEx
  0x7E,  // Universal System Exclusive
  0x7F,  // All devices
  0x06,  // General Information
  0x01,  // Identity Request
  0xF7   // End of SysEx
];

const M1ConnectionManager = ({ onConnectionComplete }) => {
  const [status, setStatus] = useState('initializing');
  const [error, setError] = useState(null);
  const [midiAccess, setMidiAccess] = useState(null);
  const [midiInput, setMidiInput] = useState(null);
  const [midiOutput, setMidiOutput] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState(null);

  // Step 1: Check WebMIDI Support
  useEffect(() => {
    if (!navigator.requestMIDIAccess) {
      setStatus('webmidi-unsupported');
      setError('This browser does not support WebMIDI. Please use Chrome or Edge.');
      return;
    }

    const initMIDI = async () => {
      try {
        const access = await navigator.requestMIDIAccess({ sysex: true });
        setMidiAccess(access);
        setStatus('checking-interfaces');
      } catch (err) {
        setStatus('webmidi-error');
        setError('Failed to initialize WebMIDI: ' + err.message);
      }
    };

    initMIDI();
  }, []);

  // Step 2: Check MIDI Interfaces
  useEffect(() => {
    if (!midiAccess || status !== 'checking-interfaces') return;

    const outputs = Array.from(midiAccess.outputs.values());
    const inputs = Array.from(midiAccess.inputs.values());

    if (inputs.length === 0 || outputs.length === 0) {
      setStatus('no-interfaces');
      setError('No MIDI interfaces detected. Please connect a MIDI interface.');
      return;
    }

    // For now, use the first available ports
    const input = inputs[0];
    const output = outputs[0];

    input.onmidimessage = handleMIDIMessage;
    
    setMidiInput(input);
    setMidiOutput(output);
    setStatus('detecting-m1');

    // Set up port state change handler
    midiAccess.onstatechange = (e) => {
      const { port } = e;
      console.log(`MIDI port ${port.state}: ${port.type} - ${port.name}`);
      
      if (port.state === 'disconnected') {
        setStatus('interface-disconnected');
        setError('MIDI interface disconnected. Please reconnect.');
      }
    };

    // Initial M1 detection
    sendDeviceInquiry(output);
  }, [midiAccess, status]);

  // Handle MIDI messages
  const handleMIDIMessage = (event) => {
    if (status !== 'detecting-m1') return;

    const data = Array.from(event.data);
    
    // Ignore active sensing
    if (data[0] === 0xFE) return;

    // Check for device inquiry response
    if (data[0] === 0xF0 && data[1] === 0x7E && data[3] === 0x06 && data[4] === 0x02) {
      const info = {
        manufacturer: data[5],
        deviceFamily: data[6],
        deviceMember: data[7],
        softwareVersion: data[10]
      };

      const isKorgM1 = info.manufacturer === 0x42 && 
                       info.deviceFamily === 0x19;

      if (isKorgM1) {
        setDeviceInfo(info);
        setStatus('m1-detected');
        onConnectionComplete?.({
          midiInput,
          midiOutput,
          deviceInfo: info
        });
      } else {
        setStatus('no-m1-found');
        setError('Connected device is not a Korg M1');
      }
    }
  };

  const sendDeviceInquiry = async (output) => {
    if (!output) return;
    try {
      await output.send(DEVICE_INQUIRY);
    } catch (err) {
      setStatus('device-inquiry-error');
      setError('Failed to send device inquiry: ' + err.message);
    }
  };

  // Status display component
  const StatusDisplay = () => {
    const getStatusInfo = () => {
      switch (status) {
        case 'initializing':
          return {
            title: 'Initializing',
            description: 'Checking WebMIDI support...',
            icon: null
          };
        case 'webmidi-unsupported':
          return {
            title: 'WebMIDI Not Supported',
            description: error,
            icon: <XCircle className="h-5 w-5 text-red-500" />
          };
        case 'checking-interfaces':
          return {
            title: 'Checking MIDI Interfaces',
            description: 'Looking for connected MIDI interfaces...',
            icon: null
          };
        case 'no-interfaces':
          return {
            title: 'No MIDI Interfaces',
            description: error,
            icon: <XCircle className="h-5 w-5 text-red-500" />
          };
        case 'detecting-m1':
          return {
            title: 'Detecting Korg M1',
            description: 'Sending device inquiry...',
            icon: null
          };
        case 'm1-detected':
          return {
            title: 'Korg M1 Connected',
            description: `Connected to Korg M1 (Version ${deviceInfo.softwareVersion})`,
            icon: <CheckCircle2 className="h-5 w-5 text-green-500" />
          };
        case 'no-m1-found':
          return {
            title: 'No Korg M1 Found',
            description: error,
            icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />
          };
        case 'interface-disconnected':
          return {
            title: 'MIDI Interface Disconnected',
            description: error,
            icon: <XCircle className="h-5 w-5 text-red-500" />
          };
        default:
          return {
            title: 'Error',
            description: error || 'Unknown error occurred',
            icon: <XCircle className="h-5 w-5 text-red-500" />
          };
      }
    };

    const { title, description, icon } = getStatusInfo();

    return (
      <Alert variant={status === 'm1-detected' ? 'default' : 'destructive'}>
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription>{description}</AlertDescription>
          </div>
        </div>
      </Alert>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connection Status</CardTitle>
      </CardHeader>
      <CardContent>
        <StatusDisplay />
        {midiInput && (
          <div className="mt-4 text-sm text-gray-600">
            <p>Input: {midiInput.name}</p>
            <p>Output: {midiOutput.name}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default M1ConnectionManager;