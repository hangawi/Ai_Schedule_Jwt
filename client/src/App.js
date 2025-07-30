import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SchedulingSystem from './SchedulingSystem';
import { AuthScreen } from './AuthScreen';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null); // 사용자 정보 상태 추가

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const fetchUser = async () => {
        try {
          const response = await fetch('/api/auth', { // Schedulekyungmin의 verify 엔드포인트 사용
            headers: {
              'x-auth-token': token,
            },
          });

          if (response.ok) {
            const userData = await response.json();
            setIsLoggedIn(true);
            setUser(userData);
          } else {
            // 토큰이 유효하지 않거나 만료된 경우
            localStorage.removeItem('token');
            setIsLoggedIn(false);
            setUser(null);
          }
        } catch (error) {
          console.error('Error fetching user data in App.js:', error);
          localStorage.removeItem('token');
          setIsLoggedIn(false);
          setUser(null);
        }
      };
      fetchUser();
    }
  }, []);

  const handleLoginSuccess = (userData) => { // userData를 인자로 받도록 수정
    setIsLoggedIn(true);
    setUser(userData);
  };

  const handleLogout = () => { // 로그아웃 함수 추가
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setUser(null);
    // 라우터가 /auth로 리다이렉션하므로 window.location.href는 필요 없음
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/auth"
          element={isLoggedIn ? <Navigate to="/" /> : <AuthScreen onLoginSuccess={handleLoginSuccess} />}
        />
        <Route
          path="/"
          element={isLoggedIn ? <SchedulingSystem isLoggedIn={isLoggedIn} user={user} handleLogout={handleLogout} /> : <Navigate to="/auth" />}
        />
      </Routes>
    </Router>
  );
}

export default App;