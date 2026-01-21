import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";

import Layout from "./components/Layout";

import Home from "./pages/Home";
import Categories from "./pages/Categories";
import CategoryPage from "./pages/CategoryPage";
import QuizPage from "./pages/QuizPage";
import FlashcardsPage from "./pages/FlashcardsPage";
import Translator from "./pages/Translator";


function App() {
    const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
    }, [theme]);

    const toggleTheme = () => setTheme(t => (t === "dark" ? "light" : "dark"));

    return (
        <Router>
            <Routes>
                {/* Layout wraps EVERYTHING */}
                <Route element={<Layout theme={theme} toggleTheme={toggleTheme} />}>
                    <Route path="/" element={<Home theme={theme} toggleTheme={toggleTheme} />} />
                    <Route path="/categories" element={<Categories />} />
                    <Route path="/category/:categorySlug" element={<CategoryPage />} />

                    {/* separate pages */}
                    <Route path="/quiz" element={<QuizPage />} />
                    <Route path="/flashcards" element={<FlashcardsPage />} />
                    <Route path="/translator" element={<Translator />} />
                </Route>
            </Routes>
        </Router>
    );
}

export default App;
