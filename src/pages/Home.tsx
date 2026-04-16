import React, { useState } from 'react';
import { Plus, Pencil, Trash2, X, PlusCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/lib/ui/Button';
import { Input } from '@/lib/ui/Input';
import { Select } from '@/lib/ui/Select';
import { Dialog } from '@/lib/ui/Dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/lib/ui/Table';
import type { LinkItem, LinkStatus } from '@/lib/types';

const Home: React.FC = () => {
  const [links, setLinks] = useState<LinkItem[]>([
    { id: 1, title: 'Sample Link', links: ['https://example.com'], source: 'Web', status: 'Downloaded' },
  ]);

  // Dialog States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form States
  const [formTitle, setFormTitle] = useState('');
  const [formLinks, setFormLinks] = useState<string[]>(['']);
  const [formSource, setFormSource] = useState('');
  const [formStatus, setFormStatus] = useState<LinkStatus>('Pending');

  const resetForm = () => {
    setFormTitle('');
    setFormLinks(['']);
    setFormSource('');
    setFormStatus('Pending');
    setEditingId(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: LinkItem) => {
    setFormTitle(item.title);
    setFormLinks([...item.links]);
    setFormSource(item.source);
    setFormStatus(item.status);
    setEditingId(item.id);
    setIsFormOpen(true);
  };

  const handleSave = () => {
    // Basic validation
    if (!formTitle || formLinks.filter(l => l.trim()).length === 0) return;

    if (editingId) {
      setLinks(links.map(l => l.id === editingId ? {
        ...l, title: formTitle, links: formLinks.filter(l => l.trim()), source: formSource, status: formStatus
      } : l));
    } else {
      setLinks([...links, {
        id: Date.now(),
        title: formTitle,
        links: formLinks.filter(l => l.trim()),
        source: formSource,
        status: formStatus
      }]);
    }
    setIsFormOpen(false);
  };

  const handleDelete = () => {
    if (editingId) {
      setLinks(links.filter(l => l.id !== editingId));
    }
    setIsDeleteOpen(false);
    setEditingId(null);
  };

  const handleLinkChange = (index: number, value: string) => {
    const newLinks = [...formLinks];
    newLinks[index] = value;
    setFormLinks(newLinks);
  };

  const removeLinkInput = (index: number) => {
    if (formLinks.length > 1) {
      setFormLinks(formLinks.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Daftar Links</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Kelola tautan unduhan dan resource anda.
            </p>
          </div>
          <Button onClick={handleOpenAdd} className="gap-2 shrink-0">
            <Plus size={18} />
            Add Link
          </Button>
        </div>

        {/* Table Section */}
        <div className="bg-card shadow-sm border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Links</TableHead>
                <TableHead className="hidden sm:table-cell">Source</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="text-right w-[140px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Tidak ada link. Klik "Add Link" untuk menambahkan.
                  </TableCell>
                </TableRow>
              ) : (
                links.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-muted-foreground">#{item.id}</TableCell>
                    <TableCell className="font-semibold">{item.title}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {item.links.map((link, idx) => (
                          <a key={idx} href={link} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline flex items-center gap-1 text-sm truncate max-w-[200px] sm:max-w-[300px]">
                            <ExternalLink size={12} />
                            {link}
                          </a>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{item.source}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium 
                        ${item.status === 'Downloaded' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}
                        ${item.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
                        ${item.status === 'Broken' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : ''}`}>
                        {item.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)}>
                          <Pencil size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setEditingId(item.id);
                            setIsDeleteOpen(true);
                          }}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full text-center py-6 border-t bg-muted/20 text-muted-foreground text-sm mt-auto">
        Made by <a href="#" className="font-medium hover:text-foreground transition-colors">@johnmahalarang</a>
      </footer>

      {/* Add / Edit Form Dialog */}
      <Dialog 
        open={isFormOpen} 
        onClose={() => setIsFormOpen(false)}
        title={editingId ? 'Edit Link' : 'Add New Link'}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input 
              placeholder="e.g. Tutorial Video Part 1" 
              value={formTitle} 
              onChange={e => setFormTitle(e.target.value)} 
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center justify-between">
              Links
            </label>
            <div className="space-y-2">
              {formLinks.map((link, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input 
                    placeholder="https://..." 
                    value={link} 
                    onChange={e => handleLinkChange(idx, e.target.value)} 
                  />
                  {formLinks.length > 1 && (
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => removeLinkInput(idx)}
                      className="shrink-0"
                    >
                      <X size={16} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-1 gap-1 text-muted-foreground w-full border border-dashed border-border"
              onClick={() => setFormLinks([...formLinks, ''])}
            >
              <PlusCircle size={14} /> Add another link
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Source</label>
            <Input 
              placeholder="e.g. YouTube, Google Drive" 
              value={formSource} 
              onChange={e => setFormSource(e.target.value)} 
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select 
              value={formStatus} 
              onChange={e => setFormStatus(e.target.value as LinkStatus)}
            >
              <option value="Downloaded">Downloaded</option>
              <option value="Pending">Pending</option>
              <option value="Broken">Broken</option>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t mt-6">
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={isDeleteOpen} 
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Deletion"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Are you sure you want to delete this item? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t mt-6">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </Dialog>

    </div>
  );
};

export default Home;
