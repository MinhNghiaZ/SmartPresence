import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { GPSService } from '../../Services/GPSService/GpsService';

const UserDashBoard = () => {
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
        <div className="container vh-100 align-self-center d-flex flex-column justify-content-center align-items-center">
            <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleCheckIn}
                disabled={isLoading}
            >
                {isLoading ? (
                    <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Đang kiểm tra vị trí...
                    </>
                ) : (
                    'Check In'
                )}
            </button>
            
            {message && (
                <div className={`alert ${message.includes('✅') ? 'alert-success' : 'alert-danger'} mt-3`} role="alert">
                    {message}
                </div>
            )}
        </div>
    );
};

export default UserDashBoard;