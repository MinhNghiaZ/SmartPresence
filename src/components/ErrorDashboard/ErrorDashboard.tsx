import React, { useState, useEffect } from 'react';
import { ErrorTracker, ErrorCategory, ErrorSeverity } from '../../utils/ErrorTracker';
import type { ErrorInfo, ErrorStats } from '../../utils/ErrorTracker';
import './ErrorDashboard.css';

/**
 * ErrorDashboard - Component hiển thị errors và device info
 * 
 * Sử dụng cho:
 * - Debug mode (developers)
 * - Support (admin xem lỗi của users)
 * - Testing (xác nhận error tracking hoạt động)
 */

interface ErrorDashboardProps {
  maxErrors?: number;
  showDeviceInfo?: boolean;
}

export const ErrorDashboard: React.FC<ErrorDashboardProps> = ({
  maxErrors = 10,
  showDeviceInfo = true
}) => {
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [errors, setErrors] = useState<ErrorInfo[]>([]);
  const [selectedError, setSelectedError] = useState<ErrorInfo | null>(null);
  const [filter, setFilter] = useState<ErrorCategory | 'ALL'>('ALL');

  useEffect(() => {
    loadErrors();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(loadErrors, 5000);
    return () => clearInterval(interval);
  }, [filter]);

  const loadErrors = () => {
    const newStats = ErrorTracker.getStats();
    setStats(newStats);

    let allErrors = ErrorTracker.getAllErrors();
    
    // Filter by category
    if (filter !== 'ALL') {
      allErrors = allErrors.filter(e => e.category === filter);
    }

    // Sort by timestamp (newest first)
    allErrors.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Limit
    setErrors(allErrors.slice(0, maxErrors));
  }

  const getSeverityColor = (severity: ErrorSeverity): string => {
    switch (severity) {
      case ErrorSeverity.CRITICAL: return '#dc2626';
      case ErrorSeverity.HIGH: return '#ea580c';
      case ErrorSeverity.MEDIUM: return '#ca8a04';
      case ErrorSeverity.LOW: return '#16a34a';
      case ErrorSeverity.INFO: return '#2563eb';
      default: return '#6b7280';
    }
  };

  const getCategoryColor = (category: ErrorCategory): string => {
    switch (category) {
      case ErrorCategory.STORAGE: return '#8b5cf6';
      case ErrorCategory.AUTHENTICATION: return '#dc2626';
      case ErrorCategory.API: return '#2563eb';
      case ErrorCategory.FACE_RECOGNITION: return '#06b6d4';
      case ErrorCategory.GPS: return '#10b981';
      case ErrorCategory.NETWORK: return '#f59e0b';
      case ErrorCategory.PERMISSION: return '#ef4444';
      case ErrorCategory.DEVICE: return '#6366f1';
      default: return '#6b7280';
    }
  };

  const exportErrors = () => {
    const json = ErrorTracker.exportErrors();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `errors_${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearErrors = () => {
    if (confirm('Xóa tất cả errors?')) {
      ErrorTracker.clearErrors();
      loadErrors();
      setSelectedError(null);
    }
  };

  if (!stats) {
    return <div>Loading...</div>;
  }

  return (
    <div className="error-dashboard">
      <div className="error-dashboard-header">
        <h2>🔍 Error Dashboard</h2>
        <div className="error-dashboard-actions">
          <button onClick={exportErrors} className="btn-export">
            📥 Export
          </button>
          <button onClick={clearErrors} className="btn-clear">
            🗑️ Clear All
          </button>
          <button onClick={loadErrors} className="btn-refresh">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="error-stats">
        <div className="stat-card">
          <h3>Total Errors</h3>
          <div className="stat-value">{stats.total}</div>
        </div>

        <div className="stat-card">
          <h3>Critical</h3>
          <div className="stat-value" style={{ color: getSeverityColor(ErrorSeverity.CRITICAL) }}>
            {stats.bySeverity[ErrorSeverity.CRITICAL] || 0}
          </div>
        </div>

        <div className="stat-card">
          <h3>High Priority</h3>
          <div className="stat-value" style={{ color: getSeverityColor(ErrorSeverity.HIGH) }}>
            {stats.bySeverity[ErrorSeverity.HIGH] || 0}
          </div>
        </div>

        <div className="stat-card">
          <h3>Medium</h3>
          <div className="stat-value" style={{ color: getSeverityColor(ErrorSeverity.MEDIUM) }}>
            {stats.bySeverity[ErrorSeverity.MEDIUM] || 0}
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="error-filters">
        <button
          className={`filter-btn ${filter === 'ALL' ? 'active' : ''}`}
          onClick={() => setFilter('ALL')}
        >
          All
        </button>
        {Object.values(ErrorCategory).map(cat => {
          const count = stats.byCategory[cat] || 0;
          if (count === 0) return null;
          
          return (
            <button
              key={cat}
              className={`filter-btn ${filter === cat ? 'active' : ''}`}
              onClick={() => setFilter(cat)}
              style={{ borderColor: getCategoryColor(cat) }}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Device Info */}
      {showDeviceInfo && errors.length > 0 && (
        <div className="device-info">
          <h3>📱 Device Information</h3>
          <div className="device-grid">
            <div><strong>Platform:</strong> {errors[0].device.platform}</div>
            <div><strong>Type:</strong> {errors[0].device.isMobile ? 'Mobile' : 'Desktop'}</div>
            <div>
              <strong>Performance:</strong> 
              <span style={{ color: errors[0].device.isWeakDevice ? '#dc2626' : '#16a34a' }}>
                {errors[0].device.isWeakDevice ? ' Weak Device' : ' Strong Device'}
              </span>
            </div>
            <div><strong>Memory:</strong> {errors[0].device.memoryGB || 'Unknown'} GB</div>
            <div><strong>Cores:</strong> {errors[0].device.cores || 'Unknown'}</div>
            <div><strong>Screen:</strong> {errors[0].device.screenWidth}x{errors[0].device.screenHeight}</div>
          </div>
        </div>
      )}

      {/* Error List */}
      <div className="error-list">
        <h3>Recent Errors ({errors.length})</h3>
        {errors.length === 0 ? (
          <div className="no-errors">✅ No errors found</div>
        ) : (
          <div className="errors-container">
            {errors.map(error => (
              <div
                key={error.id}
                className={`error-item ${selectedError?.id === error.id ? 'selected' : ''}`}
                onClick={() => setSelectedError(error)}
              >
                <div className="error-header">
                  <span
                    className="error-severity"
                    style={{ backgroundColor: getSeverityColor(error.severity) }}
                  >
                    {error.severity}
                  </span>
                  <span
                    className="error-category"
                    style={{ backgroundColor: getCategoryColor(error.category) }}
                  >
                    {error.category}
                  </span>
                  <span className="error-time">
                    {error.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="error-message">{error.message}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error Details */}
      {selectedError && (
        <div className="error-details">
          <div className="error-details-header">
            <h3>Error Details</h3>
            <button onClick={() => setSelectedError(null)}>✕</button>
          </div>

          <div className="detail-section">
            <strong>ID:</strong>
            <code>{selectedError.id}</code>
          </div>

          <div className="detail-section">
            <strong>Timestamp:</strong>
            <div>{selectedError.timestamp.toLocaleString()}</div>
          </div>

          <div className="detail-section">
            <strong>Message:</strong>
            <div>{selectedError.message}</div>
          </div>

          <div className="detail-section">
            <strong>Solution:</strong>
            <div className="solution-box">{selectedError.solution}</div>
          </div>

          {selectedError.context && (
            <div className="detail-section">
              <strong>Context:</strong>
              <pre>{JSON.stringify(selectedError.context, null, 2)}</pre>
            </div>
          )}

          {selectedError.stack && (
            <div className="detail-section">
              <strong>Stack Trace:</strong>
              <pre className="stack-trace">{selectedError.stack}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ErrorDashboard;
