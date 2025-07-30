import React, { useState, useEffect, useCallback } from 'react';
import {
   ChevronDown,
   ChevronUp,
   Calendar,
   Clock,
   Users,
   UserPlus,
   AlertCircle,
   Check,
   Star,
   LogOut,
   X,
   ChevronLeft,
   ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MyCalendar from './Calendar'; // Google Calendar 컴포넌트
import { LoginModal, RegisterModal } from './AuthScreen'; // AuthScreen에서 모달 임포트
import AddEventModal from './AddEventModal'; // AddEventModal 임포트
import EventDetailsModal from './EventDetailsModal';
import EditEventModal from './EditEventModal';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

// Helper function to format event dates for the client's local timezone
const formatEventForClient = (event, color) => {
   if (!event || !event.startTime) {
      return { ...event, date: '', time: '' };
   }
   const localStartTime = new Date(event.startTime);
   const year = localStartTime.getFullYear();
   const month = String(localStartTime.getMonth() + 1).padStart(2, '0');
   const day = String(localStartTime.getDate()).padStart(2, '0');
   const hours = String(localStartTime.getHours()).padStart(2, '0');
   const minutes = String(localStartTime.getMinutes()).padStart(2, '0');

   return {
      id: event.id || event._id,
      title: event.title,
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`,
      participants: event.participants ? event.participants.length : 0,
      priority: event.priority || 3,
      color: color || event.color || 'blue',
   };
};

// 메인 컴포넌트
const SchedulingSystem = ({ isLoggedIn, user, handleLogout }) => {
   // props로 받도록 수정
   // 상태 변수들
   const [activeTab, setActiveTab] = useState('dashboard');
   const [showCreateModal, setShowCreateModal] = useState(false);
   const [showTimeSelectionModal, setShowTimeSelectionModal] = useState(false);
   const [showLoginModal, setShowLoginModal] = useState(false); // AuthScreen으로 이동했으므로 초기값 false
   const [showRegisterModal, setShowRegisterModal] = useState(false); // AuthScreen으로 이동했으므로 초기값 false
   const [globalEvents, setGlobalEvents] = useState([]);
   const [eventsLoaded, setEventsLoaded] = useState(false);
   const [selectedProposal, setSelectedProposal] = useState(null);
   const [globalProposals, setGlobalProposals] = useState([]);
   const [showEditModal, setShowEditModal] = useState(false);
   const [editingEvent, setEditingEvent] = useState(null);

   const navigate = useNavigate();

   const handleManualLogout = () => {
      handleLogout();
      alert('로그아웃 되었습니다.');
   };

   const handleSelectProposalForTime = useCallback(proposal => {
      setSelectedProposal(proposal);
      setShowTimeSelectionModal(true);
   }, []);

   const fetchEvents = useCallback(async () => {
      if (!isLoggedIn) return;

      try {
         const token = localStorage.getItem('token');
         console.log('fetchEvents - 토큰 확인:', token ? '토큰 존재' : '토큰 없음');

         if (!token) {
            console.error('fetchEvents - 토큰이 없습니다.');
            handleLogout();
            return;
         }

         const response = await fetch(`${API_BASE_URL}/api/events`, {
            headers: {
               'x-auth-token': token,
            },
         });

         console.log('fetchEvents - 서버 응답 상태:', response.status);

         if (!response.ok) {
            const errorData = await response.json();
            console.error('fetchEvents - 서버 에러:', errorData);

            if (response.status === 401) {
               console.log('토큰 만료 또는 무효 - 자동 로그아웃');
               handleLogout();
               return;
            }

            throw new Error('Failed to fetch events');
         }

         const data = await response.json();
         console.log('fetchEvents - 받은 데이터:', data);

         const formattedEvents = data.events.map(event => formatEventForClient(event));

         setGlobalEvents(formattedEvents);
         setEventsLoaded(true);
      } catch (error) {
         console.error('Error fetching events:', error.message);
         setEventsLoaded(true);
      }
   }, [isLoggedIn, handleLogout]);

   const handleAddGlobalEvent = useCallback(async eventData => {
      console.log('=== handleAddGlobalEvent 시작 ===');
      console.log('전달받은 이벤트 데이터:', eventData);

      try {
         const token = localStorage.getItem('token');

         console.log('로컬스토리지에서 토큰 확인:');
         console.log('- 토큰 존재:', token ? '✅' : '❌');
         if (token) {
            console.log('- 토큰 길이:', token.length);
            console.log('- 토큰 시작 부분:', token.substring(0, 50) + '...');

            try {
               const tokenParts = token.split('.');
               console.log('- 토큰 구조 확인:', tokenParts.length === 3 ? '✅ 올바른 JWT 형식' : '❌ 잘못된 형식');
               if (tokenParts.length === 3) {
                  const payload = JSON.parse(atob(tokenParts[1]));
                  console.log('- 토큰 페이로드:', payload);
                  console.log('- 만료 시간:', payload.exp ? new Date(payload.exp * 1000) : '없음');
                  console.log('- 현재 시간:', new Date());
               }
            } catch (parseError) {
               console.error('- 토큰 파싱 에러:', parseError);
            }
         }

         if (!token) {
            console.log('❌ 토큰 없음 - 로그인 모달 표시');
            alert('로그인이 필요합니다.');
            setShowLoginModal(true);
            return;
         }

         const payload = {
            title: eventData.title,
            date: eventData.date,
            time: eventData.time,
            color: eventData.color,
            description: eventData.description || '',
            priority: eventData.priority || 3,
            category: eventData.category || 'general',
            isFlexible: false,
            participants: [],
            externalParticipants: [],
         };

         console.log('서버로 전송할 페이로드:', JSON.stringify(payload, null, 2));

         const requestHeaders = {
            'Content-Type': 'application/json',
            'x-auth-token': token,
         };

         console.log('요청 헤더:', requestHeaders);
         console.log('요청 URL:', `${API_BASE_URL}/api/events`);

         const response = await fetch(`${API_BASE_URL}/api/events`, {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify(payload),
         });

         console.log('서버 응답:');
         console.log('- 상태 코드:', response.status);
         console.log('- 상태 텍스트:', response.statusText);
         console.log('- 응답 헤더:', Object.fromEntries(response.headers.entries()));

         if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ 서버 에러 응답:', errorData);
            throw new Error(errorData.msg || 'Failed to add event');
         }

         const savedEvent = await response.json();
         console.log('✅ 서버에서 받은 성공 응답:', savedEvent);

         const newEvent = formatEventForClient(savedEvent, eventData.color);

         console.log('로컬 상태로 변환된 이벤트:', newEvent);
         setGlobalEvents(prevEvents => [...prevEvents, newEvent]);
         console.log('=== handleAddGlobalEvent 성공 완료 ===');
         return newEvent;
      } catch (error) {
         console.error('=== handleAddGlobalEvent 에러 ===');
         console.error('에러 타입:', error.constructor.name);
         console.error('에러 메시지:', error.message);
         console.error('전체 에러:', error);
         throw error;
      }
   }, []);

   const handleDeleteEvent = useCallback(async eventId => {
      if (!window.confirm('정말로 이 일정을 삭제하시겠습니까?')) {
         return;
      }

      try {
         const token = localStorage.getItem('token');
         if (!token) {
            alert('로그인이 필요합니다.');
            setShowLoginModal(true);
            return;
         }

         const response = await fetch(`${API_BASE_URL}/api/events/${eventId}`, {
            method: 'DELETE',
            headers: {
               'x-auth-token': token,
            },
         });

         if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'Failed to delete event');
         }

         setGlobalEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
         alert('일정이 성공적으로 삭제되었습니다!');
      } catch (error) {
         console.error('Error deleting event:', error);
         alert(`일정 삭제 실패: ${error.message}`);
      }
   }, []);

   const handleEditEvent = useCallback(event => {
      setEditingEvent(event);
      setShowEditModal(true);
   }, []);

   const handleUpdateEvent = useCallback(async (eventData, eventId) => {
      try {
         const token = localStorage.getItem('token');
         if (!token) {
            alert('로그인이 필요합니다.');
            setShowLoginModal(true);
            return;
         }

         const payload = {
            title: eventData.title,
            date: eventData.date,
            time: eventData.time,
            color: eventData.color,
         };

         const response = await fetch(`${API_BASE_URL}/api/events/${eventId}`, {
            method: 'PUT',
            headers: {
               'Content-Type': 'application/json',
               'x-auth-token': token,
            },
            body: JSON.stringify(payload),
         });

         if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'Failed to update event');
         }

         const updatedEventFromServer = await response.json();
         const updatedEventForClient = formatEventForClient(updatedEventFromServer);

         setGlobalEvents(prevEvents =>
            prevEvents.map(event => (event.id === updatedEventForClient.id ? updatedEventForClient : event)),
         );
         setShowEditModal(false);
         setEditingEvent(null);
         alert('일정이 성공적으로 수정되었습니다!');
      } catch (error) {
         console.error('Error updating event:', error);
         alert(`일정 수정 실패: ${error.message}`);
      }
   }, []);

   // 주기적으로 토큰 상태 확인 (30분마다)
   useEffect(() => {
      if (!isLoggedIn) return;

      const checkTokenStatus = async () => {
         const token = localStorage.getItem('token');
         if (!token) {
            handleLogout();
            return;
         }

         try {
            const response = await fetch(`${API_BASE_URL}/api/auth`, {
               method: 'GET',
               headers: {
                  'x-auth-token': token,
               },
            });

            if (!response.ok) {
               console.log('토큰 상태 확인 실패 - 자동 로그아웃');
               handleLogout();
            }
         } catch (error) {
            console.error('토큰 상태 확인 에러:', error);
            handleLogout();
         }
      };

      const interval = setInterval(checkTokenStatus, 30 * 60 * 1000);
      return () => clearInterval(interval);
   }, [isLoggedIn, handleLogout]);

   // 로그인 상태 변경 시 이벤트 가져오기
   useEffect(() => {
      if (isLoggedIn && !eventsLoaded) {
         fetchEvents();
      }
   }, [isLoggedIn, eventsLoaded, fetchEvents]);

   // Filter events for today to pass to the dashboard
   const todayString = new Date().toISOString().split('T')[0];
   const todayEvents = globalEvents.filter(event => event.date === todayString);
   const upcomingEvents = globalEvents.filter(event => event.date > todayString);

   return (
      <div className="flex flex-col h-screen bg-gray-50">
         {/* 헤더 */}
         <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
               <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold mr-3">
                     MA
                  </div>
                  <h1 className="text-xl font-bold text-gray-800">MeetAgent</h1>
                  {user && user.google && user.google.accessToken ? (
                     <div className="w-3 h-3 bg-green-500 rounded-full ml-2" title="Google 계정 연동됨"></div>
                  ) : (
                     <div className="w-3 h-3 bg-red-500 rounded-full ml-2" title="Google 계정 연동 안됨"></div>
                  )}
               </div>
               <div className="flex items-center">
                  <button className="text-gray-600 mr-4 hover:text-gray-800" onClick={() => setActiveTab('events')}>
                     <Calendar size={20} />
                  </button>

                  {/* 디버그 테스트 버튼 (개발용) */}
                  {isLoggedIn && (
                     <button
                        onClick={async () => {
                           const token = localStorage.getItem('token');
                           console.log('=== 토큰 테스트 ===');
                           console.log('토큰:', token ? `${token.substring(0, 50)}...` : '없음');

                           try {
                              const response = await fetch('http://localhost:5000/api/auth/test'); // 포트 5000으로 변경
                              const result = await response.json();
                              console.log('JWT 테스트 결과:', result);

                              const verifyResponse = await fetch('http://localhost:5000/api/auth/verify', {
                                 // 포트 5000으로 변경
                                 headers: { 'x-auth-token': token },
                              });
                              const verifyResult = await verifyResponse.json();
                              console.log('토큰 검증 결과:', verifyResult);

                              alert('테스트 완료 - 콘솔 확인');
                           } catch (error) {
                              console.error('테스트 에러:', error);
                              alert('테스트 실패 - 콘솔 확인');
                           }
                        }}
                        className="text-gray-600 mr-4 hover:text-gray-800 text-sm">
                        🔧
                     </button>
                  )}

                  {isLoggedIn ? (
                     <button
                        className="w-auto min-w-[40px] h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center cursor-pointer px-3 mr-2"
                        onClick={() => alert('프로필 페이지로 이동 (구현 예정)')}>
                                                   {user && user.firstName ? user.firstName : '프로필'}
                     </button>
                  ) : null}
                  <button
                     className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center cursor-pointer"
                     onClick={handleManualLogout}>
                     <LogOut size={16} />
                  </button>
               </div>
            </div>
         </header>

         {/* 메인 콘텐츠 */}
         <div className="flex flex-1 overflow-hidden">
            {/* 사이드바 */}
            <nav className="w-64 bg-white border-r border-gray-200 p-6">
               <div className="mb-6">
                  <button
                     onClick={() => setShowCreateModal(true)}
                     className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center justify-center">
                     <span>+ 새 일정 조율</span>
                  </button>
               </div>

               <div className="space-y-1">
                  <NavItem
                     icon={<Calendar size={18} />}
                     label="대시보드"
                     active={activeTab === 'dashboard'}
                     onClick={() => setActiveTab('dashboard')}
                  />
                  <NavItem
                     icon={<Clock size={18} />}
                     label="나의 일정"
                     active={activeTab === 'events'}
                     onClick={() => setActiveTab('events')}
                  />
                  <NavItem
                     icon={<Calendar size={18} />} // Google 캘린더 아이콘
                     label="Google 캘린더"
                     active={activeTab === 'googleCalendar'}
                     onClick={() => setActiveTab('googleCalendar')}
                  />
                  <NavItem
                     icon={<Users size={18} />}
                     label="조율 내역"
                     active={activeTab === 'proposals'}
                     onClick={() => setActiveTab('proposals')}
                     badge="3"
                  />
                  <NavItem
                     icon={<UserPlus size={18} />}
                     label="내 AI 비서"
                     active={activeTab === 'agent'}
                     onClick={() => setActiveTab('agent')}
                  />
               </div>
            </nav>

            {/* 콘텐츠 영역 */}
            <main className="flex-1 overflow-y-auto p-6">
               {activeTab === 'dashboard' && (
                  <DashboardTab
                     onSelectTime={handleSelectProposalForTime}
                     proposals={globalProposals}
                     todayEvents={todayEvents}
                     upcomingEvents={upcomingEvents}
                  />
               )}
               {activeTab === 'proposals' && (
                  <ProposalsTab onSelectTime={handleSelectProposalForTime} proposals={globalProposals} />
               )}
               {activeTab === 'events' && (
                  <EventsTab
                     events={globalEvents}
                     onAddEvent={handleAddGlobalEvent}
                     isLoggedIn={isLoggedIn}
                     onDeleteEvent={handleDeleteEvent}
                     onEditEvent={handleEditEvent}
                  />
               )}
               {activeTab === 'googleCalendar' && <MyCalendar />}
               {activeTab === 'agent' && <AgentTab />}
            </main>
         </div>

         {/* 모달 */}
         {showCreateModal && (
            <CreateProposalModal
               onClose={() => setShowCreateModal(false)}
               onProposalCreated={newProposal => {
                  const processedProposal = { ...newProposal };
                  if (!processedProposal.id && processedProposal._id) {
                     processedProposal.id = processedProposal._id;
                  }
                  setGlobalProposals(prev => [...prev, processedProposal]);
               }}
            />
         )}

         {showTimeSelectionModal && selectedProposal && (
            <TimeSelectionModal
               onClose={() => {
                  setShowTimeSelectionModal(false);
                  setSelectedProposal(null);
               }}
               proposal={selectedProposal}
               onFinalize={newEvent => {
                  console.log('SchedulingSystem - onFinalize 콜백에서 받은 새 이벤트:', newEvent);
                  setGlobalEvents(prevEvents => [
                     ...prevEvents,
                     {
                        id: newEvent._id,
                        title: newEvent.title,
                        date: newEvent.startTime.split('T')[0],
                        time: newEvent.startTime.split('T')[1].substring(0, 5),
                        participants: newEvent.participants ? newEvent.participants.length : 0,
                        priority: newEvent.priority,
                        color: 'green', // Or any color for finalized events
                     },
                  ]);
                  setShowTimeSelectionModal(false);
                  setSelectedProposal(null);
               }}
            />
         )}

         {showEditModal && editingEvent && (
            <EventFormModal
               onClose={() => {
                  setShowEditModal(false);
                  setEditingEvent(null);
               }}
               onSubmitEvent={handleUpdateEvent}
               event={editingEvent}
            />
         )}
      </div>
   );
};

// 네비게이션 아이템 컴포넌트
const NavItem = ({ icon, label, active, onClick, badge }) => (
   <button
      onClick={onClick}
      className={`w-full flex items-center px-3 py-2 rounded-lg ${
         active ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
      }`}>
      <span className="mr-3">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {badge && <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{badge}</span>}
   </button>
);

// 일정 추가/수정 모달
const EventFormModal = ({ onClose, onSubmitEvent, event }) => {
   const [title, setTitle] = useState(event ? event.title : '');
   const [date, setDate] = useState(event ? event.date : '');
   const [time, setTime] = useState(event ? event.time : '');
   const [color, setColor] = useState(event ? event.color : 'blue');

   const isEditMode = !!event;

   const handleSubmit = async () => {
      if (title && date && time) {
         const eventData = {
            title,
            date,
            time,
            color,
         };

         await onSubmitEvent(eventData, event ? event.id : null);
      } else {
         alert('모든 필드를 채워주세요.');
      }
   };

   return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
         <div className="bg-white w-full max-w-md rounded-lg shadow-xl p-6">
            <div className="flex justify-between items-center mb-4">
               <h2 className="text-xl font-bold text-gray-800">{isEditMode ? '일정 수정' : '새 일정 추가'}</h2>
               <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                  <X size={20} />
               </button>
            </div>

            <div className="space-y-4">
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                  <input
                     type="text"
                     className="w-full border border-gray-300 rounded-md px-3 py-2"
                     value={title}
                     onChange={e => setTitle(e.target.value)}
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
                  <input
                     type="date"
                     className="w-full border border-gray-300 rounded-md px-3 py-2"
                     value={date}
                     onChange={e => setDate(e.target.value)}
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">시간</label>
                  <input
                     type="time"
                     className="w-full border border-gray-300 rounded-md px-3 py-2"
                     value={time}
                     onChange={e => setTime(e.target.value)}
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">색상</label>
                  <select
                     className="w-full border border-gray-300 rounded-md px-3 py-2"
                     value={color}
                     onChange={e => setColor(e.target.value)}>
                     <option value="blue">파랑</option>
                     <option value="purple">보라</option>
                     <option value="green">초록</option>
                     <option value="red">빨강</option>
                  </select>
               </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
               <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                  취소
               </button>
               <button onClick={handleSubmit} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                  {isEditMode ? '수정' : '추가'}
               </button>
            </div>
         </div>
      </div>
   );
};

// 대시보드 탭
const DashboardTab = ({ onSelectTime, proposals, todayEvents, upcomingEvents }) => {
   return (
      <div>
         <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">대시보드</h2>
            <div className="flex items-center space-x-3">
               <select className="border border-gray-300 rounded-md px-3 py-1.5 text-sm">
                  <option>이번 주</option>
                  <option>다음 주</option>
                  <option>이번 달</option>
               </select>
            </div>
         </div>

         <div className="grid grid-cols-3 gap-6 mb-8">
            <StatCard
               title="진행 중인 조율"
               value={proposals.filter(p => p.status !== 'finalized').length}
               change="+1"
               changeType="increase"
            />
            <StatCard title="오늘 일정" value={todayEvents.length} change="0" changeType="neutral" />
            <StatCard title="다가오는 일정" value={upcomingEvents.length} change="+2" changeType="increase" />
         </div>

         <div className="grid grid-cols-2 gap-6">
            <div className="space-y-6">
               <div>
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="text-lg font-semibold text-gray-800">진행 중인 조율</h3>
                     <button className="text-blue-500 text-sm hover:underline">모두 보기</button>
                  </div>
                  <div className="space-y-4">
                     {proposals.map(proposal => (
                        <ProposalCard key={proposal.id || proposal._id} proposal={proposal} onClick={onSelectTime} />
                     ))}
                  </div>
               </div>
               <div>
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="text-lg font-semibold text-gray-800">다가오는 일정</h3>
                     <button className="text-blue-500 text-sm hover:underline">모두 보기</button>
                  </div>
                  <div className="space-y-4">
                     {upcomingEvents.map(event => (
                        <EventCard
                           key={event.id}
                           title={event.title}
                           time={`${event.date} ${event.time}`}
                           participants={event.participants}
                           priority={event.priority}
                        />
                     ))}
                  </div>
               </div>
            </div>

            <div>
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">오늘의 일정</h3>
                  <button className="text-blue-500 text-sm hover:underline">모두 보기</button>
               </div>
               <div className="space-y-4">
                  {todayEvents.map(event => (
                     <EventCard
                        key={event.id}
                        title={event.title}
                        time={`${event.time}`}
                        participants={event.participants}
                        priority={event.priority}
                     />
                  ))}
               </div>
            </div>
         </div>
      </div>
   );
};

// 통계 카드 컴포넌트
const StatCard = ({ title, value, change, changeType }) => {
   const colors = {
      increase: 'text-green-500',
      decrease: 'text-red-500',
      neutral: 'text-gray-500',
   };

   const icons = {
      increase: <ChevronUp size={14} />,
      decrease: <ChevronDown size={14} />,
      neutral: null,
   };

   return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
         <h3 className="text-sm font-medium text-gray-500">{title}</h3>
         <div className="mt-2 flex items-baseline">
            <p className="text-3xl font-semibold text-gray-800">{value}</p>
            {change && (
               <span className={`ml-2 flex items-center text-sm ${colors[changeType]}`}>
                  {icons[changeType]}
                  {change}
               </span>
            )}
         </div>
      </div>
   );
};

// 조율 요청 카드 컴포넌트
const ProposalCard = ({ proposal, onClick }) => {
   const statusInfo = {
      pending: {
         text: '대기 중',
         color: 'bg-yellow-100 text-yellow-800',
      },
      in_progress: {
         text: '조율 중',
         color: 'bg-blue-100 text-blue-800',
      },
      suggestions_ready: {
         text: '제안 준비됨',
         color: 'bg-purple-100 text-purple-800',
      },
      finalized: {
         text: '확정됨',
         color: 'bg-green-100 text-green-800',
      },
   };

   return (
      <div
         className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
         onClick={proposal.status === 'suggestions_ready' ? () => onClick(proposal) : undefined}>
         <div className="flex justify-between items-start">
            <h4 className="font-medium text-gray-800">{proposal.title}</h4>
            <span className={`px-2 py-1 rounded-full text-xs ${statusInfo[proposal.status].color}`}>
               {statusInfo[proposal.status].text}
            </span>
         </div>
         <div className="mt-2 text-sm text-gray-500">
            <p>진행자: {proposal.initiator}</p>
            <p>참가자: {proposal.participants}명</p>
         </div>
      </div>
   );
};

// 일정 카드 컴포넌트
const EventCard = ({ title, time, participants, priority }) => {
   const stars = [];
   for (let i = 0; i < 5; i++) {
      stars.push(
         <Star key={i} size={14} className={i < priority ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />,
      );
   }

   return (
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
         <div className="flex justify-between items-start">
            <h4 className="font-medium text-gray-800">{title}</h4>
            <div className="flex">{stars}</div>
         </div>
         <div className="mt-2 text-sm text-gray-500">
            <p>{time}</p>
            <p>참가자: {participants}명</p>
         </div>
      </div>
   );
};

// 조율 내역 탭
const ProposalsTab = ({ onSelectTime, proposals }) => {
   return (
      <div>
         <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">조율 내역</h2>
            <div className="flex items-center space-x-3">
               <select className="border border-gray-300 rounded-md px-3 py-1.5 text-sm">
                  <option>전체</option>
                  <option>진행 중</option>
                  <option>완료</option>
               </select>
            </div>
         </div>

         <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
               <thead className="bg-gray-50">
                  <tr>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        제목
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        진행자
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        참가자
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        상태
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        생성일
                     </th>
                  </tr>
               </thead>
               <tbody className="bg-white divide-y divide-gray-200">
                  {proposals.map(proposal => (
                     <ProposalRow key={proposal.id || proposal._id} proposal={proposal} onClick={onSelectTime} />
                  ))}
               </tbody>
            </table>
         </div>
      </div>
   );
};

// 조율 행 컴포넌트
const ProposalRow = ({ proposal, onClick }) => {
   const statusInfo = {
      pending: {
         text: '대기 중',
         color: 'bg-yellow-100 text-yellow-800',
      },
      in_progress: {
         text: '조율 중',
         color: 'bg-blue-100 text-blue-800',
      },
      suggestions_ready: {
         text: '제안 준비됨',
         color: 'bg-purple-100 text-purple-800',
      },
      finalized: {
         text: '확정됨',
         color: 'bg-green-100 text-green-800',
      },
   };

   return (
      <tr
         className="hover:bg-gray-50 cursor-pointer"
         onClick={proposal.status === 'suggestions_ready' ? () => onClick(proposal) : undefined}>
         <td className="px-6 py-4 whitespace-nowrap">
            <div className="text-sm font-medium text-gray-900">{proposal.title}</div>
         </td>
         <td className="px-6 py-4 whitespace-nowrap">
            <div className="text-sm text-gray-500">{proposal.initiator}</div>
         </td>
         <td className="px-6 py-4 whitespace-nowrap">
            <div className="text-sm text-gray-500">{proposal.participants.length}명</div>
         </td>
         <td className="px-6 py-4 whitespace-nowrap">
            <span
               className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  statusInfo[proposal.status].color
               }`}>
               {statusInfo[proposal.status].text}
            </span>
         </td>
         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {proposal.date || new Date(proposal.createdAt).toLocaleDateString('ko-KR')}
         </td>
      </tr>
   );
};

// 일정 탭 컴포넌트
const EventsTab = ({ events, onAddEvent, isLoggedIn, onDeleteEvent, onEditEvent }) => {
   const [showAddEventModal, setShowAddEventModal] = useState(false);
   const [currentMonth, setCurrentMonth] = useState(new Date());

   const goToPreviousMonth = () => {
      setCurrentMonth(prevMonth => {
         const newMonth = new Date(prevMonth);
         newMonth.setMonth(newMonth.getMonth() - 1);
         return newMonth;
      });
   };

   const goToNextMonth = () => {
      setCurrentMonth(prevMonth => {
         const newMonth = new Date(prevMonth);
         newMonth.setMonth(newMonth.getMonth() + 1);
         return newMonth;
      });
   };

   const handleAddEvent = async newEventData => {
      try {
         await onAddEvent(newEventData);
         setShowAddEventModal(false);
         alert('일정이 성공적으로 추가되었습니다!');
      } catch (error) {
         alert(`일정 추가 실패: ${error.message}`);
      }
   };

   // 캘린더 날짜 계산 로직
   const getDaysInMonth = (year, month) => {
      return new Date(year, month + 1, 0).getDate();
   };

   const getFirstDayOfMonth = (year, month) => {
      return new Date(year, month, 1).getDay();
   };

   const calendarDates = [];
   const year = currentMonth.getFullYear();
   const month = currentMonth.getMonth();
   const daysInMonth = getDaysInMonth(year, month);
   const firstDay = getFirstDayOfMonth(year, month);

   // 이전 달의 날짜 채우기
   const prevMonthDays = getDaysInMonth(year, month - 1);
   for (let i = firstDay - 1; i >= 0; i--) {
      calendarDates.push(new Date(year, month - 1, prevMonthDays - i));
   }

   // 현재 달의 날짜 채우기
   for (let i = 1; i <= daysInMonth; i++) {
      calendarDates.push(new Date(year, month, i));
   }

   // 다음 달의 날짜 채우기
   const remainingDays = 42 - calendarDates.length;
   for (let i = 1; i <= remainingDays; i++) {
      calendarDates.push(new Date(year, month + 1, i));
   }

   if (!isLoggedIn) {
      return (
         <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">로그인 후 일정을 확인할 수 있습니다.</p>
         </div>
      );
   }

   return (
      <div>
         <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">나의 일정</h2>
            <div className="flex items-center space-x-3">
               <button
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                  onClick={() => setCurrentMonth(new Date())}>
                  오늘
               </button>
               <button
                  className="bg-blue-500 text-white rounded-md px-3 py-1.5 text-sm"
                  onClick={() => setShowAddEventModal(true)}>
                  + 일정 추가
               </button>
            </div>
         </div>

         <div className="flex justify-between items-center mb-4">
            <button
               onClick={goToPreviousMonth}
               className="px-3 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">
               이전 달
            </button>
            <h3 className="text-xl font-semibold text-gray-800">
               {currentMonth.toLocaleString('ko-KR', { year: 'numeric', month: 'long' })}
            </h3>
            <button
               onClick={goToNextMonth}
               className="px-3 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">
               다음 달
            </button>
         </div>

         <div className="grid grid-cols-7 gap-4 mb-6">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
               <div key={idx} className="text-center font-medium text-gray-500">
                  {day}
               </div>
            ))}

            {calendarDates.map((date, idx) => {
               const isToday = date.toDateString() === new Date().toDateString();
               const isCurrentMonth = date.getMonth() === currentMonth.getMonth();

               const dayEvents = events.filter(event => {
                  const eventDate = new Date(event.date);
                  return eventDate.toDateString() === date.toDateString();
               });

               return (
                  <div
                     key={idx}
                     className={`h-36 p-1 border rounded-lg ${
                        isToday
                           ? 'bg-blue-50 border-blue-200'
                           : isCurrentMonth
                           ? 'bg-white border-gray-200'
                           : 'bg-gray-50 border-gray-100 text-gray-400'
                     }`}>
                     <div className="text-right text-sm mb-1">{date.getDate()}</div>
                     <div className="overflow-y-auto h-28">
                     {isCurrentMonth &&
                        dayEvents.map((event, eventIdx) => (
                           <div
                              key={`${event.id}-${eventIdx}`}
                              className={`text-xs ${
                                 event.color === 'blue'
                                    ? 'bg-blue-100 text-blue-800'
                                    : event.color === 'purple'
                                    ? 'bg-purple-100 text-purple-800'
                                    : event.color === 'green'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                              }
                                      rounded px-1 py-0.5 mb-1 truncate flex justify-between items-center`}>
                              <span>
                                 {event.time} {event.title}
                              </span>
                              <div className="flex items-center">
                                 <button
                                    onClick={e => {
                                       e.stopPropagation(); // Prevent calendar date click
                                       onEditEvent(event);
                                    }}
                                    className="text-gray-400 hover:text-blue-600 mr-1">
                                    ✏️
                                 </button>
                                 <button
                                    onClick={e => {
                                       e.stopPropagation(); // Prevent calendar date click
                                       onDeleteEvent(event.id);
                                    }}
                                    className="text-gray-400 hover:text-red-600">
                                    <X size={12} />
                                 </button>
                              </div>
                           </div>
                        ))}
                        </div>
                  </div>
               );
            })}
         </div>

         {showAddEventModal && (
            <EventFormModal onClose={() => setShowAddEventModal(false)} onSubmitEvent={handleAddEvent} />
         )}
      </div>
   );
};

// AI 비서 설정 탭
const AgentTab = () => {
   const [autonomyLevel, setAutonomyLevel] = useState(3);

   return (
      <div>
         <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">내 AI 비서</h2>
            <button className="bg-blue-500 text-white rounded-md px-3 py-1.5 text-sm">변경사항 저장</button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
               <h3 className="text-lg font-semibold text-gray-800 mb-4">기본 설정</h3>

               <div className="space-y-4">
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">비서 이름</label>
                     <input
                        type="text"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="내 AI 비서"
                        defaultValue="큐브"
                     />
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">비서 성격</label>
                     <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                        <option>직관적</option>
                        <option>친근한</option>
                        <option>효율적</option>
                        <option>세심한</option>
                     </select>
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">자율성 수준</label>
                     <div className="flex items-center">
                        <span className="text-xs text-gray-500">승인 필요</span>
                        <input
                           type="range"
                           min="1"
                           max="5"
                           value={autonomyLevel}
                           onChange={e => setAutonomyLevel(parseInt(e.target.value))}
                           className="mx-2 flex-1"
                        />
                        <span className="text-xs text-gray-500">완전 자동</span>
                     </div>
                     <p className="mt-1 text-sm text-gray-500">
                        {autonomyLevel === 1 && '모든 결정에 사용자 승인이 필요합니다.'}
                        {autonomyLevel === 2 && '중요한 결정에만 사용자 승인이 필요합니다.'}
                        {autonomyLevel === 3 && '중간 수준의 자율성으로 작동합니다.'}
                        {autonomyLevel === 4 && '대부분의 결정을 자동으로 처리합니다.'}
                        {autonomyLevel === 5 && '모든 일정 조율을 자동으로 처리합니다.'}
                     </p>
                  </div>
               </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
               <h3 className="text-lg font-semibold text-gray-800 mb-4">알림 설정</h3>

               <div className="space-y-4">
                  <div className="flex items-center justify-between">
                     <span className="text-sm text-gray-700">이메일 알림</span>
                     <label className="flex items-center cursor-pointer">
                        <div className="relative">
                           <input type="checkbox" className="sr-only" defaultChecked />
                           <div className="w-10 h-5 bg-gray-200 rounded-full shadow-inner"></div>
                           <div className="dot absolute w-5 h-5 bg-blue-500 rounded-full shadow -left-1 -top-0 transition"></div>
                        </div>
                     </label>
                  </div>

                  <div className="flex items-center justify-between">
                     <span className="text-sm text-gray-700">푸시 알림</span>
                     <label className="flex items-center cursor-pointer">
                        <div className="relative">
                           <input type="checkbox" className="sr-only" defaultChecked />
                           <div className="w-10 h-5 bg-gray-200 rounded-full shadow-inner"></div>
                           <div className="dot absolute w-5 h-5 bg-blue-500 rounded-full shadow -left-1 -top-0 transition"></div>
                        </div>
                     </label>
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">알림 요약</label>
                     <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                        <option>즉시</option>
                        <option>일일 요약</option>
                        <option>주간 요약</option>
                     </select>
                  </div>
               </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 md:col-span-2">
               <h3 className="text-lg font-semibold text-gray-800 mb-4">시간 선호도 학습</h3>

               <div className="space-y-4">
                  <div>
                     <p className="text-sm text-gray-700 mb-2">
                        AI 비서는 시간이 지남에 따라 귀하의 선호도를 학습합니다.
                     </p>

                     <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">학습된 선호 패턴</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                           <li>• 월요일 오전에는 회의를 선호하지 않음</li>
                           <li>• 화/목요일 오후 2-4시 사이에 회의 선호</li>
                           <li>• 금요일 오후 4시 이후 회의 회피</li>
                        </ul>
                     </div>
                  </div>

                  <div className="flex items-center justify-between">
                     <span className="text-sm text-gray-700">학습 활성화</span>
                     <label className="flex items-center cursor-pointer">
                        <div className="relative">
                           <input type="checkbox" className="sr-only" defaultChecked />
                           <div className="w-10 h-5 bg-gray-200 rounded-full shadow-inner"></div>
                           <div className="dot absolute w-5 h-5 bg-blue-500 rounded-full shadow -left-1 -top-0 transition"></div>
                        </div>
                     </label>
                  </div>

                  <button className="text-blue-500 text-sm hover:underline">학습 데이터 초기화</button>
               </div>
            </div>
         </div>
      </div>
   );
};

// 일정 조율 생성 모달
const CreateProposalModal = ({ onClose, onProposalCreated }) => {
   const [title, setTitle] = useState('');
   const [description, setDescription] = useState('');
   const [duration, setDuration] = useState('60');
   const [preferredTimeRangesInput, setPreferredTimeRangesInput] = useState([
      { startDate: '', endDate: '', startTime: '', endTime: '' },
   ]);
   const [priority, setPriority] = useState('3');
   const [participants, setParticipants] = useState([]);
   const [externalParticipants, setExternalParticipants] = useState('');
   const [searchQuery, setSearchQuery] = useState('');
   const [searchResults, setSearchResults] = useState([]);

   const dummyUsers = [
      { id: '60d5ec49a4d2a13e4c8b4567', name: '김철수', email: 'kim@example.com' },
      { id: '60d5ec49a4d2a13e4c8b4568', name: '이영희', email: 'lee@example.com' },
      { id: '60d5ec49a4d2a13e4c8b4569', name: '박민수', email: 'park@example.com' },
   ];

   const handleSearchChange = e => {
      const query = e.target.value;
      setSearchQuery(query);
      if (query.length > 0) {
         const filteredUsers = dummyUsers.filter(user => user.name.includes(query) || user.email.includes(query));
         setSearchResults(filteredUsers);
      } else {
         setSearchResults([]);
      }
   };

   const handleAddParticipant = user => {
      if (!participants.some(p => p.id === user.id)) {
         setParticipants([...participants, user]);
         setSearchQuery('');
         setSearchResults([]);
      }
   };

   const handleRemoveParticipant = id => {
      setParticipants(participants.filter(p => p.id !== id));
   };

   const handleAddTimeRange = () => {
      setPreferredTimeRangesInput([
         ...preferredTimeRangesInput,
         { startDate: '', endDate: '', startTime: '', endTime: '' },
      ]);
   };

   const handleRemoveTimeRange = index => {
      const newRanges = [...preferredTimeRangesInput];
      newRanges.splice(index, 1);
      setPreferredTimeRangesInput(newRanges);
   };

   const handleTimeRangeChange = (index, field, value) => {
      const newRanges = [...preferredTimeRangesInput];
      newRanges[index][field] = value;
      setPreferredTimeRangesInput(newRanges);
   };

   const handleSubmit = async () => {
      console.log('handleSubmit called');

      const token = localStorage.getItem('token');
      if (!token) {
         alert('로그인이 필요합니다.');
         onClose();
         return;
      }

      const proposalData = {
         title,
         description,
         duration: parseInt(duration),
         preferredTimeRanges: preferredTimeRangesInput
            .map(range => {
               if (range.startDate && range.endDate && range.startTime && range.endTime) {
                  return {
                     start: new Date(`${range.startDate}T${range.startTime}:00`).toISOString(),
                     end: new Date(`${range.endDate}T${range.endTime}:00`).toISOString(),
                  };
               }
               return null;
            })
            .filter(range => range !== null),
         participants: participants.map(p => p.id),
         externalParticipants: externalParticipants
            .split(',')
            .map(email => ({ email: email.trim() }))
            .filter(p => p.email),
         priority: parseInt(priority),
      };

      console.log('전송할 데이터:', proposalData);

      try {
         const response = await fetch('http://localhost:5000/api/proposals', {
            // 포트 5000으로 변경
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
               'x-auth-token': token,
            },
            body: JSON.stringify(proposalData),
         });

         if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'Failed to create proposal');
         }

         const data = await response.json();
         console.log('Proposal created successfully:', data);
         alert('일정 조율 요청이 성공적으로 생성되었습니다!');
         onProposalCreated(data);
         onClose();
      } catch (error) {
         console.error('Error creating proposal:', error.message);
         alert(`일정 조율 요청 실패: ${error.message}`);
      }
   };

   return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
         <div className="bg-white w-full max-w-2xl rounded-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
               <h2 className="text-xl font-bold text-gray-800">새 일정 조율 요청</h2>
               <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                  <X size={20} />
               </button>
            </div>

            <div className="space-y-4">
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                  <input
                     type="text"
                     className="w-full border border-gray-300 rounded-md px-3 py-2"
                     placeholder="일정 제목"
                     value={title}
                     onChange={e => setTitle(e.target.value)}
                  />
               </div>

               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">설명 (선택)</label>
                  <textarea
                     className="w-full border border-gray-300 rounded-md px-3 py-2"
                     placeholder="일정에 대한 설명"
                     rows={3}
                     value={description}
                     onChange={e => setDescription(e.target.value)}
                  />
               </div>

               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">소요 시간</label>
                  <select
                     className="w-full border border-gray-300 rounded-md px-3 py-2"
                     value={duration}
                     onChange={e => setDuration(e.target.value)}>
                     <option value="15">15분</option>
                     <option value="30">30분</option>
                     <option value="60">1시간</option>
                     <option value="90">1시간 30분</option>
                     <option value="120">2시간</option>
                  </select>
               </div>

               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">선호 시간 범위</label>
                  {preferredTimeRangesInput.map((range, index) => (
                     <div key={index} className="flex items-center mb-2">
                        <div className="flex-1 mr-2">
                           <input
                              type="date"
                              className="w-full border border-gray-300 rounded-md px-3 py-2"
                              value={range.startDate}
                              onChange={e => handleTimeRangeChange(index, 'startDate', e.target.value)}
                           />
                        </div>
                        <div className="flex-1 mr-2">
                           <input
                              type="time"
                              className="w-full border border-gray-300 rounded-md px-3 py-2"
                              value={range.startTime}
                              onChange={e => handleTimeRangeChange(index, 'startTime', e.target.value)}
                           />
                        </div>
                        <span className="mx-1">~</span>
                        <div className="flex-1 ml-2">
                           <input
                              type="date"
                              className="w-full border border-gray-300 rounded-md px-3 py-2"
                              value={range.endDate}
                              onChange={e => handleTimeRangeChange(index, 'endDate', e.target.value)}
                           />
                        </div>
                        <div className="flex-1 ml-2">
                           <input
                              type="time"
                              className="w-full border border-gray-300 rounded-md px-3 py-2"
                              value={range.endTime}
                              onChange={e => handleTimeRangeChange(index, 'endTime', e.target.value)}
                           />
                        </div>
                        {preferredTimeRangesInput.length > 1 && (
                           <button
                              type="button"
                              onClick={() => handleRemoveTimeRange(index)}
                              className="ml-2 p-2 text-red-500 hover:text-red-700">
                              <X size={18} />
                           </button>
                        )}
                     </div>
                  ))}
                  <button type="button" onClick={handleAddTimeRange} className="text-blue-500 text-sm hover:underline">
                     + 시간 범위 추가
                  </button>
               </div>

               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">우선순위</label>
                  <select
                     className="w-full border border-gray-300 rounded-md px-3 py-2"
                     value={priority}
                     onChange={e => setPriority(e.target.value)}>
                     <option value="1">1 - 매우 낮음</option>
                     <option value="2">2 - 낮음</option>
                     <option value="3">3 - 보통</option>
                     <option value="4">4 - 높음</option>
                     <option value="5">5 - 매우 높음</option>
                  </select>
               </div>

               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">내부 참가자</label>
                  <div className="flex items-center">
                     <input
                        type="text"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="이름 또는 이메일로 검색"
                        value={searchQuery}
                        onChange={e => handleSearchChange(e)}
                     />
                     <button
                        className="ml-2 p-2 border border-gray-300 rounded-md"
                        onClick={() => handleAddParticipant({ id: 'dummyId' + Math.random(), name: searchQuery })}>
                        <UserPlus size={18} />
                     </button>
                  </div>
                  {searchResults.length > 0 && searchQuery && (
                     <div className="mt-2 border border-gray-200 rounded-md bg-white shadow-lg max-h-40 overflow-y-auto">
                        {searchResults.map(user => (
                           <div
                              key={user.id}
                              className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                              onClick={() => handleAddParticipant(user)}>
                              <span>
                                 {user.name} ({user.email})
                              </span>
                              <UserPlus size={16} className="text-blue-500" />
                           </div>
                        ))}
                     </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                     {participants.map(p => (
                        <ParticipantChip key={p.id} name={p.name} onRemove={() => handleRemoveParticipant(p.id)} />
                     ))}
                  </div>
               </div>

               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                     외부 참가자 (이메일, 쉼표로 구분)
                  </label>
                  <textarea
                     className="w-full border border-gray-300 rounded-md px-3 py-2"
                     placeholder="external1@example.com, external2@example.com"
                     rows={2}
                     value={externalParticipants}
                     onChange={e => setExternalParticipants(e.target.value)}
                  />
               </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
               <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                  취소
               </button>
               <button onClick={handleSubmit} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                  조율 요청 생성
               </button>
            </div>
         </div>
      </div>
   );
};

const TimeSelectionModal = ({ onClose, proposal, onFinalize }) => {
   const [selectedTimeIndex, setSelectedTimeIndex] = useState(null);

   const handleFinalize = async () => {
      if (selectedTimeIndex === null) {
         alert('시간을 선택해주세요.');
         return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
         alert('로그인이 필요합니다.');
         return;
      }

      const finalTime = proposal.suggestedTimes[selectedTimeIndex].startTime;

      try {
         const response = await fetch(`${API_BASE_URL}/api/proposals/${proposal._id}/finalize`, {
            // 포트 5000으로 변경
            method: 'PUT',
            headers: {
               'Content-Type': 'application/json',
               'x-auth-token': token,
            },
            body: JSON.stringify({ finalTime }),
         });

         if (!response.ok) {
            const errorData = await response.json();
            console.error('시간 확정 서버 에러:', errorData);
            throw new Error(errorData.msg || 'Failed to finalize time');
         }

         const newEvent = await response.json();
         console.log('TimeSelectionModal - 서버에서 받은 확정된 새 이벤트 (실제 이벤트 객체여야 함):', newEvent);
         onFinalize(newEvent);
         onClose();
      } catch (error) {
         console.error('Error finalizing time:', error);
         alert(`시간 확정에 실패했습니다: ${error.message}`);
      }
   };

   return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
         <div className="bg-white w-full max-w-md rounded-lg shadow-xl p-6">
            <div className="flex justify-between items-center mb-4">
               <h2 className="text-xl font-bold text-gray-800">일정 시간 확정</h2>
               <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                  <X size={20} />
               </button>
            </div>

            <p className="text-gray-600 mb-4">
               '<span className="font-semibold">{proposal.title}</span>' 일정에 대한 시간을 확정해주세요.
            </p>

            {proposal.suggestedTimes && proposal.suggestedTimes.length > 0 ? (
               <div className="space-y-3 mb-6">
                  {proposal.suggestedTimes.map((time, index) => (
                     <div
                        key={index}
                        className={`p-3 border rounded-md cursor-pointer ${
                           selectedTimeIndex === index ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
                        }`}
                        onClick={() => setSelectedTimeIndex(index)}>
                        <p className="font-medium text-gray-800">
                           {new Date(time.startTime).toLocaleString('ko-KR', { dateStyle: 'full', timeStyle: 'short' })}{' '}
                           -{new Date(time.endTime).toLocaleString('ko-KR', { timeStyle: 'short' })}
                        </p>
                        {time.score !== undefined && (
                           <div className="flex items-center mt-1">
                              <span
                                 className="text-sm font-semibold mr-2"
                                 style={{
                                    color: time.score >= 90 ? '#22C55E' : time.score >= 70 ? '#F59E0B' : '#EF4444',
                                 }}>
                                 {time.score}
                              </span>
                              <span className="text-xs text-gray-500">{time.description}</span>
                           </div>
                        )}
                     </div>
                  ))}
               </div>
            ) : (
               <p className="text-gray-500 mb-6">제안된 시간이 없습니다.</p>
            )}

            <div className="flex justify-end space-x-3">
               <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                  취소
               </button>
               <button
                  onClick={handleFinalize}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  disabled={proposal.suggestedTimes.length === 0 || selectedTimeIndex === null}>
                  시간 확정
               </button>
            </div>
         </div>
      </div>
   );
};

// 참가자 칩 컴포넌트
const ParticipantChip = ({ name, onRemove }) => (
   <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center">
      {name}
      <button onClick={onRemove} className="ml-1 text-blue-500 hover:text-blue-700">
         <X size={14} />
      </button>
   </div>
);

// CSS Override for Toggle Switch
const style = document.createElement('style');
style.textContent = `
  input:checked ~ .dot {
    transform: translateX(100%);
    background-color: #3b82f6;
  }
`;
document.head.appendChild(style);

export default SchedulingSystem;
