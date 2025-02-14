import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BANKS, CARD_FORMAT } from '../../constants/midi';
import { useMidi } from '../../hooks/useMidi';
import { usePatchOperations } from '../../hooks/usePatchOperations';
import { PatchDisplay } from './PatchDisplay';
import M1ConnectionManager from './M1ConnectionManager';

export default function KorgM1Librarian() {
    const {
        midiOutputs,
        selectedDevice,
        setSelectedDevice,
        deviceInfo,
        isM1Detected,
        error: midiError,
        sendSysExWithRetry
    } = useMidi();

    const {
        patches,
        cardPatches,
        internalCombinations,
        cardCombinations,
        cardFormat,
        internalLoading,
        cardLoading,
        error,
        cardError,
        requestPatchDump,
        requestAllData,
        renamePatch
    } = usePatchOperations(sendSysExWithRetry);

    const [hasRequestedPatches, setHasRequestedPatches] = useState(false);

    useEffect(() => {
        if (isM1Detected && !hasRequestedPatches) {
            requestAllData();
            setHasRequestedPatches(true);
        }
    }, [isM1Detected, hasRequestedPatches, requestAllData]);

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <Card className="max-w-6xl mx-auto bg-white shadow-lg">
                <CardHeader className="border-b bg-gray-50/50">
                    <CardTitle className="text-2xl font-bold text-gray-800">
                        Korg M1 Patch Librarian
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-6">
                    <M1ConnectionManager 
                        onConnectionComplete={({ midiInput, midiOutput, deviceInfo }) => {
                            setSelectedDevice(midiOutput);
                        }}
                    />

                    {/* Error Display */}
                    {(error || midiError) && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="w-4 h-4" />
                            <AlertDescription>{error || midiError}</AlertDescription>
                        </Alert>
                    )}

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
                                        <TabsTrigger value="programs">
                                            Programs ({patches.length}/{BANKS.INTERNAL.size})
                                        </TabsTrigger>
                                        <TabsTrigger value="combinations">
                                            Combinations ({internalCombinations.length}/{BANKS.INTERNAL.size})
                                        </TabsTrigger>
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
                                                        onRename={renamePatch}
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
                                        <div className="grid grid-cols-1 gap-2">
                                            {internalCombinations.map((combination, index) => (
                                                <div key={`internal-combination-${index}`} className="p-3 rounded-md border border-gray-200 bg-white">
                                                    <span className="text-gray-700">{combination}</span>
                                                </div>
                                            ))}
                                        </div>
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
                                            <TabsTrigger value="programs">
                                                Programs ({cardPatches.length}/{BANKS.CARD.getSize(cardFormat)})
                                            </TabsTrigger>
                                            <TabsTrigger value="combinations">
                                                Combinations ({cardCombinations.length}/{BANKS.CARD.getSize(cardFormat)})
                                            </TabsTrigger>
                                        </TabsList>
                    
                                        {/* Card Programs Content */}
                                        <TabsContent value="programs" className="space-y-4">
                                            <div className="grid grid-cols-1 gap-2">
                                                {cardPatches.map((patch, index) => (
                                                    <PatchDisplay
                                                        key={`card-${index}`}
                                                        patch={patch}
                                                        bank={BANKS.CARD}
                                                        onRename={renamePatch}
                                                    />
                                                ))}
                                            </div>
                                        </TabsContent>
                    
                                        {/* Card Combinations Content */}
                                        <TabsContent value="combinations" className="space-y-4">
                                            <div className="grid grid-cols-1 gap-2">
                                                {cardCombinations.map((combination, index) => (
                                                    <div key={`card-combination-${index}`} className="p-3 rounded-md border border-gray-200 bg-white">
                                                        <span className="text-gray-700">{combination}</span>
                                                    </div>
                                                ))}
                                            </div>
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
