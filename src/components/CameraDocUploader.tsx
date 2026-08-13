import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, FileText, X, Check, RefreshCw, Eye, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface CameraDocUploaderProps {
  label?: string;
  value?: string | null;
  fileName?: string;
  onChange: (base64Data: string, name?: string) => void;
  onClear?: () => void;
  accept?: string;
  compact?: boolean;
}

export const CameraDocUploader: React.FC<CameraDocUploaderProps> = ({
  label = 'Upload Documents or Take Picture',
  value,
  fileName,
  onChange,
  onClear,
  accept = 'image/*,application/pdf,.doc,.docx,.txt',
  compact = false
}) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera stream on unmount or when modal closes
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const stopCameraStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    setCameraError('');
    setCapturedImage(null);
    setIsCameraOpen(true);

    // Stop existing stream first if active
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser or environment.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      setStream(mediaStream);
      setFacingMode(mode);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access was denied. Please allow camera permissions in browser site settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera device found on this system.');
      } else {
        setCameraError(err.message || 'Unable to access camera. You can also upload a document file.');
      }
    }
  };

  const handleCloseCamera = () => {
    stopCameraStream();
    setIsCameraOpen(false);
    setCapturedImage(null);
    setCameraError('');
  };

  const handleSnapPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setCapturedImage(dataUrl);
    }
  };

  const handleConfirmPhoto = () => {
    if (capturedImage) {
      const timeStamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      onChange(capturedImage, `Camera_Photo_${timeStamp}.jpg`);
      handleCloseCamera();
    }
  };

  const handleSwitchCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(nextMode);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const name = file.name;
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        onChange(result, name);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-2">
      {label && <label className="block text-xs font-medium text-slate-300">{label}</label>}

      {value ? (
        /* Attached Document / Photo Preview Bar */
        <div className="bg-[#090a0c] border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            {value.startsWith('data:image') || value.startsWith('http') ? (
              <img
                src={value}
                alt="Document proof"
                className="w-11 h-11 rounded-lg object-cover border border-white/10 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setIsPreviewOpen(true)}
              />
            ) : (
              <div className="w-11 h-11 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">
                {fileName || 'Document / Receipt Attached'}
              </div>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                <Check className="w-3 h-3" /> Photo / Document Ready
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {(value.startsWith('data:image') || value.startsWith('http')) && (
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs flex items-center gap-1"
                title="View Document"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-indigo-400 text-xs flex items-center gap-1"
              title="Replace File"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (onClear) onClear();
              }}
              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs flex items-center gap-1"
              title="Remove File"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Initial Options: Upload File or Take Picture */
        <div className={`grid grid-cols-1 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2'} gap-2.5`}>
          
          {/* Upload File / Document Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 px-3.5 py-3 rounded-xl bg-[#090a0c] hover:bg-white/5 border border-dashed border-white/15 text-slate-300 hover:text-white text-xs font-medium transition-all group active:scale-95"
          >
            <Upload className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span>Upload Documents / Files</span>
          </button>

          {/* Take Picture with Camera Button */}
          <button
            type="button"
            onClick={() => startCamera()}
            className="flex items-center justify-center gap-2 px-3.5 py-3 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 text-xs font-medium transition-all group active:scale-95"
          >
            <Camera className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span>Take Picture (Camera)</span>
          </button>
        </div>
      )}

      {/* Hidden Native File Input with Document and Mobile Camera Capture support */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Hidden Canvas for video frame snapshots */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Live Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#14161c] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col space-y-4 p-5">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Capture Document or Receipt Photo</h3>
              </div>
              <button
                type="button"
                onClick={handleCloseCamera}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Camera Viewfinder / Preview */}
            <div className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
              {cameraError ? (
                <div className="p-6 text-center space-y-3 max-w-xs">
                  <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="text-xs text-slate-300">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-medium"
                  >
                    Upload File Instead
                  </button>
                </div>
              ) : capturedImage ? (
                <img
                  src={capturedImage}
                  alt="Captured Snapshot"
                  className="w-full h-full object-contain"
                />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Viewfinder Target Framing Overlay */}
                  <div className="absolute inset-8 border-2 border-dashed border-indigo-400/50 rounded-xl pointer-events-none flex items-center justify-center">
                    <span className="text-[10px] text-indigo-300 bg-black/60 px-2 py-1 rounded-md backdrop-blur-sm">
                      Align document / receipt in frame
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Camera Control Action Buttons */}
            {!cameraError && (
              <div className="flex items-center justify-between pt-1">
                {capturedImage ? (
                  /* Post-Snap Controls */
                  <>
                    <button
                      type="button"
                      onClick={() => setCapturedImage(null)}
                      className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Retake Photo
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmPhoto}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-950/50"
                    >
                      <Check className="w-4 h-4" /> Use This Photo
                    </button>
                  </>
                ) : (
                  /* Live Viewfinder Controls */
                  <>
                    <button
                      type="button"
                      onClick={handleSwitchCamera}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs flex items-center gap-1.5"
                      title="Switch Camera (Front / Back)"
                    >
                      <RefreshCw className="w-4 h-4" /> Flip
                    </button>

                    <button
                      type="button"
                      onClick={handleSnapPhoto}
                      className="px-6 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-xl shadow-indigo-900/50 active:scale-95 transition-all"
                    >
                      <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                      Take Picture
                    </button>

                    <button
                      type="button"
                      onClick={handleCloseCamera}
                      className="px-3.5 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-xs"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* Image Preview Overlay Modal */}
      {isPreviewOpen && value && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#14161c] border border-white/10 rounded-2xl max-w-2xl w-full p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs font-bold text-white">{fileName || 'Attached Document Preview'}</span>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-black rounded-xl p-2">
              <img src={value} alt="Proof Full Preview" className="max-w-full max-h-[65vh] object-contain rounded-lg" />
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-medium"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
