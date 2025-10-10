/**
 * GPS Accuracy Test Component
 * So sánh độ chính xác giữa getCurrentLocation() và getAccurateLocation()
 */

import { useState } from 'react';
import { GPSService } from '../../Services/GPSService/GpsService';
import type { Location } from '../../Services/GPSService/GpsService';

interface TestResult {
  method: string;
  location: Location;
  duration: number;
  timestamp: Date;
}

export const GPSAccuracyTest = () => {
  const [testing, setTesting] = useState(false);
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState<TestResult[]>([]);

  const testSingleSample = async () => {
    setTesting(true);
    setProgress('Testing getCurrentLocation() - 1 sample...');
    
    try {
      const startTime = Date.now();
      const location = await GPSService.getCurrentLocation();
      const duration = Date.now() - startTime;

      const result: TestResult = {
        method: 'getCurrentLocation() [DEPRECATED]',
        location,
        duration,
        timestamp: new Date()
      };

      setResults(prev => [...prev, result]);
      setProgress(`✅ Done in ${duration}ms`);
    } catch (error) {
      setProgress(`❌ Error: ${(error as Error).message}`);
    } finally {
      setTesting(false);
    }
  };

  const testMultipleSamples = async () => {
    setTesting(true);
    setProgress('Testing getAccurateLocation() - 5 samples...');
    
    try {
      const startTime = Date.now();
      
      const location = await GPSService.getAccurateLocation((gpsProgress) => {
        setProgress(`${gpsProgress.message} (${gpsProgress.accuracy?.toFixed(1)}m)`);
      });
      
      const duration = Date.now() - startTime;

      const result: TestResult = {
        method: 'getAccurateLocation() [RECOMMENDED]',
        location,
        duration,
        timestamp: new Date()
      };

      setResults(prev => [...prev, result]);
      setProgress(`✅ Done in ${duration}ms`);
    } catch (error) {
      setProgress(`❌ Error: ${(error as Error).message}`);
    } finally {
      setTesting(false);
    }
  };

  const clearResults = () => {
    setResults([]);
    setProgress('');
  };

  const getAccuracyColor = (accuracy?: number) => {
    if (!accuracy) return 'gray';
    if (accuracy < 20) return '#00c851'; // Excellent
    if (accuracy < 50) return '#ffbb33'; // Good
    if (accuracy < 100) return '#ff8800'; // Fair
    return '#ff4444'; // Poor
  };

  const getAccuracyLabel = (accuracy?: number) => {
    if (!accuracy) return 'Unknown';
    if (accuracy < 20) return 'Excellent ✅✅✅';
    if (accuracy < 50) return 'Good ✅✅';
    if (accuracy < 100) return 'Fair ⚠️';
    return 'Poor ❌';
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>🧪 GPS Accuracy Test</h2>
      <p>So sánh độ chính xác giữa 2 phương thức lấy GPS</p>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={testSingleSample}
          disabled={testing}
          style={{
            padding: '12px 20px',
            backgroundColor: '#ff8800',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: testing ? 'not-allowed' : 'pointer',
            opacity: testing ? 0.5 : 1
          }}
        >
          📍 Test Single Sample (1x)
        </button>

        <button
          onClick={testMultipleSamples}
          disabled={testing}
          style={{
            padding: '12px 20px',
            backgroundColor: '#00c851',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: testing ? 'not-allowed' : 'pointer',
            opacity: testing ? 0.5 : 1
          }}
        >
          🎯 Test Multiple Samples (5x)
        </button>

        <button
          onClick={clearResults}
          disabled={testing || results.length === 0}
          style={{
            padding: '12px 20px',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: (testing || results.length === 0) ? 'not-allowed' : 'pointer',
            opacity: (testing || results.length === 0) ? 0.5 : 1
          }}
        >
          🗑️ Clear
        </button>
      </div>

      {progress && (
        <div style={{
          padding: '15px',
          backgroundColor: '#f0f0f0',
          borderRadius: '5px',
          marginBottom: '20px',
          fontFamily: 'monospace'
        }}>
          {progress}
        </div>
      )}

      {results.length > 0 && (
        <div>
          <h3>📊 Test Results ({results.length})</h3>
          {results.map((result, index) => (
            <div
              key={index}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '15px',
                backgroundColor: result.method.includes('RECOMMENDED') ? '#e8f5e9' : '#fff3e0'
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                marginBottom: '10px'
              }}>
                <strong>{result.method}</strong>
                <span style={{ color: '#666', fontSize: '0.9em' }}>
                  {result.timestamp.toLocaleTimeString()}
                </span>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                fontSize: '0.9em'
              }}>
                <div>
                  <strong>Latitude:</strong> {result.location.latitude.toFixed(6)}
                </div>
                <div>
                  <strong>Longitude:</strong> {result.location.longitude.toFixed(6)}
                </div>
                <div>
                  <strong>Duration:</strong> {result.duration}ms
                </div>
                <div>
                  <strong>Accuracy:</strong> {' '}
                  <span style={{ 
                    color: getAccuracyColor(result.location.accuracy),
                    fontWeight: 'bold'
                  }}>
                    {result.location.accuracy?.toFixed(1) || 'N/A'}m
                  </span>
                  {' - '}
                  <span style={{ fontSize: '0.9em' }}>
                    {getAccuracyLabel(result.location.accuracy)}
                  </span>
                </div>
              </div>

              {result.location.accuracy && result.location.accuracy > 100 && (
                <div style={{
                  marginTop: '10px',
                  padding: '10px',
                  backgroundColor: '#ffebee',
                  borderLeft: '3px solid #f44336',
                  borderRadius: '3px',
                  fontSize: '0.85em'
                }}>
                  ⚠️ Độ chính xác thấp! Nên thử lại hoặc hướng dẫn user ra ngoài trời.
                </div>
              )}
            </div>
          ))}

          {results.length >= 2 && (
            <div style={{
              padding: '15px',
              backgroundColor: '#e3f2fd',
              borderRadius: '8px',
              marginTop: '20px'
            }}>
              <strong>💡 Comparison Summary:</strong>
              <ul style={{ marginTop: '10px' }}>
                <li>
                  Single sample: Nhanh nhưng độ chính xác thấp và không ổn định
                </li>
                <li>
                  Multiple samples: Chậm hơn nhưng độ chính xác cao hơn đáng kể
                </li>
                <li>
                  <strong>Khuyến nghị:</strong> Luôn dùng Multiple samples (getAccurateLocation) cho production!
                </li>
              </ul>
            </div>
          )}
        </div>
      )}

      <div style={{
        marginTop: '30px',
        padding: '15px',
        backgroundColor: '#f5f5f5',
        borderRadius: '5px',
        fontSize: '0.9em'
      }}>
        <strong>ℹ️ Tips:</strong>
        <ul>
          <li>Chạy test ở nhiều vị trí khác nhau (trong nhà, ngoài trời)</li>
          <li>So sánh accuracy giữa 2 phương thức</li>
          <li>Trên mobile, GPS thường không chính xác hơn desktop</li>
          <li>Multiple samples giúp lọc bỏ các điểm GPS lỗi (outliers)</li>
        </ul>
      </div>
    </div>
  );
};

export default GPSAccuracyTest;
