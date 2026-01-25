import { Link, Outlet, useLocation } from "react-router-dom";
import PageHeader from "./PageHeader";

export default function Layout({ theme, toggleTheme }) {
    const location = useLocation();
    const isHome = location.pathname === "/";

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <>
            <header className="header-bar">
                <nav className="header-nav">
                    <Link to="/">Home</Link>
                    <Link to="/categories">Categories</Link>
                    <Link to="/flashcards">Flashcards</Link>
                    <Link to="/quiz">Quiz</Link>
                </nav>

                <div className="header-sections">

                    <button
                        className="iconBtn"
                        onClick={toggleTheme}
                        title="Toggle theme"
                    >
                        {theme === "dark" ? "☀️" : "🌙"}
                    </button>

                    <button
                        className="iconBtn"
                        onClick={scrollToTop}
                        title="Back to top"
                    >
                        ⬆️ Top
                    </button>
                </div>
            </header>

            <Outlet />
        </>
    );
}
