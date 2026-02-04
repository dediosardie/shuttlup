import { useState, useEffect } from 'react';
import { DriverAttendance } from '../types';
import { attendanceService } from '../services/attendanceService';
import { authService } from '../services/authService';
import { Button, Card } from './ui';

export default function DriverAttendancePage() {
  const [loading, setLoading] = useState(false);
  const [hasActiveLogin, setHasActiveLogin] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<DriverAttendance[]>([]);
  const [currentDriver, setCurrentDriver] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    loadCurrentDriver();
  }, []);

  useEffect(() => {
    if (currentDriver) {
      checkTodayStatus();
      loadAttendanceHistory();
    }
  }, [currentDriver]);

  const loadCurrentDriver = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (user) {
        setCurrentDriver(user);
      }
    } catch (error) {
      console.error('Failed to load current driver:', error);
      setError('Failed to load driver information');
    }
  };

  const checkTodayStatus = async () => {
    if (!currentDriver) return;
    
    try {
      const hasLogin = await attendanceService.hasActiveLogin(currentDriver.id);
      setHasActiveLogin(hasLogin);
    } catch (error) {
      console.error('Failed to check login status:', error);
    }
  };

  const loadAttendanceHistory = async () => {
    if (!currentDriver) return;
    
    try {
      const records = await attendanceService.getDriverAttendance(currentDriver.id);
      setAttendanceHistory(records);
    } catch (error) {
      console.error('Failed to load attendance history:', error);
    }
  };

  const captureImage = async () => {
    setCapturing(true);
    setError(null);

    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera API is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Edge.');
        setCapturing(false);
        return;
      }

      // Request camera access and capture a single frame
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 },
      });

      // Create video element to capture the frame
      const video = document.createElement('video');
      video.srcObject = mediaStream;
      video.muted = true;
      video.playsInline = true;

      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve();
        };
      });

      // Wait a brief moment for the camera to adjust
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capture frame to canvas
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');

      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to blob and file
        await new Promise<void>((resolve) => {
          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], `attendance_${Date.now()}.jpg`, { type: 'image/jpeg' });
              setImageFile(file);
              setCapturedImage(canvas.toDataURL('image/jpeg'));
            }
            resolve();
          }, 'image/jpeg', 0.8);
        });
      }

      // Stop camera stream after capture is complete
      mediaStream.getTracks().forEach(track => track.stop());
      
    } catch (error: any) {
      console.error('Camera access error:', error);
      
      // Provide specific error messages based on error type
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera access in your browser settings and refresh the page.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setError('No camera device found. Please connect a camera and try again.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setError('Camera is already in use by another application. Please close other apps using the camera.');
      } else if (error.name === 'OverconstrainedError') {
        setError('Camera settings are not supported. Please check your device.');
      } else if (error.name === 'SecurityError') {
        setError('Camera access blocked due to security settings. Please ensure you are using HTTPS or localhost.');
      } else {
        setError(`Unable to access camera: ${error.message || 'Unknown error'}. Please check browser permissions.`);
      }
    } finally {
      setCapturing(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setImageFile(null);
  };

  const getLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          reject(new Error('Unable to retrieve location'));
        }
      );
    });
  };

  const handleAttendance = async (actionType: 'login' | 'logout') => {
    if (!currentDriver) {
      setError('Driver information not available');
      return;
    }

    if (!capturedImage || !imageFile) {
      setError('⚠️ Image required! Please capture your photo before recording attendance.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get location
      const location = await getLocation();

      // Create attendance record
      await attendanceService.createAttendance(
        currentDriver.id,
        actionType,
        imageFile,
        location.latitude,
        location.longitude
      );

      // Reset states
      setCapturedImage(null);
      setImageFile(null);
      
      // Reload data
      await checkTodayStatus();
      await loadAttendanceHistory();

      alert(`${actionType.toUpperCase()} recorded successfully!`);
    } catch (error: any) {
      console.error('Attendance error:', error);
      setError(error.message || `Failed to record ${actionType}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-bg-primary p-2 sm:p-4">
      <div className="max-w-md mx-auto space-y-3">
        {/* Header */}
        <Card className="p-3 bg-bg-secondary border border-border-muted">
          <h1 className="text-sm font-semibold text-text-primary">Driver Attendance</h1>
          {currentDriver && (
            <p className="text-xs text-text-secondary mt-1">{currentDriver.full_name || currentDriver.email}</p>
          )}
        </Card>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
            <div className="flex gap-2">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-xs text-red-400 whitespace-pre-wrap">{error}</p>
                {error.includes('permission') && (
                  <div className="mt-2 text-[11px] text-text-muted">
                    <p className="font-semibold mb-1">How to enable camera:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>Chrome: Click the camera icon in the address bar</li>
                      <li>Firefox: Click the permissions icon next to the URL</li>
                      <li>Safari: Settings → Privacy → Camera</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Camera Section */}
        <Card className="p-3 bg-bg-secondary border border-border-muted">
          <h2 className="text-xs font-medium text-text-primary mb-2">Capture Photo</h2>
          
          {!capturedImage ? (
            <Button
              onClick={captureImage}
              variant="secondary"
              className="w-full text-sm py-3"
              disabled={capturing}
            >
              {capturing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  Capturing...
                </span>
              ) : (
                '📷 Capture Photo'
              )}
            </Button>
          ) : (
            <div className="space-y-2">
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full rounded-lg border border-border-muted"
              />
              <Button
                onClick={retakePhoto}
                variant="secondary"
                className="w-full text-sm py-2"
              >
                🔄 Retake Photo
              </Button>
            </div>
          )}
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => handleAttendance('login')}
            disabled={loading || hasActiveLogin || !capturedImage || !imageFile}
            variant="primary"
            className="py-6 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            title={!capturedImage ? 'Please capture an image first' : hasActiveLogin ? 'Already logged in today' : 'Click to record login'}
          >
            {loading ? '⏳' : '🟢'} LOGIN
          </Button>
          
          <Button
            onClick={() => handleAttendance('logout')}
            disabled={loading || !hasActiveLogin || !capturedImage || !imageFile}
            variant="danger"
            className="py-6 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            title={!capturedImage ? 'Please capture an image first' : !hasActiveLogin ? 'Please login first' : 'Click to record logout'}
          >
            {loading ? '⏳' : '🔴'} LOGOUT
          </Button>
        </div>

        {/* Status Info */}
        <Card className="p-3 bg-bg-elevated border border-border-muted">
          <p className="text-xs text-text-primary">
            Status: {hasActiveLogin ? '🟢 Logged In' : '⚪ Logged Out'}
          </p>
        </Card>

        {/* Attendance History */}
        <Card className="p-3 bg-bg-secondary border border-border-muted">
          <h2 className="text-xs font-medium text-text-primary mb-3">Attendance History</h2>
          
          {attendanceHistory.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-4">No attendance records found</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {attendanceHistory.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-2 bg-bg-elevated rounded-lg border border-border-muted"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${
                        record.action_type === 'login' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {record.action_type === 'login' ? '🟢 LOGIN' : '🔴 LOGOUT'}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary mt-1">
                      {formatDateTime(record.timestamp)}
                    </p>
                    {record.latitude && record.longitude && (
                      <p className="text-[11px] text-text-muted mt-0.5">
                        📍 {record.latitude.toFixed(4)}, {record.longitude.toFixed(4)}
                      </p>
                    )}
                  </div>
                  
                  {record.image_url && (
                    <img
                      src={record.image_url}
                      alt="Attendance"
                      className="w-12 h-12 rounded object-cover border border-border-muted"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
