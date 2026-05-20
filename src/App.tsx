import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import TextSharing from './pages/TextSharing';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/text-sharing" element={<TextSharing />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
