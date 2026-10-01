import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Photo from "./pages/EventPhotos";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/photos" element={<Photo />} />
        <Route path="/*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}