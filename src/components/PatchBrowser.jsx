import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Search } from 'lucide-react';

export const PatchBrowser = ({ onSendPatch }) => {
  const [patches, setPatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const fetchPatches = async () => {
      try {
        // In production, this would be a proper URL to your patches JSON
        const response = await fetch('/patches-directory/index.json');
        const data = await response.json();
        setPatches(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load patch directory');
        setLoading(false);
      }
    };

    fetchPatches();
  }, []);

  const filteredPatches = patches.filter(patch => {
    const matchesSearch = patch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patch.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || patch.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...new Set(patches.map(patch => patch.category))];

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Public Patch Directory</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search patches..."
                className="pl-8 h-10 w-full rounded-md border border-input px-3 py-2"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {categories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(category)}
                  className="capitalize"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-4">Loading patches...</div>
          ) : (
            <div className="grid gap-4">
              {filteredPatches.map(patch => (
                <div
                  key={patch.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div>
                    <h3 className="font-medium">{patch.name}</h3>
                    <p className="text-sm text-muted-foreground">{patch.description}</p>
                    <div className="text-xs text-muted-foreground mt-1">
                      Source: {patch.source}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onSendPatch(patch)}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Send to M1
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PatchBrowser;
