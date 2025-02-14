import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useMidi } from '../../hooks/useMidi';

function M1ConnectionManager({ onConnectionComplete }) {
  const {
    midiInput,
    midiOutput: selectedDevice,
    midiOutputs,
    setSelectedDevice,
    deviceInfo,
    isM1Detected,
    error,
    status
  } = useMidi();

  // Notify parent component when connection is complete
  React.useEffect(() => {
    if (isM1Detected && midiInput && selectedDevice && deviceInfo) {
      onConnectionComplete?.({
        midiInput,
        midiOutput: selectedDevice,
        deviceInfo
      });
    }
  }, [isM1Detected, midiInput, selectedDevice, deviceInfo, onConnectionComplete]);

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
            description: `Connected to Korg M1 (Version ${deviceInfo?.softwareVersion})`,
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
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Connection Status</CardTitle>
        <div className="flex items-center space-x-2">
          <select 
            onChange={e => setSelectedDevice(midiOutputs[e.target.value])}
            className="px-3 py-2 rounded-md border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {midiOutputs.map((device, index) => (
              <option key={device.id} value={index}>{device.name}</option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        <StatusDisplay />
        {midiInput && selectedDevice && (
          <div className="mt-4 text-sm text-gray-600">
            <p>Input: {midiInput.name}</p>
            <p>Output: {selectedDevice.name}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default M1ConnectionManager;
