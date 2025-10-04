import React, { useState, useEffect, useRef } from 'react';
import './AdminHistory.css';

interface AttendanceImageRecord {
  imageId: string;
  studentId: string | null;
  studentName?: string;
  subjectId?: string;
  subjectName?: string;
  status: string;
  capturedAt: string;
  imageData: string; // base64 image data
  confidence: number;
  ipAddress?: string;
}

interface AdminHistoryProps {
	onClose?: () => void;
}const AdminHistory: React.FC<AdminHistoryProps> = ({ onClose }) => {
  const [records, setRecords] = useState<AttendanceImageRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceImageRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceImageRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const API_BASE = '/api/storage';
  const containerRef = useRef<HTMLDivElement>(null);

  // Load captured images from backend API (using working StorageService)
  useEffect(() => {
    const loadRecords = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await fetch(`${API_BASE}/captured-images?limit=100`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
          setRecords(data.images); // Note: StorageService returns 'images', not 'records'
          console.log(`✅ Loaded ${data.count} captured images from database`);
        } else {
          throw new Error(data.message || 'Failed to load images');
        }
        
      } catch (error) {
        console.error('Error loading attendance records:', error);
        setError(error instanceof Error ? error.message : 'Failed to load records');
      } finally {
        setLoading(false);
      }
    };

    loadRecords();
  }, []);

  // Extract available dates from records and set up date navigation
  const availableDates = React.useMemo(() => {
    const dates = records.map(record => {
      const capturedDate = new Date(record.capturedAt);
      return capturedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    });
    
    // Remove duplicates and sort by date (newest first)
    const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    return uniqueDates;
  }, [records]);

  // Current date index for navigation
  const [currentDateIndex, setCurrentDateIndex] = useState<number>(0);
  const activeDate = availableDates[currentDateIndex];

  // Filter records by active date
  React.useEffect(() => {
    if (!activeDate) {
      setFilteredRecords(records);
      return;
    }
    
    const filtered = records.filter(record => {
      const recordDate = new Date(record.capturedAt).toISOString().split('T')[0];
      return recordDate === activeDate;
    });
    
    setFilteredRecords(filtered);
    
    // Clear selected record when changing date to avoid showing detail for non-visible record
    setSelectedRecord(null);
    
    console.log(`📅 Filtered records for ${activeDate}: ${filtered.length} records`);
  }, [records, activeDate]);

  // Handle click outside to close detail panel (more sensitive area)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Close if clicking outside the main grid area, but not on detail panel
      if (!target.closest('.records-grid') && !target.closest('.record-detail-panel')) {
        setSelectedRecord(null);
      }
    };

    if (selectedRecord) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [selectedRecord]);

  const downloadImage = (record: AttendanceImageRecord) => {
    if (!record.imageData) return;
    
    const link = document.createElement('a');
    link.href = record.imageData;
    link.download = `attendance_${record.studentName || record.studentId || 'unknown'}_${record.capturedAt.replace(/[:\s]/g, '_')}.png`;
    link.click();
  };

  // Navigate to today if available
  const goToToday = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayIndex = availableDates.indexOf(today);
    if (todayIndex !== -1) {
      setCurrentDateIndex(todayIndex);
    }
  };

  // Navigate to latest (most recent) date
  const goToLatest = () => {
    setCurrentDateIndex(0);
  };

  const formatStatus = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'PRESENT': '✅ Có mặt',
      'LATE': '⏰ Trễ',
      'ABSENT': '❌ Vắng mặt'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      'PRESENT': 'text-green-600',
      'LATE': 'text-yellow-600', 
      'ABSENT': 'text-red-600'
    };
    return colorMap[status] || 'text-gray-600';
  };

  return (
    <div className="admin-history-fullwidth" ref={containerRef}>
      <header className="admin-history-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">📸 Attendance History</h1>
            <div className="flex items-center gap-4">
              <p className="text-gray-600">Lịch sử điểm danh có hình ảnh ({filteredRecords.length} records)</p>
              <p className="text-sm text-blue-600">Dates: {availableDates.length} | Current: {currentDateIndex} | Available: [{availableDates.slice(0, 3).join(', ')}{availableDates.length > 3 ? '...' : ''}]</p>
              
              {/* Date Navigation - Always show if we have dates */}
              {availableDates.length > 0 && (
                <div className="date-navigation">
                  <button
                    type="button"
                    className="date-nav-btn"
                    onClick={() => setCurrentDateIndex(i => Math.max(0, i - 1))}
                    disabled={currentDateIndex === 0}
                    aria-label="Ngày mới hơn"
                  >
                    ← Mới hơn
                  </button>
                  <span className="current-date">{activeDate || 'Tất cả'}</span>
                  <button
                    type="button"
                    className="date-nav-btn"
                    onClick={() => setCurrentDateIndex(i => Math.min(availableDates.length - 1, i + 1))}
                    disabled={currentDateIndex >= availableDates.length - 1}
                    aria-label="Ngày cũ hơn"
                  >
                    Cũ hơn →
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-3">
            {/* Quick Navigation */}
            {availableDates.length > 0 && (
              <>
                <button 
                  className="btn btn-secondary"
                  onClick={goToLatest}
                >
                  📅 Mới nhất
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={goToToday}
                >
                  🗓️ Hôm nay
                </button>
              </>
            )}
            
            <button 
              className="btn btn-refresh"
              onClick={() => window.location.reload()}
            >
              🔄 Refresh
            </button>
            {onClose && (
              <button 
                className="btn btn-close"
                onClick={onClose}
              >
                ❌ Đóng
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="admin-history-content">
        {loading ? (
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <h3>Đang tải dữ liệu...</h3>
            <p>Vui lòng chờ trong giây lát</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <div className="empty-icon">❌</div>
            <h3>Lỗi tải dữ liệu</h3>
            <p>{error}</p>
            <button 
              className="btn btn-refresh"
              onClick={() => window.location.reload()}
            >
              🔄 Thử lại
            </button>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📷</div>
            <h3>Không có dữ liệu cho ngày này</h3>
            <p>Không có record nào có hình ảnh cho {activeDate || 'ngày đã chọn'}</p>
          </div>
        ) : (
          <div className={`records-layout ${selectedRecord ? 'with-detail' : 'full-width'}`}>
            {/* Records Grid */}
            <div className="records-grid">
              <h3>
                Records cho {activeDate || 'Tất cả'} ({filteredRecords.length})
                {availableDates.length > 1 && (
                  <span className="text-sm text-gray-500 font-normal ml-2">
                    • {currentDateIndex + 1}/{availableDates.length} ngày
                  </span>
                )}
              </h3>
              <div className="grid-container">
                {filteredRecords.map((record) => (
                  <div 
                    key={record.imageId}
                    className={`record-card ${selectedRecord?.imageId === record.imageId ? 'selected' : ''}`}
                    onClick={() => {
                      // Toggle: if same record clicked, close detail. If different record, switch detail
                      if (selectedRecord?.imageId === record.imageId) {
                        setSelectedRecord(null);
                      } else {
                        setSelectedRecord(record);
                      }
                    }}
                  >
                    <div className="record-image">
                      {record.imageData ? (
                        <img 
                          src={record.imageData} 
                          alt={`${record.studentName || record.studentId} - ${record.capturedAt}`}
                          className="attendance-image"
                        />
                      ) : (
                        <div className="no-image">
                          📷 No Image
                        </div>
                      )}
                      <div className="record-overlay">
                        <div className={`status-badge ${record.status.toLowerCase()}`}>
                          {formatStatus(record.status)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="record-info">
                      <div className="student-name">{record.studentName || record.studentId || 'Unknown'}</div>
                      <div className="subject-info">{record.subjectId}</div>
                      <div className="timestamp">{new Date(record.capturedAt).toLocaleString('vi-VN')}</div>
                      {record.confidence && (
                        <div className="confidence">Confidence: {record.confidence.toFixed(1)}%</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Record Detail Panel */}
            {selectedRecord && (
              <div className="record-detail-panel">
                <div className="detail-header">
                  <h3>📋 Chi tiết điểm danh</h3>
                  <button 
                    className="close-detail-btn"
                    onClick={() => setSelectedRecord(null)}
                  >
                    ✕
                  </button>
                </div>
                
                {selectedRecord.imageData && (
                  <div className="detail-image-wrapper">
                    <img 
                      src={selectedRecord.imageData} 
                      alt={`${selectedRecord.studentName || selectedRecord.studentId} - ${selectedRecord.capturedAt}`}
                      className="detail-image"
                    />
                  </div>
                )}
                
                <div className="detail-info">
                  <div className="info-row">
                    <span className="label">Sinh viên:</span>
                    <span className="value">{selectedRecord.studentName || selectedRecord.studentId || 'Unknown'}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Student ID:</span>
                    <span className="value">{selectedRecord.studentId || 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Môn học:</span>
                    <span className="value">{selectedRecord.subjectName || selectedRecord.subjectId || 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Thời gian:</span>
                    <span className="value">{new Date(selectedRecord.capturedAt).toLocaleString('vi-VN')}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Trạng thái:</span>
                    <span className={`value ${getStatusColor(selectedRecord.status)}`}>
                      {formatStatus(selectedRecord.status)}
                    </span>
                  </div>
                  {selectedRecord.confidence && (
                    <div className="info-row">
                      <span className="label">Confidence:</span>
                      <span className="value">{selectedRecord.confidence.toFixed(1)}%</span>
                    </div>
                  )}
                  {selectedRecord.ipAddress && (
                    <div className="info-row">
                      <span className="label">IP Address:</span>
                      <span className="value">{selectedRecord.ipAddress}</span>
                    </div>
                  )}
                  <div className="info-row">
                    <span className="label">Image ID:</span>
                    <span className="value text-xs text-gray-500">{selectedRecord.imageId}</span>
                  </div>
                </div>

                <div className="detail-actions">
                  {selectedRecord.imageData && (
                    <button 
                      className="btn btn-download"
                      onClick={() => downloadImage(selectedRecord)}
                    >
                      💾 Download Image
                    </button>
                  )}
                  
                  <button 
                    className="btn btn-secondary"
                    onClick={() => setSelectedRecord(null)}
                  >
                    ❌ Đóng chi tiết
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminHistory;