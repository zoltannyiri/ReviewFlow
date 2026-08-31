import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import ReviewPage from './pages/ReviewPage';
import DeveloperCommentsPage from './pages/DeveloperCommentsPage.jsx';

const TestPage = () => {
  return (
    <main style={{ padding: '120px' }}>
      <section>
        <h1 data-review-id="hero-title">
          Modern weboldal vállalkozásoknak
        </h1>

        <p>
          Ez egy ReviewFlow tesztoldal.
        </p>

        <button data-review-id="hero-cta">
          Ajánlatot kérek
        </button>
      </section>

      <section style={{ marginTop: '80px' }}>
        <h2>Szolgáltatásaink</h2>

        <p>
          Weboldal fejlesztés, karbantartás és egyedi rendszerek.
        </p>
      </section>
    </main>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/developer" replace />} />
        <Route path="/developer" element={<DeveloperCommentsPage />} />
        <Route
          path="/r/:token"
          element={<ReviewPage />}
        />

        <Route
          path="/test"
          element={<TestPage />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
