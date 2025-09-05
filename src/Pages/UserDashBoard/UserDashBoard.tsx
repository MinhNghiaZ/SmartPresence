import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { GPSService } from '../../services/GPSService/GpsService';

interface UserDashBoardProps {
  onLogout: () => void;
}

const UserDashBoard: React.FC<UserDashBoardProps> = ({ onLogout }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleCheckIn = async () => {
        setIsLoading(true);
        setMessage('');

        try {
            // Lấy vị trí hiện tại
            const userLocation = await GPSService.getCurrentLocation();
            
            // Kiểm tra vị trí có trong khu vực cho phép không
            const locationCheck = GPSService.isLocationAllowed(userLocation);
            
            if (locationCheck.allowed) {
                setMessage('✅ Check in thành công! Bạn đang ở trong khu vực cho phép.');
                // TODO: Gửi dữ liệu check in lên server
                console.log('Check in successful at:', userLocation);
            } else {
                setMessage(`❌ Không thể check in! Bạn đang cách khu vực cho phép ${locationCheck.distance}m`);
                console.log('check in failed, you are at: ', userLocation);
            }
        } catch (error) {
            setMessage(`❌ ${error instanceof Error ? error.message : 'Có lỗi xảy ra'}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container-fluid vh-100 d-flex flex-column">
            {/* Header with Logout */}
            <div className="row bg-primary text-white p-3">
                <div className="col-md-6">
                    <h4>🏢 EIU SmartPresence Dashboard</h4>
                </div>
                <div className="col-md-6 text-end">
                    <button 
                        className="btn btn-outline-light"
                        onClick={onLogout}
                    >
                        Đăng xuất
                    </button>
                </div>
            </div>
            
            {/* Main Content */}
            <div className="flex-grow-1 d-flex flex-column justify-content-center align-items-center">
                <div className="text-center mb-4">
                    <h2>Chấm công điện tử</h2>
                    <p className="text-muted">Nhấn nút bên dưới để check in</p>
                </div>
                
                <button 
                    type="button" 
                    className="btn btn-primary btn-lg"
                    onClick={handleCheckIn}
                    disabled={isLoading}
                    style={{ minWidth: '200px' }}
                >
                    {isLoading ? (
                        <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Đang kiểm tra vị trí...
                        </>
                    ) : (
                        '📍 Check In'
                    )}
                </button>
                
                {message && (
                    <div className={`alert ${message.includes('✅') ? 'alert-success' : 'alert-danger'} mt-3`} role="alert" style={{ maxWidth: '500px' }}>
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserDashBoard;