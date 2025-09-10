'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { API_URL } from '@/lib/config';
import { FileImage, Upload, Loader2, Eye, Trash2, ExternalLink } from 'lucide-react';

interface MediaFile {
  id: string;
  fileName: string;
  fileType: string;
  purpose: string;
  description: string;
  tags: string[];
  cloudinaryUrl?: string;
  originalUrl: string;
  createdAt: string;
  agentId: string;
  agent?: {
    name: string;
  };
}

interface Agent {
  id: string;
  name: string;
}

export default function MediaManagementPage() {
  const { user } = useAuth();
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [uploadForm, setUploadForm] = useState({
    url: '',
    purpose: 'menu',
    description: '',
    agentId: '',
    tags: ''
  });

  const purposes = [
    { value: 'menu', label: 'Menú' },
    { value: 'catalogue', label: 'Catálogo' },
    { value: 'price_list', label: 'Lista de Precios' },
    { value: 'brochure', label: 'Folleto' },
    { value: 'product', label: 'Producto' },
    { value: 'other', label: 'Otro' }
  ];

  useEffect(() => {
    loadFiles();
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/agents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAgents(data.data.agents || []);
      }
    } catch (err) {
      console.error('Error loading agents:', err);
    }
  };

  const loadFiles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/media/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      } else {
        setError('Error cargando archivos');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadFromUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadForm.url || !uploadForm.agentId) {
      setError('URL y agente son requeridos');
      return;
    }
    
    setUploading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/media/upload-url`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          url: uploadForm.url,
          purpose: uploadForm.purpose,
          description: uploadForm.description,
          agentId: uploadForm.agentId,
          tags: uploadForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        })
      });
      
      if (response.ok) {
        setUploadForm({ url: '', purpose: 'menu', description: '', agentId: '', tags: '' });
        loadFiles();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Error subiendo archivo');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (fileId: string) => {
    if (!confirm('¿Estás seguro de eliminar este archivo?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/media/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        loadFiles();
      }
    } catch (err) {
      console.error('Error deleting file:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Archivos Multimedia</h1>
          <p className="text-gray-600 mt-1">Administra imágenes y documentos para tus agentes</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Subir Archivo desde URL
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={uploadFromUrl} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>URL de la imagen *</Label>
                <Input
                  type="url"
                  value={uploadForm.url}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://ejemplo.com/imagen.jpg"
                  required
                />
              </div>
              
              <div>
                <Label>Agente *</Label>
                <Select 
                  value={uploadForm.agentId} 
                  onValueChange={(value) => setUploadForm(prev => ({ ...prev, agentId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un agente" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Tipo de archivo</Label>
                <Select 
                  value={uploadForm.purpose} 
                  onValueChange={(value) => setUploadForm(prev => ({ ...prev, purpose: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {purposes.map((purpose) => (
                      <SelectItem key={purpose.value} value={purpose.value}>
                        {purpose.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Descripción</Label>
                <Input
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Breve descripción del archivo"
                />
              </div>
              
              <div>
                <Label>Tags (separados por comas)</Label>
                <Input
                  value={uploadForm.tags}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="menu, precios, productos"
                />
              </div>
            </div>
            
            <Button type="submit" disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Subir Archivo
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Files List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileImage className="w-5 h-5" />
            Archivos Existentes ({files.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-12">
              <FileImage className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No hay archivos subidos aún</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {files.map((file) => (
                <div key={file.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {file.cloudinaryUrl || file.originalUrl ? (
                    <img 
                      src={file.cloudinaryUrl || file.originalUrl} 
                      alt={file.description}
                      className="w-full h-48 object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                      <FileImage className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1">{file.fileName}</h3>
                    <p className="text-sm text-gray-600 mb-2">{file.description}</p>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {file.purpose}
                      </span>
                      <span className="text-xs text-gray-500">
                        {file.agent?.name || 'Sin agente'}
                      </span>
                    </div>
                    
                    {file.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {file.tags.map((tag, index) => (
                          <span key={index} className="px-1 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        {(file.cloudinaryUrl || file.originalUrl) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(file.cloudinaryUrl || file.originalUrl, '_blank')}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteFile(file.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}