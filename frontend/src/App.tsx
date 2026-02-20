import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import ChatPage from "./pages/ChatPage";
import QuranPage from "./pages/QuranPage";
import { useAuthStore } from "./store/authStore";

function App() {
  const token = useAuthStore((s) => s.token);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/chat"
          element={token ? <ChatPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/quran"
          element={token ? <QuranPage /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to={token ? "/chat" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
