import React, { useState, useEffect, useRef } from 'react';
import './AdminHistory.css';
import { authService } from '../../Services/AuthService';
import SubjectServiceClass from '../../Services/SubjectService';
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

interface Subject {
  subjectId: string;
  name: string;
  code: string;
}

interface AdminHistoryProps {
	onClose?: () => void;
}

const AdminHistory: React.FC<AdminHistoryProps> = ({ onClose }) => {
  const [records, setRecords] = useState<AttendanceImageRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceImageRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceImageRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL'); // 'ALL' or subjectId
  const API_BASE = '/api/storage';
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Function to load records from API
  const loadRecords = async () => {
    try {
      setLoading(true);
      setError('');

      const token = authService.getToken();
      const response = await fetch(`${API_BASE}/captured-images?limit=100`,{
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
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

  // Function to load subjects from API
  const loadSubjects = async () => {
    try {
      const data = await SubjectServiceClass.getAllSubjects();
      setSubjects(data);
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  // Function to refresh data only (not reload page)
  const refreshData = async () => {
    await loadRecords();
  };

  // Load captured images from backend API (using working StorageService)
  useEffect(() => {
    loadRecords();
    loadSubjects();
  }, []);

  // Extract available dates from records and set up date navigation
  const availableDates = React.useMemo(() => {
    // Filter records by selected subject first
    let relevantRecords = records;
    if (selectedSubject !== 'ALL') {
      relevantRecords = records.filter(record => record.subjectId === selectedSubject);
    }
    
    const dates = relevantRecords.map(record => {
      const capturedDate = new Date(record.capturedAt);
      return capturedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    });
    
    // Remove duplicates and sort by date (newest first)
    const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    return uniqueDates;
  }, [records, selectedSubject]);

  // Current date index for navigation
  const [currentDateIndex, setCurrentDateIndex] = useState<number>(0);
  const activeDate = availableDates[currentDateIndex];

  // Reset date index when subject changes
  useEffect(() => {
    setCurrentDateIndex(0);
  }, [selectedSubject]);

  // Filter records by active date and subject
  React.useEffect(() => {
    let filtered = records;
    
    // Filter by subject if not ALL
    if (selectedSubject !== 'ALL') {
      filtered = filtered.filter(record => record.subjectId === selectedSubject);
    }
    
    // Filter by date if activeDate is set
    if (activeDate) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.capturedAt).toISOString().split('T')[0];
        return recordDate === activeDate;
      });
    }
    
    setFilteredRecords(filtered);
    
    // Clear selected record when changing filter to avoid showing detail for non-visible record
    setSelectedRecord(null);
    
    console.log(`📅 Filtered records for ${activeDate || 'All dates'}, Subject: ${selectedSubject}: ${filtered.length} records`);
  }, [records, activeDate, selectedSubject]);

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

  const formatStatus = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'PRESENT': '✅ Có mặt',
      'LATE': '⏰ Trễ', 
      'ABSENT': '❌ Vắng mặt',
      'SUCCESS': '✅ Nhận diện thành công',
      'FAILED': '❌ Nhận diện thất bại',
      'UNKNOWN': '❓ Không xác định'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      'PRESENT': 'text-green-600',
      'LATE': 'text-yellow-600', 
      'ABSENT': 'text-red-600',
      'SUCCESS': 'text-green-600',
      'FAILED': 'text-red-600',
      'UNKNOWN': 'text-gray-600'
    };
    return colorMap[status] || 'text-gray-600';
  };

  return (
    <div className="admin-history-fullwidth" ref={containerRef}>
      <header className="admin-history-header">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-800 mb-3">📸 Attendance History</h1>
            <div className="flex flex-col gap-2">
              <p className="text-gray-600">Lịch sử điểm danh có hình ảnh ({filteredRecords.length} records)</p>
              
              <div className="flex items-center gap-3 flex-wrap">
                {/* Subject Filter */}
                <div className="subject-filter-inline">
                  <label className="text-sm font-medium text-gray-700">Môn học:</label>
                  <select 
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="subject-select"
                  >
                    <option value="ALL">Tất cả môn học</option>
                    {subjects.map(subject => (
                      <option key={subject.subjectId} value={subject.subjectId}>
                        {subject.code} - {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
                
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
          </div>
          
          <div className="flex gap-3">
            {/* Quick Navigation removed - Mới nhất and Hôm nay buttons */}
            
            <button 
              className="btn btn-refresh"
              onClick={refreshData}
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
              onClick={refreshData}
            >
              🔄 Thử lại
            </button>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📷</div>
            <h3>Không có dữ liệu</h3>
            <p>
              Không có record nào có hình ảnh cho{' '}
              {selectedSubject !== 'ALL' 
                ? `môn ${subjects.find(s => s.subjectId === selectedSubject)?.code || 'đã chọn'} - ` 
                : ''}
              {activeDate || 'ngày đã chọn'}
            </p>
          </div>
        ) : (
          <div className={`records-layout ${selectedRecord ? 'with-detail' : 'full-width'}`}>
            {/* Records Grid */}
            <div className="records-grid">
              <h3>
                {selectedSubject !== 'ALL' 
                  ? `${subjects.find(s => s.subjectId === selectedSubject)?.code || 'Môn học'} - ` 
                  : 'Tất cả môn - '}
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
                      <div className="student-name">{record.studentName || `ID: ${record.studentId}` || 'Không xác định'}</div>
                      <div className="subject-info">{record.subjectName || record.subjectId}</div>
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
                    <span className="value">{selectedRecord.studentName || `ID: ${selectedRecord.studentId}` || 'Không xác định'}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Student ID:</span>
                    <span className="value">{selectedRecord.studentId || 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Môn học:</span>
                    <span className="value">{selectedRecord.subjectName || `ID: ${selectedRecord.subjectId}` || 'N/A'}</span>
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