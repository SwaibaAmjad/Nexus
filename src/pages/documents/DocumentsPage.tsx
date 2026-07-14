import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Document as PdfDocument, Page as PdfPage, pdfjs } from 'react-pdf';
import SignatureCanvas from 'react-signature-canvas';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { FileText, Upload, Download, Trash2, PenTool, X } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const API_URL = 'https://nexus-production-abcc.up.railway.app/api/documents';

interface DocumentItem {
  _id: string;
  title: string;
  fileUrl: string;
  fileType: string;
  version: number;
  status: string;
  createdAt: string;
  signature?: {
    imageUrl: string | null;
    signedAt: string | null;
  };
}

export const DocumentsPage: React.FC = () => {
  const { token } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);

  const [signingDoc, setSigningDoc] = useState<DocumentItem | null>(null);
  const sigCanvasRef = React.useRef<SignatureCanvas>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const fetchDocuments = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocuments(res.data.documents);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);

    setUploading(true);
    try {
      await axios.post(API_URL, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      await fetchDocuments();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload document');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    if (!window.confirm('Delete this document? This cannot be undone.')) return;

    try {
      await axios.delete(`${API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocuments((prev) => prev.filter((d) => d._id !== id));
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete document');
    }
  };

  const handleSaveSignature = async () => {
    if (!signingDoc || !token || !sigCanvasRef.current) return;
    if (sigCanvasRef.current.isEmpty()) {
      alert('Please draw a signature first');
      return;
    }

    const dataUrl = sigCanvasRef.current.getTrimmedCanvas().toDataURL('image/png');
    const blob = await (await fetch(dataUrl)).blob();

    const formData = new FormData();
    formData.append('signature', blob, 'signature.png');

    try {
      await axios.post(`${API_URL}/${signingDoc._id}/signature`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setSigningDoc(null);
      await fetchDocuments();
    } catch (error) {
      console.error('Signature upload failed:', error);
      alert('Failed to save signature');
    }
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString();

  const statusVariant = (status: string) => {
    if (status === 'signed') return 'success';
    if (status === 'pending_signature') return 'warning';
    return 'secondary';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600">Manage your startup's important files</p>
        </div>

       <>
     <input
       ref={fileInputRef}
       type="file"
       onChange={handleUpload}
       className="hidden"
       accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
       />
     <Button
       leftIcon={<Upload size={18} />}
       disabled={uploading}
       onClick={() => fileInputRef.current?.click()}
       >
       {uploading ? 'Uploading...' : 'Upload Document'}
     </Button>
      </>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-gray-900">All Documents</h2>
        </CardHeader>
        <CardBody>
          {loading ? (
            <p className="text-gray-500 p-4">Loading documents...</p>
          ) : documents.length === 0 ? (
            <p className="text-gray-500 p-4">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc._id}
                  className="flex items-center p-4 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                >
                  <div className="p-2 bg-primary-50 rounded-lg mr-4">
                    <FileText size={24} className="text-primary-600" />
                  </div>

                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setPreviewDoc(doc)}>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{doc.title}</h3>
                      <Badge variant={statusVariant(doc.status)} size="sm">
                        {doc.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span>v{doc.version}</span>
                      <span>Uploaded {formatDate(doc.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-2"
                      aria-label="Sign"
                      onClick={() => setSigningDoc(doc)}
                    >
                      <PenTool size={18} />
                    </Button>

                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" download>
                      <Button variant="ghost" size="sm" className="p-2" aria-label="Download">
                        <Download size={18} />
                      </Button>
                    </a>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-2 text-error-600 hover:text-error-700"
                      aria-label="Delete"
                      onClick={() => handleDelete(doc._id)}
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* PDF Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-4 relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
              onClick={() => {
                setPreviewDoc(null);
                setNumPages(null);
              }}
            >
              <X size={22} />
            </button>
            <h3 className="text-lg font-medium mb-4">{previewDoc.title}</h3>

            {previewDoc.fileType === 'application/pdf' ? (
              <PdfDocument
                file={previewDoc.fileUrl}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                loading={<p className="text-gray-500">Loading PDF...</p>}
                error={<p className="text-red-500">Failed to load PDF.</p>}
              >
                {Array.from(new Array(numPages || 0), (_, index) => (
                  <PdfPage key={index} pageNumber={index + 1} width={600} className="mb-4" />
                ))}
              </PdfDocument>
            ) : (
              <img src={previewDoc.fileUrl} alt={previewDoc.title} className="w-full rounded" />
            )}

            {previewDoc.signature?.imageUrl && (
              <div className="mt-4 border-t pt-4">
                <p className="text-sm text-gray-500 mb-2">Signed:</p>
                <img src={previewDoc.signature.imageUrl} alt="Signature" className="h-20" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {signingDoc && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
              onClick={() => setSigningDoc(null)}
            >
              <X size={22} />
            </button>
            <h3 className="text-lg font-medium mb-2">Sign: {signingDoc.title}</h3>
            <p className="text-sm text-gray-500 mb-4">Draw your signature below</p>

            <div className="border border-gray-300 rounded-md">
              <SignatureCanvas
                ref={sigCanvasRef}
                penColor="black"
                canvasProps={{ width: 460, height: 200, className: 'w-full' }}
              />
            </div>

            <div className="flex justify-between mt-4">
              <Button variant="outline" size="sm" onClick={() => sigCanvasRef.current?.clear()}>
                Clear
              </Button>
              <Button size="sm" onClick={handleSaveSignature}>
                Save Signature
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};