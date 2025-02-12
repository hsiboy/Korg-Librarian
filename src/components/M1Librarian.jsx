import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertCircle, Check } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


export default function KorgM1Librarian() {
  const [midiAccess, setMidiAccess] = useState(null);
  const [midiOutputs, setMidiOutputs] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [patches, setPatches] = useState([]);
  const [cardPatches, setCardPatches] = useState([]);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [isM1Detected, setIsM1Detected] = useState(false);
  const [hasRequestedPatches, setHasRequestedPatches] = useState(false);

  const [cardCombinations, setCardCombinations] = useState([]);
  const [internalCombinations, setInternalCombinations] = useState([]);

  const [internalLoading, setInternalLoading] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState(null);

  const [error, setError] = useState(null);
  const [midiInput, setMidiInput] = useState(null);

  const RENAME_PROGRAM = 0x41;  // Parameter change message type

  const [cardFormat, setCardFormat] = useState(null);

  const COMBINATION_DUMP_REQUEST = 0x1D;


const CARD_FORMAT = {
    FULL: 0x00,      // 100 programs, 100 combinations
    HALF: 0x01,      // 50 programs, 50 combinations, 3500 seq notes
    SEQ_ONLY: 0x02   // 7700 seq notes only
};

const BANKS = {
  INTERNAL: { id: 0, name: "INT", size: 100 },
  CARD: { 
      id: 1, 
      name: "CARD",
      getSize: (format) => {
          switch(format) {
              case CARD_FORMAT.FULL: return 100;
              case CARD_FORMAT.HALF: return 50;
              case CARD_FORMAT.SEQ_ONLY: return 0;
              default: return 0;
          }
      }
  }
};

const TIMEOUT_MS = {
  DEVICE_INQUIRY: 5000,
  PATCH_DUMP: 15000,  // wait 15 seconds for patch dump response
  BETWEEN_RETRIES: 2000
};

const MAX_RETRIES = 3;

  useEffect(() => {
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess({ sysex: true })
        .then(onMIDISuccess)
        .catch(() => console.error("MIDI access denied or unavailable."));
    } else {
      console.error("WebMIDI not supported in this browser.");
    }
  }, []);

  async function requestAllData() {
    try {
        // Internal Bank
        setInternalLoading(true);
        console.log("Requesting internal programs...");
        await requestPatchDump();
        console.log("Requesting internal combinations...");
        await requestInternalCombinations();
        
        // Card Bank
        setCardLoading(true);
        console.log("Requesting card programs...");
        await requestCardPatchDump();
        console.log("Requesting card combinations...");
        await requestCardCombinations();
    } catch (error) {
        console.error("Error during data requests:", error);
        setError("Failed to retrieve all data");
    } finally {
        setInternalLoading(false);
        setCardLoading(false);
    }
}

  function requestInternalCombinations() {
    setInternalLoading(true);
    const message = [0xf0, 0x42, 0x30, 0x19, COMBINATION_DUMP_REQUEST, BANKS.INTERNAL.id, 0xf7];
    
    sendSysExWithRetry(message, TIMEOUT_MS.PATCH_DUMP, "Internal combinations dump")
        .then(response => {
            parseCombinationDump(response, setInternalCombinations, BANKS.INTERNAL);
        })
        .catch(error => {
            console.error('Failed to get internal combinations:', error);
            setError('Failed to read internal combinations');
        })
        .finally(() => setInternalLoading(false));
}

function requestCardCombinations() {
  const message = [0xf0, 0x42, 0x30, 0x19, COMBINATION_DUMP_REQUEST, BANKS.CARD.id, 0xf7];
  
  sendSysExWithRetry(message, TIMEOUT_MS.PATCH_DUMP, "Card combinations dump")
      .then(response => {
          parseCombinationDump(response, setCardCombinations, BANKS.CARD);
      })
      .catch(error => {
          console.error('Failed to get card combinations:', error);
          setCardError('Failed to read card combinations');
      });
}

function parseCombinationDump(data, setCombinationsFunction, bank) {
  console.log(`Received Combination Bank Dump for ${bank.name}`, data);
  const rawData = unescapeSysex(data.slice(6, -1));
  const combinations = [];
  let dataPointer = 0;
  const COMBINATION_SIZE = 124;  // Combinations are 124 bytes each
  const expectedCombinations = bank.size;

  while (dataPointer + COMBINATION_SIZE <= rawData.length && combinations.length < expectedCombinations) {
      const combinationNumber = dataPointer / COMBINATION_SIZE + 1;
      const nameBytes = rawData.slice(dataPointer, dataPointer + 10);
      const isEmpty = nameBytes.every(byte => byte === 0);
      const name = isEmpty ? "Empty" : nameBytes.map(byte => String.fromCharCode(byte)).join("").trim();
      combinations.push(`${combinationNumber}: ${name}`);
      dataPointer += COMBINATION_SIZE;
  }

    console.log(`Extracted ${combinations.length} combinations from ${bank.name}:`, combinations);
    setCombinationsFunction(combinations);
}
  
  function onMIDISuccess(midi) {
    setMidiAccess(midi);
    const outputs = Array.from(midi.outputs.values());
    const inputs = Array.from(midi.inputs.values());
    setMidiOutputs(outputs);
    if (inputs.length > 0) {
        setMidiInput(inputs[0]);  // Store the input reference
    }
    if (outputs.length > 0) {
        setSelectedDevice(outputs[0]);
    }
}

  function sendSysEx(message) {
    if (!selectedDevice || !("send" in selectedDevice)) {
      console.warn("Skipping SysEx send: No valid MIDI output selected.");
      return;
    }
    const data = new Uint8Array(message);
    selectedDevice.send(data);
  }

  useEffect(() => {
    if (isM1Detected && !hasRequestedPatches) {
        requestAllData();
        setHasRequestedPatches(true);
    }
}, [isM1Detected, hasRequestedPatches]);x
  
  useEffect(() => {
    if (selectedDevice && !isM1Detected) {
      console.log(`Starting polling for ${selectedDevice.name}`);
      const interval = setInterval(() => {
        const inquiryMessage = [0xf0, 0x7e, 0x7f, 0x06, 0x01, 0xf7];
        sendSysEx(inquiryMessage);
      }, 5000);

      return () => {
        console.log(`Stopping polling for ${selectedDevice.name}`);
        clearInterval(interval);
      };
    }
  }, [selectedDevice, isM1Detected]);

  useEffect(() => {
    if (midiAccess) {
        // Set up message handlers for all MIDI inputs
        midiAccess.inputs.forEach(input => {
            console.log('Setting up MIDI listener for:', input.name);
            input.addEventListener('midimessage', handleMIDIMessage);
        });

        // Cleanup
        return () => {
            midiAccess.inputs.forEach(input => {
                input.removeEventListener('midimessage', handleMIDIMessage);
            });
        };
    }
}, [midiAccess]);
  
  function handleMIDIMessage(event) {
    const data = event.data;
    
    // Device inquiry response
    if (data[0] === 0xf0 && data[1] === 0x7e && data[3] === 0x06 && data[4] === 0x02) {
        const manufacturer = data[5];
        const deviceFamily = data[6];
        const deviceMember = data[7];
        const softwareVersion = data[8];
        const isM1 = manufacturer === 0x42 && deviceFamily === 0x19;
        setDeviceInfo({ manufacturer, deviceFamily, deviceMember, softwareVersion });
        setIsM1Detected(isM1);
    }

    // M1 responses
    if (data[0] === 0xf0 && data[1] === 0x42 && data[3] === 0x19) {
        switch(data[4]) {
            case 0x26: // Acknowledgment
                console.log('M1 acknowledged our request');
                break;

            case 0x4c: // Patch dump
                const isCardBank = data[5] === BANKS.CARD.id;
                if (isCardBank) {
                    parsePatchDump(data, setCardPatches, BANKS.CARD);
                } else {
                    parsePatchDump(data, setPatches, BANKS.INTERNAL);
                }
                break;

            case 0x24: // Error
                const errorMessage = 'M1 reported error';
                console.error(errorMessage);
                if (cardLoading) {
                    setCardError(errorMessage);
                } else {
                    setError(errorMessage);
                }
                break;
            
            case RENAME_PROGRAM:
                  console.log('Rename acknowledged');
                  // Update local state to reflect new name
                  if (data[5] === BANKS.CARD.id) {
                      setCardPatches(prev => {
                          const newPatches = [...prev];
                          newPatches[data[6]] = data.slice(7, -1);
                          return newPatches;
                      });
                  } else {
                      setPatches(prev => {
                          const newPatches = [...prev];
                          newPatches[data[6]] = data.slice(7, -1);
                          return newPatches;
                      });
                  }
                  break;
        }
    }
}

function requestPatchDump() {
  setInternalLoading(true);
  const message = [0xf0, 0x42, 0x30, 0x19, 0x1c, BANKS.INTERNAL.id, 0xf7];
  
  sendSysExWithRetry(message, TIMEOUT_MS.PATCH_DUMP, "Internal bank dump")
      .catch(error => {
          console.error('Failed to get internal patches:', error);
          setError('Failed to read internal patches');
      })
      .finally(() => setInternalLoading(false));
}

function requestCardPatchDump() {
  setCardLoading(true);
  setCardError(null);
  const message = [0xf0, 0x42, 0x30, 0x19, 0x1c, BANKS.CARD.id, 0xf7];
  
  sendSysExWithRetry(message, TIMEOUT_MS.PATCH_DUMP, "Card bank dump")
      .then(response => {
          // Analyze response to determine format
          const data = unescapeSysex(response.slice(6, -1));
          const format = determineCardFormat(data);
          setCardFormat(format);
          
          // Process patches based on determined format
          parsePatchDump(response, setCardPatches, {
              ...BANKS.CARD,
              size: BANKS.CARD.getSize(format)
          });
      })
      .catch(error => {
          console.error('Failed to get card patches:', error);
          setCardError('Failed to read card patches');
      })
      .finally(() => setCardLoading(false));
}

function determineCardFormat(data) {
  // Analyze data length/content to determine format
  // We need to establish the exact criteria based on testing
  // For now, this is a placeholder logic
  if (data.length >= 14300) { // 100 programs (143 bytes each)
      return CARD_FORMAT.FULL;
  } else if (data.length >= 7150) { // 50 programs
      return CARD_FORMAT.HALF;
  } else {
      return CARD_FORMAT.SEQ_ONLY;
  }
}

async function sendSysExWithRetry(message, timeoutMs, description) {
  let attempts = 0;
  while (attempts < MAX_RETRIES) {
      try {
          const response = await sendSysExAndWaitForResponse(message, timeoutMs);
          return response;  // Return the actual response data
      } catch (error) {
          attempts++;
          console.log(`${description} attempt ${attempts} failed:`, error);
          if (attempts === MAX_RETRIES) {
              throw new Error(`${description} failed after ${MAX_RETRIES} attempts`);
          }
          await new Promise(resolve => setTimeout(resolve, TIMEOUT_MS.BETWEEN_RETRIES));
      }
  }
}

function sendSysExAndWaitForResponse(message, timeoutMs) {
  return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
          reject(new Error('Response timeout'));
      }, timeoutMs);

      function responseHandler(event) {
          const data = event.data;
          if (data[0] === 0xF0 && data[1] === 0x42) {
              if (data[4] === 0x26) { // Acknowledgment
                  console.log('Received acknowledgment');
                  // Don't resolve yet - wait for actual data
              } else if (data[4] === 0x4C) { // Patch dump
                  clearTimeout(timeoutId);
                  resolve(data);
              } else if (data[4] === 0x24) { // Error
                  clearTimeout(timeoutId);
                  reject(new Error('Device reported error'));
              }
          }
      }

      midiInput.addEventListener('midimessage', responseHandler);
      sendSysEx(message);
  });
}
function formatCase(text, format) {
  const words = text.trim().split(/[\s_-]+/);
  switch(format) {
      case 'snake':
          return words.join('_').toLowerCase();
      case 'kebab':
          return words.join('-').toLowerCase();
      case 'camel':
          return words[0].toLowerCase() + words.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
      case 'pascal':
          return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
      case 'title':
          return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      case 'upper':
          return text.toUpperCase();
      case 'lower':
          return text.toLowerCase();
      default:
          return text;
  }
}

function renamePatch(patchId, newName, bank) {
  // Create escaped SysEx message with new name
  const paddedName = newName.padEnd(10, ' ');
  const nameBytes = [...paddedName].map(c => c.charCodeAt(0));
  const escapedData = escapeSysex(nameBytes);
  
  const message = [
      0xF0, 
      0x42,
      0x30,
      0x19,
      RENAME_PROGRAM,
      bank,
      patchId,
      ...escapedData,
      0xF7
  ];

  return sendSysExWithRetry(message, TIMEOUT_MS.PATCH_DUMP, "Rename patch");
}

function PatchRename({ patch, onRename, onCancel }) {
  // Extract the name part after "number: "
  const currentName = patch.split(': ')[1];
  const [newName, setNewName] = useState(currentName);

  const handleFormat = (format) => {
      setNewName(formatCase(newName, format));
  };

  const handleSave = () => {
      const trimmedName = newName.slice(0, 10);
      onRename(patch.id, trimmedName);
  };

  return (
      <div className="space-y-3">
          <div className="flex space-x-2">
              <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={10}
                  className="flex-1 px-3 py-1 rounded border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <button
                  onClick={handleSave}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                  Save
              </button>
              <button
                  onClick={onCancel}
                  className="px-3 py-1 bg-gray-100 text-gray-600 rounded text-sm hover:bg-gray-200"
              >
                  Cancel
              </button>
          </div>
          <div className="flex flex-wrap gap-2">
    {['Title Case', 'snake_case', 'kebab-case', 'camelCase', 'PascalCase', 'UPPER CASE', 'lower case'].map((format) => (
        <button
            key={format}
            onClick={() => handleFormat(format)}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
        >
            {format}
        </button>
    ))}
</div>
      </div>
  );
}

function escapeSysex(data) {
  let result = [];
  let dataIndex = 0;
  
  while (dataIndex < data.length) {
      // Calculate MS bits for next 7 bytes
      let msBits = 0;
      for (let i = 0; i < 7; i++) {
          if (dataIndex + i < data.length) {
              msBits = msBits | ((data[dataIndex + i] & 0x80) >> (7 - i));
          }
      }
      result.push(msBits);
      
      // Add the lower 7 bits of each byte
      for (let i = 0; i < 7; i++) {
          if (dataIndex + i < data.length) {
              result.push(data[dataIndex + i] & 0x7f);
          }
      }
      dataIndex += 7;
  }
  return result;
}

function parsePatchDump(data, setPatchesFunction, bank) {
  console.log(`Received Patch Bank Dump for ${bank.name}`, data);
  const rawData = unescapeSysex(data.slice(6, -1));
  const patches = [];
  let dataPointer = 0;
  const PATCH_SIZE = 143;
  const expectedPatches = bank.size;

  while (dataPointer + PATCH_SIZE <= rawData.length && patches.length < expectedPatches) {
      const patchNumber = dataPointer / PATCH_SIZE + 1;
      const nameBytes = rawData.slice(dataPointer, dataPointer + 10);
      // Check if all bytes are null (0x00)
      const isEmpty = nameBytes.every(byte => byte === 0);
      const name = isEmpty ? "Empty" : nameBytes.map(byte => String.fromCharCode(byte)).join("").trim();
      patches.push(`${patchNumber}: ${name}`);
      dataPointer += PATCH_SIZE;
  }

  console.log(`Extracted ${patches.length} patches from ${bank.name}:`, patches);
  setPatchesFunction(patches);
}
  
  function unescapeSysex(sysex) {
    let result = [];
    let index = 0;
    while (index < sysex.length) {
      let msb = sysex[index];
      index++;
      for (let i = 0; i < 7; i++) {
        if (index < sysex.length) {
          result.push(sysex[index] | ((msb & (1 << i)) << (7 - i)));
        }
        index++;
      }
    }
    return result;
  }

  function PatchDisplay({ patch, bank }) {
    const [isRenaming, setIsRenaming] = useState(false);
  
    const handleRename = async (id, newName) => {
      try {
        await renamePatch(id, newName, bank.id);
        setIsRenaming(false);
      } catch (error) {
        console.error('Failed to rename patch:', error);
        setError('Failed to rename patch');
      }
    };
  
    return (
      <div className="p-3 rounded-md border border-gray-200 bg-white hover:border-blue-200 hover:shadow-sm transition-all">
        {isRenaming ? (
          <PatchRename
            patch={patch}
            onRename={handleRename}
            onCancel={() => setIsRenaming(false)}
          />
        ) : (
          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-medium">{patch}</span>
            <button
              onClick={() => setIsRenaming(true)}
              className="px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
            >
              Rename
            </button>
          </div>
        )}
      </div>
    );
  }
  
  useEffect(() => {
    if (midiAccess) {
      midiAccess.inputs.forEach(input => input.addEventListener("midimessage", handleMIDIMessage));
      return () => {
        midiAccess.inputs.forEach(input => input.removeEventListener("midimessage", handleMIDIMessage));
      };
    }
  }, [midiAccess]);
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Card className="max-w-6xl mx-auto bg-white shadow-lg">
        <CardHeader className="border-b bg-gray-50/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold text-gray-800">
              Korg M1 Patch Librarian
            </CardTitle>
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
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Connection Status Card */}
          <Card className="mb-6 bg-gray-50 border-none">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                {!selectedDevice ? (
                  <>
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                    <span className="text-yellow-700">No MIDI Interface Connected</span>
                  </>
                ) : !deviceInfo ? (
                  <>
                    <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                    <span className="text-blue-700">Detecting device...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 text-green-500" />
                    <div className="flex space-x-6 text-sm text-gray-600">
                      <span>Korg M1 {isM1Detected ? '✓' : '✗'}</span>
                      <span>Version: #{deviceInfo.softwareVersion.toString(16)}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Banks Grid */}
          {isM1Detected && (
              <Tabs defaultValue="internal" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="internal">Internal Bank</TabsTrigger>
                  <TabsTrigger value="card">Card Bank</TabsTrigger>
                </TabsList>
                
                {/* Internal Bank Tab */}
                <TabsContent value="internal">
                  <Tabs defaultValue="programs">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="programs">Programs ({patches.length}/{BANKS.INTERNAL.size})</TabsTrigger>
                      <TabsTrigger value="combinations">Combinations ({internalCombinations.length}/{BANKS.INTERNAL.size})</TabsTrigger>
                    </TabsList>
            
                    {/* Programs Content */}
                    <TabsContent value="programs" className="space-y-4">
                      <div className="flex justify-end">
                        <button
                          onClick={requestPatchDump}
                          disabled={internalLoading}
                          className="inline-flex items-center px-3 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                        >
                          {internalLoading ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Refresh
                            </>
                          )}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {[...Array(BANKS.INTERNAL.size)].map((_, index) => {
                          const patch = patches[index];
                          return patch ? (
                            <PatchDisplay
                              key={`internal-${index}`}
                              patch={patch}
                              bank={BANKS.INTERNAL}
                            />
                          ) : (
                            <div key={`internal-${index}`} className="p-3 rounded-md bg-gray-50 text-gray-400 text-sm border border-dashed">
                              Empty Slot {index + 1}
                            </div>
                          );
                        })}
                      </div>
                    </TabsContent>
            
                    {/* Combinations Content */}
                    <TabsContent value="combinations" className="space-y-4">
                      {/* Similar structure to programs but for combinations */}
                    </TabsContent>
                  </Tabs>
                </TabsContent>
            
                {/* Card Bank Tab */}
                <TabsContent value="card">
                  <div className="mb-4">
                    {cardFormat !== null && (
                      <div className="text-sm text-gray-600">
                        {cardFormat === CARD_FORMAT.FULL && (
                          <span>100 Programs and 100 Combinations</span>
                        )}
                        {cardFormat === CARD_FORMAT.HALF && (
                          <span>50 Programs, 50 Combinations, and Sequencer Data (3,500 notes)</span>
                        )}
                        {cardFormat === CARD_FORMAT.SEQ_ONLY && (
                          <span>Sequencer Data Only (7,700 notes)</span>
                        )}
                      </div>
                    )}
                  </div>
            
                  {cardError ? (
                    <Alert variant="destructive">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      <AlertDescription>{cardError}</AlertDescription>
                    </Alert>
                  ) : cardFormat === CARD_FORMAT.SEQ_ONLY ? (
                    <div className="p-4 bg-gray-50 rounded-md">
                      <p className="text-gray-600">Card is formatted for sequencer data only (7,700 notes)</p>
                    </div>
                  ) : (
                    <Tabs defaultValue="programs">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="programs">Programs ({cardPatches.length}/{BANKS.CARD.getSize(cardFormat)})</TabsTrigger>
                        <TabsTrigger value="combinations">Combinations ({cardCombinations.length}/{BANKS.CARD.getSize(cardFormat)})</TabsTrigger>
                      </TabsList>
            
                      {/* Card Programs Content */}
                      <TabsContent value="programs" className="space-y-4">
                        {/* Similar structure to internal programs */}
                      </TabsContent>
            
                      {/* Card Combinations Content */}
                      <TabsContent value="combinations" className="space-y-4">
                        {/* Similar structure to internal combinations */}
                      </TabsContent>
                    </Tabs>
                  )}
                </TabsContent>
              </Tabs>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
